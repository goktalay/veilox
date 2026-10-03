"""Cloudflare tüneli otomasyonu — online firmalara <slug>.veilox.app alt alan adı.

Tek seferlik: *.veilox.app wildcard DNS kaydı (ensure_wildcard_dns) → tünele yönlenir.
Firma başına: config.yml ingress'ine '<slug>.veilox.app → http://127.0.0.1:<port>' satırı eklenir ve tünel
konteyneri yeniden başlatılarak yeni yönlendirme devreye girer. DNS tekrar gerekmez (wildcard kapsar).

Hepsi VEILOX_CF_ENABLE=1 ile açılır (varsayılan kapalı → firma yalnız yerel portta kalır). Ayarlar:
VEILOX_CF_BASE (veilox.app), VEILOX_CF_CONTAINER (caymaz-tunnel-app), VEILOX_CF_TUNNEL (caymaz),
VEILOX_CF_CONFIG (~/.cloudflared/config.yml).
"""
import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

ENABLED = os.environ.get('VEILOX_CF_ENABLE', '0') == '1'
BASE = os.environ.get('VEILOX_CF_BASE', 'veilox.app')
CONTAINER = os.environ.get('VEILOX_CF_CONTAINER', 'caymaz-tunnel-app')
TUNNEL = os.environ.get('VEILOX_CF_TUNNEL', 'caymaz')
CONFIG = Path(os.environ.get('VEILOX_CF_CONFIG', Path.home() / '.cloudflared' / 'config.yml'))
CATCH_ALL = '- service: http_status'   # ingress'in son (yakalama) kuralı; yeni host'lar bunun ÖNÜNE eklenir


def hostname(slug):
    return f'{slug}.{BASE}'


def _read_lines(path=None):
    return (path or CONFIG).read_text(encoding='utf-8').splitlines()


def _backup(path):
    bak = path.with_name(path.name + '.bak-' + time.strftime('%Y%m%d%H%M%S'))
    bak.write_text(path.read_text(encoding='utf-8'), encoding='utf-8')
    return bak


def add_ingress(host, service, path=None):
    """config.yml ingress'ine host→service satırı ekler (yoksa). service: 'unix:/...' ya da 'http://127.0.0.1:port'.
    Değişiklik olduysa True döner."""
    path = path or CONFIG
    lines = _read_lines(path)
    if any(l.strip() == f'- hostname: {host}' for l in lines):
        return False
    out, inserted = [], False
    for l in lines:
        if not inserted and l.strip().startswith(CATCH_ALL):
            out.append(f'  - hostname: {host}')
            out.append(f'    service: {service}')
            inserted = True
        out.append(l)
    if not inserted:   # 404 satırı yoksa sona ekle
        out.append(f'  - hostname: {host}')
        out.append(f'    service: {service}')
    if path.exists():
        _backup(path)
    path.write_text('\n'.join(out) + '\n', encoding='utf-8')
    return True


def remove_ingress(host, path=None):
    """host için ingress satırını (ve ardından gelen service satırını) kaldırır."""
    path = path or CONFIG
    lines = _read_lines(path)
    out, skip = [], 0
    changed = False
    for i, l in enumerate(lines):
        if skip:
            skip -= 1
            continue
        if l.strip() == f'- hostname: {host}':
            skip = 1 if (i + 1 < len(lines) and lines[i + 1].strip().startswith('service:')) else 0
            changed = True
            continue
        out.append(l)
    if changed:
        _backup(path)
        path.write_text('\n'.join(out) + '\n', encoding='utf-8')
    return changed


def _docker(*args, timeout=120):
    return subprocess.run(['docker', *args], capture_output=True, text=True, timeout=timeout)


RELOAD = os.environ.get('VEILOX_CF_RELOAD', 'docker')       # 'docker' (fabrika) | 'systemd' (sunucu native cloudflared)
CF_SERVICE = os.environ.get('VEILOX_CF_SERVICE', 'cloudflared')


def reload_tunnel():
    """Yeni ingress'i devreye alır. Fabrikada Docker konteyneri restart; sunucuda native cloudflared servisi restart.
    Sunucuda veilox hepgo kullanıcısıyla çalıştığından systemctl için parolasız sudo gerekir (sudoers drop-in)."""
    if RELOAD == 'systemd':
        r = subprocess.run(['sudo', '-n', 'systemctl', 'restart', CF_SERVICE], capture_output=True, text=True, timeout=60)
    else:
        r = _docker('restart', CONTAINER)
    if r.returncode != 0:
        raise RuntimeError(f'tünel yeniden başlatılamadı: {r.stderr.strip() or r.stdout.strip()}')
    return True


