"""Online firma provisioning — tam otomatik.

Yeni firma = paylaşılan Fabrika Yönetim Sistemi koduyla (caymazbuild) AYRI bir süreç: kendi .env, data,
brand klasörü, kendi portu ve systemd kullanıcı servisi. Merkez bu dosyaları üretir ve servisi başlatır.
İlk master kullanıcı, tenant uygulamasının seed_admin()'i tarafından .env'den okunur (CAYMAZ_ADMIN_*).

Güvenlik/test: gerçek systemctl ve systemd unit yazımı VEILOX_PROVISION_EXEC=0 ile kapatılabilir
(birim testleri sunucu başlatmaz). Dizin kökleri ortam değişkenleriyle testte yönlendirilebilir.
"""
import hashlib
import os
import re
import secrets
import string
import subprocess
from pathlib import Path

from .passwd import make_hash  # noqa: F401  (merkez kaydı için PBKDF2 özet)

APP_DIR = Path(os.environ.get('VEILOX_TENANT_APP_DIR', '/home/mkaderoglu/caymazbuild'))
TENANTS_DIR = Path(os.environ.get('VEILOX_TENANTS_DIR', APP_DIR / 'tenants'))
SYSTEMD_DIR = Path(os.environ.get('VEILOX_SYSTEMD_DIR', Path.home() / '.config' / 'systemd' / 'user'))
PORT_BASE = int(os.environ.get('VEILOX_PORT_BASE', '8090'))
EXEC = os.environ.get('VEILOX_PROVISION_EXEC', '1') != '0'
# Unix domain socket: firma başına TCP port YERİNE soket (port açılmaz, ağda dinleyici yok, sınırsız firma).
# Soket ~/.cloudflared/sockets/ altında tutulur; bu klasör tünel konteynerine /cfhome/.cloudflared altında mount'ludur.
CF_HOME = Path(os.environ.get('VEILOX_CF_HOME', Path.home() / '.cloudflared'))
CF_HOME_CONTAINER = os.environ.get('VEILOX_CF_HOME_CONTAINER', '/cfhome/.cloudflared')
SOCK_DIR = CF_HOME / 'sockets'
USE_SOCKET = os.environ.get('VEILOX_USE_SOCKET', '1') != '0'

SLUG_RE = re.compile(r'[^a-z0-9-]+')


def slugify(name):
    s = SLUG_RE.sub('-', (name or '').strip().lower()).strip('-')
    return s or 'firma'


def gen_password(n=14):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(n))


def _existing_ports():
    ports = set()
    try:
        for unit in SYSTEMD_DIR.glob('caymaz*.service'):
            for line in unit.read_text(encoding='utf-8').splitlines():
                m = re.search(r'Environment=PORT=(\d+)', line)
                if m:
                    ports.add(int(m.group(1)))
    except OSError:
        pass
    return ports


def _port_free(p):
    """Portu gerçekten kimse dinlemiyor mu? (Paylaşımlı makinede başka kullanıcıların portları da hesaba katılır.)"""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(('0.0.0.0', p))
        return True
    except OSError:
        return False
    finally:
        s.close()


def free_port(conn):
    used = _existing_ports()
    used.update(p for (p,) in conn.execute('SELECT port FROM companies WHERE port IS NOT NULL'))
    used.update({8080, 8081, 8082})   # gokkubbe, turkbey, veilox
    p = PORT_BASE
    while p < PORT_BASE + 500:
        if p not in used and _port_free(p):   # hem kayıtlarda yok hem OS'ta boş
            return p
        p += 1
    raise RuntimeError('Boş port bulunamadı')


def _env_text(admin_user, admin_pass, full_name, company_name, master_user, modules, white_label=False):
    mods = ','.join(modules)
    return (
        f'# {company_name} — HEPGO ERP (merkez tarafından oluşturuldu)\n'
        '# Yönetici bilgileri yalnızca ilk kurulumda okunur; sonra şifre uygulamadan değiştirilir.\n'
        f'CAYMAZ_ADMIN_USERNAME={admin_user}\n'
        f'CAYMAZ_ADMIN_PASSWORD={admin_pass}\n'
        f'CAYMAZ_ADMIN_FULL_NAME={full_name}\n'
        f'CAYMAZ_COMPANY_NAME={company_name}\n'
        f'CAYMAZ_MASTER_USERNAME={master_user}\n'
        f'CAYMAZ_MODULES={mods}\n'
        f'CAYMAZ_WHITE_LABEL={"1" if white_label else "0"}\n'
        'CAYMAZ_SEED_SPARE_STOCK=0\n'
    )


def _unit_text(name, url, bind_env, env_file, data_dir, brand_dir):
    """bind_env: ('CAYMAZ_UDS', soket_yolu) ya da ('PORT', '8091')."""
    return (
        '[Unit]\n'
        f'Description=Fabrika Yönetim Sistemi — {name}{(" (" + url + ")") if url else ""}\n'
        'After=network-online.target\n\n'
        '[Service]\n'
        f'WorkingDirectory={APP_DIR}\n'
        f'Environment={bind_env[0]}={bind_env[1]}\n'
        'Environment=TZ=Europe/Istanbul\n'
        f'Environment=CAYMAZ_ENV_FILE={env_file}\n'
        f'Environment=CAYMAZ_DATA_DIR={data_dir}\n'
        f'Environment=CAYMAZ_BRAND_DIR={brand_dir}\n'
        f'ExecStart={APP_DIR}/run.sh\n'
        'Restart=always\nRestartSec=5\n\n'
        '[Install]\nWantedBy=default.target\n'
    )


