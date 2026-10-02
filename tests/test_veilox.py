"""Veilox merkez (provisioning) testi: giriş, paket vitrini, self-kayıt, firma oluşturma, provisioning (systemctl'siz),
offline paket üretimi ve yetki kontrolü. Gerçek tenant verisine DOKUNMAZ (merkez artık veri okumaz).
Çalıştırma: cd ~/veilox && /home/mkaderoglu/caymazbuild/.venv/bin/python -m tests.test_veilox
"""
import json
import os
import tempfile
from pathlib import Path

tmp = Path(tempfile.mkdtemp())
(tmp / 'tenants.json').write_text(json.dumps([
    {'id': 'gokkubbe', 'name': 'GÖKKUBBE Teknoloji', 'url': 'https://caymaz.app',
     'data_dir': '/x/data', 'app_dir': '/x', 'brand_dir': None},
]), encoding='utf-8')

import sys  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from veilox.passwd import make_hash  # noqa: E402

(tmp / '.env').write_text(f'VEILOX_USERNAME=admin@veilox\nVEILOX_PASSWORD_HASH={make_hash("merkez-sifre-123")}\n', encoding='utf-8')
os.environ.update(
    VEILOX_ENV_FILE=str(tmp / '.env'), VEILOX_TENANTS=str(tmp / 'tenants.json'),
    VEILOX_DATA_DIR=str(tmp / 'central'), VEILOX_TENANTS_DIR=str(tmp / 'tenants'),
    VEILOX_SYSTEMD_DIR=str(tmp / 'systemd'), VEILOX_PROVISION_EXEC='0',
    VEILOX_CF_HOME=str(tmp / 'cfhome'),
    VEILOX_TENANT_APP_DIR='/home/mkaderoglu/caymazbuild',
)

from fastapi.testclient import TestClient  # noqa: E402
from veilox.main import app  # noqa: E402


def ok(r, c=200):
    assert r.status_code == c, (r.request.url, r.status_code, r.text)
    return r.json()


def main():
    with TestClient(app) as c:
        pk = ok(c.get('/api/public/packages'))
        assert len(pk) >= 4 and any(p['slug'] == 'kurumsal' for p in pk)
        assert len(ok(c.get('/api/modules'))) >= 20

        ok(c.post('/api/register', json={'company_name': 'Deneme Metal', 'master_username': 'sahip@denememetal.com',
                                         'master_name': 'Ali Veli', 'password': 'guclu-sifre-1', 'package_slug': 'uretim'}))
        assert c.get('/api/companies').status_code == 401

        ok(c.post('/api/login', json={'username': 'admin@veilox', 'password': 'merkez-sifre-123'}))
        assert ok(c.get('/api/me'))['username'] == 'admin@veilox'

        comps = ok(c.get('/api/companies'))
        assert any(x['slug'] == 'gokkubbe' for x in comps), 'tenants.json migrasyonu'
        pend = [x for x in comps if x['status'] == 'pending']
        assert pend and 'master_secret' not in pend[0] and 'master_password_hash' not in pend[0], 'sirlar gizli'
        pid = pend[0]['id']

        ok(c.post(f'/api/companies/{pid}/approve'))
        prov = ok(c.post(f'/api/companies/{pid}/provision'))
        assert prov['ok'] and prov['socket'] and prov['socket'].endswith('.sock')   # port değil, soket
        env = (Path(os.environ['VEILOX_TENANTS_DIR']) / pend[0]['slug'] / '.env').read_text(encoding='utf-8')
        assert 'CAYMAZ_MODULES=' in env and 'sahip@denememetal.com' in env

        np = ok(c.post('/api/packages', json={'name': 'Mini', 'modules': ['admin', 'users'], 'monthly_fee': 500, 'mode': 'online'}))
        assert np['slug'] == 'mini' and np['modules'] == ['admin', 'users']
        ok(c.put(f"/api/packages/{np['id']}", json={'name': 'Mini+', 'modules': ['admin', 'users', 'reports'],
                                                    'monthly_fee': 600, 'mode': 'online', 'visible': False}))

        oc = ok(c.post('/api/companies', json={'name': 'Ofis Disi A.S.', 'master_username': 'm@ofisdisi.com',
                                               'mode': 'offline', 'modules': ['admin', 'users', 'reports']}))
        z = c.get(f"/api/companies/{oc['id']}/offline-package")
        assert z.status_code == 200 and z.headers['content-type'] == 'application/zip' and len(z.content) > 10000

    print('test_veilox: TUM TESTLER GECTI')


if __name__ == '__main__':
    main()
