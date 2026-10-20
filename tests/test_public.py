"""Veilox herkese açık uçlar: merkez girişi yalnız merkez alan adında (veilox.app); hepgo.com'da /panel → /giris ve /api/login yok.
Firma girişi: adresle bulma (aktif → panel adresi, bekleyen → durum mesajı), e-posta + şifreyle bulma (hatalıda kilit),
kayıt (Türkçe ad → sade alt alan adı, aynı e-postayla ikinci bekleyen başvuru engeli, koşul onayı zorunlu).

Çalıştırma (central/veilox_server içinde): ../../.venv/bin/python -m tests.test_public
"""
import os
import sqlite3
import tempfile

os.environ.update(VEILOX_DATA_DIR=tempfile.mkdtemp(), VEILOX_ENV_FILE='/nonexistent', VEILOX_TENANTS='/nonexistent', VEILOX_CF_BASE='hepgo.com')

from fastapi.testclient import TestClient  # noqa: E402

from veilox import db  # noqa: E402
from veilox.main import app  # noqa: E402
from veilox.passwd import make_hash  # noqa: E402


def main():
    with TestClient(app, base_url='https://hepgo.com') as c, TestClient(app, base_url='https://veilox.app') as v:
        # merkez girişi yalnız veilox.app
        assert c.get('/api/public/site').json()['central'] is False
        assert v.get('/api/public/site').json()['central'] is True
        r = c.get('/panel', follow_redirects=False)
        assert r.status_code == 307 and r.headers['location'] == '/giris', r.status_code
        assert v.get('/panel').status_code == 200
        assert c.post('/api/login', json={'username': 'x', 'password': 'y'}).status_code == 404
        assert c.get('/giris').status_code == 200
        # kayıt: Türkçe ad → sade adres
        prev = c.get('/api/public/slug-preview', params={'name': 'Örnek Çelik Döküm A.Ş.'}).json()
        assert prev['domain'] == 'ornek-celik-dokum-a-s.hepgo.com', prev
        body = {'company_name': 'Örnek Çelik Döküm A.Ş.', 'master_username': 'Ali@Ornek.com', 'master_name': 'Ali', 'password': 'Guclu-Parola-2026',
                'package_slug': 'uretim', 'phone': '05551112233', 'city': 'Ankara', 'accept': True}
        assert c.post('/api/register', json={**body, 'accept': False}).status_code == 400
        r = c.post('/api/register', json=body)
        assert r.status_code == 200 and r.json()['domain'] == 'ornek-celik-dokum-a-s.hepgo.com' and r.json()['application_no'].startswith('B-'), r.text
        assert c.post('/api/register', json=body).status_code == 409   # aynı e-postayla bekleyen başvuru
        # adresle firma girişi: bekleyen → mesaj; aktif → panel adresi
        r = c.post('/api/public/firm-lookup', json={'address': 'ornek-celik-dokum-a-s.hepgo.com'}).json()
        assert r['status'] == 'pending' and 'url' not in r, r
        with db.connect() as conn:
            conn.execute("""INSERT INTO companies (slug, name, url, mode, master_username, master_password_hash, status, created_at)
                            VALUES ('acme', 'Acme', 'https://acme.hepgo.com', 'online', 'boss@acme.com', ?, 'active', '2026-01-01T00:00:00')""",
                         (make_hash('Acme-Parola-123'),))
            conn.execute("""INSERT INTO companies (slug, name, url, mode, master_username, status, created_at)
                            VALUES ('eski', 'Eski', 'https://eski-firma.com', 'online', 'x@eski.com', 'active', '2026-01-01T00:00:00')""")
            conn.commit()
        for addr in ('acme', 'ACME.hepgo.com', 'https://acme.hepgo.com/app#/'):
            assert c.post('/api/public/firm-lookup', json={'address': addr}).json() == {'status': 'active', 'url': 'https://acme.hepgo.com/app'}
        assert c.post('/api/public/firm-lookup', json={'address': 'eski-firma.com'}).json()['url'] == 'https://eski-firma.com/app'
        assert c.post('/api/public/firm-lookup', json={'address': 'yok-boyle'}).status_code == 404
        # e-posta + şifre ile bulma
        r = c.post('/api/public/firm-find', json={'email': 'BOSS@acme.com', 'password': 'Acme-Parola-123'}).json()
        assert r['firms'][0]['url'] == 'https://acme.hepgo.com/app' and 'master_password_hash' not in r['firms'][0]
        r = c.post('/api/public/firm-find', json={'email': 'ali@ornek.com', 'password': 'Guclu-Parola-2026'}).json()
        assert r['firms'][0]['status'] == 'pending'
        for _ in range(5):
            assert c.post('/api/public/firm-find', json={'email': 'boss@acme.com', 'password': 'yanlis'}).status_code == 401
        assert c.post('/api/public/firm-find', json={'email': 'boss@acme.com', 'password': 'Acme-Parola-123'}).status_code == 429
        with sqlite3.connect(db.DB_PATH) as conn:
            assert conn.execute("SELECT phone, city FROM companies WHERE slug='ornek-celik-dokum-a-s'").fetchone() == ('05551112233', 'Ankara')
    print('Veilox herkese açık uç testleri geçti.')


if __name__ == '__main__':
    main()