ROUTE_DNS = os.environ.get('VEILOX_CF_ROUTE_DNS', '1') != '0'   # 0 = per-firma DNS komutu çalıştırma (wildcard yeterli)

# Cloudflare API token ile DNS otomasyonu (HER bölge — özel domainler dahil). cloudflared route dns yalnız cert'in
# bölgesinde çalıştığından, token verildiğinde önce API yolu kullanılır. (Env TEMBEL okunur — .env sonradan yüklenebilir.)
def _cf_token():
    return os.environ.get('VEILOX_CF_API_TOKEN', '').strip()


def _cf_tunnel_id():
    return os.environ.get('VEILOX_CF_TUNNEL_ID', '').strip()


def _cf_api(method, path, data=None):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request('https://api.cloudflare.com/client/v4' + path, data=body, method=method,
        headers={'Authorization': 'Bearer ' + _cf_token(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as f:
            return json.load(f)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except Exception:   # noqa: BLE001
            return {'success': False, 'errors': [{'message': str(e)}]}


def _zone_for(host):
    """host'u kapsayan bölgeyi (en uzun eşleşen) bulur → (zone_id, zone_name) ya da (None, None)."""
    d = _cf_api('GET', '/zones?per_page=50')
    res = d.get('result') or []
    cands = [z for z in res if host == z['name'] or host.endswith('.' + z['name'])]
    if not cands:
        return None, None
    z = max(cands, key=lambda z: len(z['name']))
    return z['id'], z['name']


def route_dns_api(host):
    """CF API ile host → tünel CNAME (proxied). Mevcut A/AAAA/CNAME değiştirilir. Idempotent."""
    tid = _cf_tunnel_id()
    if not (_cf_token() and tid):
        return False, 'API token/tunnel id yok'
    target = f'{tid}.cfargotunnel.com'
    zid, zname = _zone_for(host)
    if not zid:
        return False, f'bölge bulunamadı: {host}'
    d = _cf_api('GET', f'/zones/{zid}/dns_records?name={host}&per_page=100')
    recs = d.get('result') or []
    if any(r['type'] == 'CNAME' and r['content'] == target for r in recs):
        return True, f'zaten var ({zname})'
    for r in recs:
        if r['type'] in ('A', 'AAAA', 'CNAME'):
            _cf_api('DELETE', f"/zones/{zid}/dns_records/{r['id']}")
    o = _cf_api('POST', f'/zones/{zid}/dns_records',
                {'type': 'CNAME', 'name': host, 'content': target, 'proxied': True, 'ttl': 1})
    return bool(o.get('success')), (f'eklendi ({zname})' if o.get('success') else str(o.get('errors')))


def route_dns(host):
    """host için tünele CNAME kaydı. Token varsa CF API (her bölge); yoksa cloudflared. Idempotent."""
    if _cf_token() and _cf_tunnel_id():
        return route_dns_api(host)
    if not ROUTE_DNS:
        return True, 'route_dns kapalı (wildcard kullanılıyor)'
    r = _docker('exec', CONTAINER, 'cloudflared', 'tunnel', 'route', 'dns', TUNNEL, host)
    out = (r.stdout + r.stderr).strip()
    ok = r.returncode == 0 or 'already' in out.lower() or 'exists' in out.lower()
    return ok, out


def publish(slug, service):
    """Online firma için <slug>.BASE alt alan adını yayına alır: ingress (host→service) + tünel yeniden yükleme.
    service: Unix soket ('unix:/cfhome/.cloudflared/sockets/<slug>.sock') ya da http://127.0.0.1:port.
    DNS: *.BASE wildcard kaydı (Cloudflare panosunda tek sefer) tüm alt alanları kapsar; ayrıca per-firma
    DNS kaydı da BEST-EFFORT denenir. DNS hatası provisioning'i DURDURMAZ.
    (hostname, dns_note) döner; kapalıysa (None, '')."""
    if not ENABLED:
        return None, ''
    host = hostname(slug)
    changed = add_ingress(host, service)
    if changed:
        reload_tunnel()
    note = ''
    try:
        ok, out = route_dns(host)
        if not ok:
            note = f'per-firma DNS başarısız (wildcard *.{BASE} gerekli): {out[:200]}'
    except Exception as e:   # noqa: BLE001
        note = f'per-firma DNS denenemedi (wildcard *.{BASE} gerekli): {e}'
    return host, note


def unpublish(slug):
    if not ENABLED:
        return False
    if remove_ingress(hostname(slug)):
        reload_tunnel()
        return True
    return False
