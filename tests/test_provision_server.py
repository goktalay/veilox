"""Sunucu modu kurulum: .env alt modüllerden önce yüklenir; birim root yardımcısıyla (deploy/hepgo-tenant) kurulur/kaldırılır,
firma adı birime girmez; native cloudflared için ingress soketi /run/hepgo/<slug>.sock, yedek ayrı klasöre.
Gerçek sudo/systemctl/tünel çalıştırılmaz (yardımcı sahte birim klasörüne yazar, tünel yeniden başlatma taklit edilir).
Çalıştırma (central/veilox_server içinde): ../../.venv/bin/python -m tests.test_provision_server
"""
import os
import sys
import tempfile
from pathlib import Path

tmp = Path(tempfile.mkdtemp())
HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
from veilox.passwd import make_hash  # noqa: E402

app_dir, units, cf_dir = tmp / 'app', tmp / 'units', tmp / 'cf'
for d in (app_dir / 'tenants', units, cf_dir):
    d.mkdir(parents=True)
(cf_dir / 'config.yml').write_text('ingress:\n  - hostname: hepgo.com\n    service: unix:/run/hepgo/veilox.sock\n'
                                   '  - service: http_status:404\n', encoding='utf-8')
# Sahte yardımcı: gerçek betiği sahte birim klasörü ve sahte systemctl ile çalıştırır
fake = tmp / 'helper.sh'
fake.write_text(f'#!/bin/bash\nHEPGO_APP={app_dir} HEPGO_UNIT_DIR={units} HEPGO_SYSTEMCTL=true exec {HERE}/deploy/hepgo-tenant "$@"\n')
fake.chmod(0o755)
# Ayarlar YALNIZ .env'de: yükleme sırası hatası olsaydı alt modüller bunları görmezdi
(tmp / '.env').write_text('\n'.join([
    'VEILOX_USERNAME=admin@veilox', f'VEILOX_PASSWORD_HASH={make_hash("merkez-sifre-123")}',
    f'VEILOX_TENANT_APP_DIR={app_dir}', f'VEILOX_UNIT_HELPER={fake}', 'VEILOX_UNIT_HELPER_SUDO=0',
    f'VEILOX_SOCK_DIR={tmp / "run"}', 'VEILOX_CF_HOME_CONTAINER=', 'VEILOX_CF_ENABLE=1', 'VEILOX_CF_BASE=hepgo.com',
    f'VEILOX_CF_CONFIG={cf_dir / "config.yml"}', f'VEILOX_CF_BACKUP_DIR={tmp / "cfbak"}', 'VEILOX_CF_RELOAD=systemd',
    'VEILOX_CF_ROUTE_DNS=0', f'VEILOX_DATA_DIR={tmp / "central"}', f'VEILOX_TENANTS={tmp / "yok.json"}', '']), encoding='utf-8')
os.environ['VEILOX_ENV_FILE'] = str(tmp / '.env')
for k in [k for k in os.environ if k.startswith('VEILOX_') and k != 'VEILOX_ENV_FILE']:
    del os.environ[k]

from fastapi.testclient import TestClient  # noqa: E402
from veilox import cloudflare, provision  # noqa: E402
from veilox.main import app  # noqa: E402

reloads = []
cloudflare.reload_tunnel = lambda: reloads.append(1) or True


def ok(r, c=200):
    assert r.status_code == c, (r.status_code, r.text)
    return r.json()


def main():
    assert provision.APP_DIR == app_dir and provision.UNIT_HELPER == str(fake) and cloudflare.ENABLED, '.env okunmadı'
    with TestClient(app) as c:
        ok(c.post('/api/login', json={'username': 'admin@veilox', 'password': 'merkez-sifre-123'}))
        co = ok(c.post('/api/companies', json={'name': 'Örnek Çelik %n A.Ş.', 'master_username': 'sahip@ornek.com',
                                               'modules': ['admin', 'users']}))
        slug = co['slug']
        prov = ok(c.post(f"/api/companies/{co['id']}/provision"))
        assert prov.get('ok') is not False, prov
        unit = (units / f'hepgo-{slug}.service').read_text()
        assert 'Örnek' not in unit and f'CAYMAZ_UDS=/run/hepgo/{slug}.sock' in unit and 'User=hepgo' in unit, unit
        env = (app_dir / 'tenants' / slug / '.env').read_text()
        assert 'CAYMAZ_CONSOLE=0' in env and 'CAYMAZ_MASTER_USERNAME=sahip@ornek.com' in env
        cfg = (cf_dir / 'config.yml').read_text()
        assert f'  - hostname: {slug}.hepgo.com\n    service: unix:{tmp / "run"}/{slug}.sock\n  - service: http_status:404' in cfg, cfg
        assert reloads == [1] and list((tmp / 'cfbak').glob('config.yml.bak-*'))
        got = ok(c.get(f"/api/companies/{co['id']}"))
        assert got['status'] == 'active' and got['url'] == f'https://{slug}.hepgo.com', got
        ok(c.post(f"/api/companies/{co['id']}/suspend"))
        assert not (units / f'hepgo-{slug}.service').exists()
        assert f'{slug}.hepgo.com' not in (cf_dir / 'config.yml').read_text() and reloads == [1, 1]
        assert (app_dir / 'tenants' / slug / '.env').exists()   # veri korunur
    print('Sunucu modu kurulum testleri geçti.')


if __name__ == '__main__':
    main()