# systemd kapsamı: fabrikada kullanıcı servisi ('--user'), sunucuda sistem servisi ('' = sistem).
SYSTEMCTL_SCOPE = os.environ.get('VEILOX_SYSTEMCTL_SCOPE', '--user')


def _systemctl(*args):
    cmd = ['systemctl'] + ([SYSTEMCTL_SCOPE] if SYSTEMCTL_SCOPE else []) + list(args)
    return subprocess.run(cmd, capture_output=True, text=True, timeout=120)


def provision_online(conn, company):
    """company: companies satırı (dict). Dosyaları üretir, servisi başlatır, DB'yi günceller. (ok, detail) döner."""
    import json
    from . import db
    slug = company['slug']
    cid = company['id']
    name = company['name']
    url = company.get('url') or ''
    modules = company['modules'] if isinstance(company['modules'], list) else json.loads(company['modules'] or '[]')
    master_user = company['master_username']
    full_name = company.get('master_name') or 'Yönetici'
    admin_pass = company.get('master_secret') or gen_password()

    tdir = TENANTS_DIR / slug
    data_dir = tdir / 'data'
    brand_dir = tdir / 'brand'
    env_file = tdir / '.env'
    service = f'caymaz-{slug}'

    # Bağlanma: Unix soket (tercih — port açılmaz) ya da (fallback) 127.0.0.1 portu
    if USE_SOCKET:
        host_sock = SOCK_DIR / f'{slug}.sock'
        cont_sock = f'{CF_HOME_CONTAINER}/sockets/{slug}.sock'
        bind_env = ('CAYMAZ_UDS', str(host_sock))
        cf_service = f'unix:{cont_sock}'
        port = None
        socket_path = str(host_sock)
    else:
        port = company.get('port') or free_port(conn)
        bind_env = ('PORT', str(port))
        cf_service = f'http://127.0.0.1:{port}'
        socket_path = None

    conn.execute("UPDATE companies SET status='provisioning', error='' WHERE id=?", (cid,))
    conn.commit()
    try:
        dirs = [data_dir, brand_dir / 'img', brand_dir / 'icons']
        if USE_SOCKET:
            dirs.append(SOCK_DIR)
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)
        env_file.write_text(_env_text(master_user, admin_pass, full_name, name, master_user, modules,
                                      white_label=bool(company.get('white_label'))), encoding='utf-8')
        os.chmod(env_file, 0o600)

        if EXEC:
            unit_path = SYSTEMD_DIR / f'{service}.service'
            SYSTEMD_DIR.mkdir(parents=True, exist_ok=True)
            unit_path.write_text(_unit_text(name, url, bind_env, env_file, data_dir, brand_dir), encoding='utf-8')
            _systemctl('daemon-reload')
            r = _systemctl('enable', '--now', service)
            if r.returncode != 0:
                raise RuntimeError(f'systemctl enable --now başarısız: {r.stderr.strip() or r.stdout.strip()}')

        # Cloudflare: <slug>.veilox.app → soket/port. Hata olsa bile servis ayakta kalır.
        from . import cloudflare as cf
        cf_host, cf_note = None, ''
        try:
            cf_host, cf_note = cf.publish(slug, cf_service)
            if cf_host and not url:
                url = f'https://{cf_host}'
        except Exception as e:   # noqa: BLE001
            cf_note = str(e)

        conn.execute(
            "UPDATE companies SET status='active', port=?, socket=?, data_dir=?, app_dir=?, brand_dir=?, service_name=?, url=?, "
            "master_secret=NULL, provisioned_at=?, error=? WHERE id=?",
            (port, socket_path, str(data_dir), str(APP_DIR), str(brand_dir), service, url, db.now(),
             ('Cloudflare: ' + cf_note) if cf_note else '', cid))
        conn.commit()
        return True, {'port': port, 'socket': socket_path, 'service': service, 'data_dir': str(data_dir), 'url': url,
                      'hostname': cf_host, 'cloudflare_error': cf_note or None,
                      'admin_password': admin_pass if not company.get('master_secret') else None}
    except Exception as e:   # noqa: BLE001  (provisioning hatası kayda alınır, servis değil)
        conn.execute("UPDATE companies SET status='error', error=? WHERE id=?", (str(e)[:500], cid))
        conn.commit()
        return False, {'error': str(e)}


def deprovision(conn, company):
    """Firmayı durdurur ve servisi kaldırır (veri klasörü korunur)."""
    service = company.get('service_name') or f"caymaz-{company['slug']}"
    detail = {}
    if EXEC:
        _systemctl('disable', '--now', service)
        unit = SYSTEMD_DIR / f'{service}.service'
        try:
            unit.unlink()
            _systemctl('daemon-reload')
            detail['unit_removed'] = True
        except OSError:
            pass
    # Soket dosyasını temizle
    sp = company.get('socket') or str(SOCK_DIR / f"{company['slug']}.sock")
    try:
        Path(sp).unlink()
        detail['socket_removed'] = True
    except OSError:
        pass
    # Cloudflare alt alan adını kaldır (açıksa)
    try:
        from . import cloudflare as cf
        detail['cf_unpublished'] = cf.unpublish(company['slug'])
    except Exception as e:   # noqa: BLE001
        detail['cf_error'] = str(e)
    conn.execute("UPDATE companies SET status='suspended' WHERE id=?", (company['id'],))
    conn.commit()
    return True, detail
