"""Veilox — merkez (provisioning) paneli. veilox.app, 127.0.0.1:8082.

Merkez firmaları (Fabrika Yönetim Sistemi kurulumlarını) OLUŞTURUR ve yönetir; paket vitrini sunar;
müşteriler self-servis kayıt olabilir (kaydeden kişi o firmanın master kullanıcısı olur). Merkez firma
VERİLERİNE ARTIK ERİŞMEZ — KVKK gereği yalnızca kendi kayıt defterini (paket/firma) tutar.

Güvenlik: tek merkez yöneticisi (.env: VEILOX_USERNAME, VEILOX_PASSWORD_HASH — PBKDF2); oturum çerezi
HttpOnly + SameSite=Strict (+ Secure, https'te); hatalı girişte IP başına ve genel kilit; self-kayıtta IP
başına saatlik sınır; sıkı CSP; yalnızca 127.0.0.1 (dışarıdan erişim Cloudflare tüneli ile).
"""
import hmac
import os
import secrets
import tempfile
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import db
from .modules_catalog import MODULES, valid_modules
from .passwd import make_hash, verify_password
from . import provision, pkg

BASE = Path(__file__).resolve().parent.parent
STATIC = BASE / 'static'


def _load_env(path):
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())


_load_env(Path(os.environ.get('VEILOX_ENV_FILE', BASE / '.env')))
USERNAME = os.environ.get('VEILOX_USERNAME', '').strip().lower()
PASSWORD_HASH = os.environ.get('VEILOX_PASSWORD_HASH', '')
SESSION_HOURS = 12
COOKIE = 'veilox_session'

app = FastAPI(title='Veilox', docs_url=None, redoc_url=None, openapi_url=None)


@app.on_event('startup')
def _startup():
    db.init()


# ---------- Güvenlik başlıkları
@app.middleware('http')
async def headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['Content-Security-Policy'] = ("default-src 'self'; img-src 'self' data:; style-src 'self'; "
                                                   "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; "
                                                   "base-uri 'none'; form-action 'self'")
    if request.url.path.startswith('/api/') or request.url.path in ('/', '/index.html', '/panel'):
        response.headers['Cache-Control'] = 'no-store'
    elif request.url.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'no-cache'
    return response


# ---------- Oturum ve giriş kilidi
_sessions = {}          # jeton → bitiş
_fails = {}             # ip → [zamanlar]  (giriş)
_global_fails = []      # tüm hatalı girişler
_reg = {}               # ip → [zamanlar]  (self-kayıt)
LOCK_AFTER, LOCK_SECONDS, GLOBAL_LIMIT = 5, 15 * 60, 30
REG_LIMIT, REG_WINDOW = 3, 3600


def _ip(request):
    return request.headers.get('cf-connecting-ip') or (request.client.host if request.client else '?')


def _locked(ip):
    now = time.time()
    _fails[ip] = [t for t in _fails.get(ip, []) if now - t < LOCK_SECONDS]
    _global_fails[:] = [t for t in _global_fails if now - t < LOCK_SECONDS]
    return len(_fails[ip]) >= LOCK_AFTER or len(_global_fails) >= GLOBAL_LIMIT


def current(request: Request):
    token = request.cookies.get(COOKIE)
    exp = _sessions.get(token) if token else None
    if not exp or exp < time.time():
        _sessions.pop(token, None)
        raise HTTPException(401, 'Oturum açılmamış')
    return token


class LoginIn(BaseModel):
    username: str
    password: str


@app.post('/api/login')
def login(body: LoginIn, request: Request, response: Response):
    ip = _ip(request)
    if _locked(ip):
        raise HTTPException(429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.')
    ok = (USERNAME and PASSWORD_HASH and hmac.compare_digest(body.username.strip().lower(), USERNAME)
          and verify_password(body.password, PASSWORD_HASH))
    if not ok:
        _fails.setdefault(ip, []).append(time.time())
        _global_fails.append(time.time())
        time.sleep(0.6)
        raise HTTPException(401, 'Kullanıcı adı veya şifre hatalı')
    _fails.pop(ip, None)
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_HOURS * 3600
    secure = request.headers.get('x-forwarded-proto') == 'https' or request.url.scheme == 'https'
    response.set_cookie(COOKIE, token, max_age=SESSION_HOURS * 3600, httponly=True, samesite='strict', secure=secure, path='/')
    return {'ok': True}


@app.post('/api/logout')
def logout(request: Request, response: Response):
    _sessions.pop(request.cookies.get(COOKIE), None)
    response.delete_cookie(COOKIE, path='/')
    return {'ok': True}


@app.get('/api/me')
def me(request: Request):
    current(request)
    return {'username': USERNAME}


def _server_stats():
    """Merkez (bu) sunucunun kaynak durumu — yalnızca merkez kullanıcısına. stdlib (/proc + shutil)."""
    import os
    import shutil
    out = {}
    try:
        la = os.getloadavg()
        cores = os.cpu_count() or 1
        out['cores'] = cores
        out['load'] = [round(x, 2) for x in la]
        out['cpu_pct'] = round(min(100.0, la[0] / cores * 100))
    except Exception:   # noqa: BLE001
        pass
    try:
        m = {}
        with open('/proc/meminfo', encoding='utf-8') as f:
            for line in f:
                k, _, v = line.partition(':')
                m[k.strip()] = int(v.split()[0]) * 1024
        total, avail = m.get('MemTotal', 0), m.get('MemAvailable', 0)
        out['mem_total'], out['mem_used'] = total, total - avail
    except Exception:   # noqa: BLE001
        pass
    try:
        du = shutil.disk_usage('/')
        out['disk_total'], out['disk_used'], out['disk_free'] = du.total, du.used, du.free
    except Exception:   # noqa: BLE001
        pass
    try:
        with open('/proc/uptime', encoding='utf-8') as f:
            out['uptime_s'] = int(float(f.read().split()[0]))
    except Exception:   # noqa: BLE001
        pass
    return out


@app.get('/api/server-stats')
def server_stats(request: Request):
    current(request)
    return _server_stats()


# ---------- Herkese açık: paket vitrini + self-servis kayıt
@app.get('/api/public/packages')
def public_packages():
    with db.connect() as conn:
        pkgs = db.rows(conn, 'SELECT * FROM packages WHERE visible=1 ORDER BY sort, id')
    return [{'slug': p['slug'], 'name': p['name'], 'description': p['description'],
             'monthly_fee': p['monthly_fee'], 'mode': p['mode'],
             'modules': db.package_public(p)['modules']} for p in pkgs]


@app.get('/api/modules')
def modules():
    return [{'key': k, 'title': t, 'group': g} for k, t, g in MODULES]


class RegisterIn(BaseModel):
    company_name: str
    master_username: str
    master_name: str = ''
    password: str
    package_slug: str = ''


@app.post('/api/register')
def register(body: RegisterIn, request: Request):
    ip = _ip(request)
    now = time.time()
    _reg[ip] = [t for t in _reg.get(ip, []) if now - t < REG_WINDOW]
    if len(_reg[ip]) >= REG_LIMIT:
        raise HTTPException(429, 'Çok fazla kayıt denemesi. Daha sonra tekrar deneyin.')
    name = body.company_name.strip()
    user = body.master_username.strip().lower()
    if len(name) < 2:
        raise HTTPException(400, 'Firma adı gerekli')
    if '@' not in user or len(user) < 5:
        raise HTTPException(400, 'Geçerli bir e-posta girin')
    if len(body.password) < 10:
        raise HTTPException(400, 'Şifre en az 10 karakter olmalı')
    with db.connect() as conn:
        pkg_row = db.row(conn, 'SELECT * FROM packages WHERE slug=? AND visible=1', (body.package_slug,)) \
            if body.package_slug else None
        mods = db.package_public(pkg_row)['modules'] if pkg_row else []
        mode = (pkg_row['mode'] if pkg_row else 'online')
        if mode == 'both':
            mode = 'online'
        fee = pkg_row['monthly_fee'] if pkg_row else 0
        wl = int(pkg_row['white_label']) if pkg_row else 0
        slug = _unique_slug(conn, provision.slugify(name))
        _reg[ip].append(now)
        conn.execute(
            'INSERT INTO companies(slug,name,package_id,mode,modules,white_label,master_username,master_name,'
            'master_password_hash,master_secret,monthly_fee,status,self_registered,created_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (slug, name, (pkg_row['id'] if pkg_row else None), mode, _j(mods), wl,
             user, body.master_name.strip(), make_hash(body.password), body.password, fee,
             'pending', 1, db.now()))
        conn.commit()
    return {'ok': True, 'message': 'Kaydınız alındı. Onaylandığında bilgilendirileceksiniz.'}


# ---------- Panel (yetki gerekli): paketler
class PackageIn(BaseModel):
    name: str
    description: str = ''
    modules: list[str] = []
    monthly_fee: float = 0
    mode: str = 'online'
    visible: bool = True
    white_label: bool = False
    sort: int = 0


@app.get('/api/packages')
def packages(request: Request):
    current(request)
    with db.connect() as conn:
        return [db.package_public(p) for p in db.rows(conn, 'SELECT * FROM packages ORDER BY sort, id')]


@app.post('/api/packages')
def package_create(body: PackageIn, request: Request):
    current(request)
    with db.connect() as conn:
        slug = _unique_slug(conn, provision.slugify(body.name), table='packages')
        cur = conn.execute('INSERT INTO packages(slug,name,description,modules,monthly_fee,mode,visible,white_label,sort,created_at) '
                           'VALUES(?,?,?,?,?,?,?,?,?,?)',
                           (slug, body.name.strip(), body.description, _j(valid_modules(body.modules)),
                            body.monthly_fee, _mode(body.mode), int(body.visible), int(body.white_label), body.sort, db.now()))
        conn.commit()
        return db.package_public(db.row(conn, 'SELECT * FROM packages WHERE id=?', (cur.lastrowid,)))


@app.put('/api/packages/{pid}')
def package_update(pid: int, body: PackageIn, request: Request):
    current(request)
    with db.connect() as conn:
        if not db.row(conn, 'SELECT 1 FROM packages WHERE id=?', (pid,)):
            raise HTTPException(404, 'Paket bulunamadı')
        conn.execute('UPDATE packages SET name=?,description=?,modules=?,monthly_fee=?,mode=?,visible=?,white_label=?,sort=? WHERE id=?',
                     (body.name.strip(), body.description, _j(valid_modules(body.modules)), body.monthly_fee,
                      _mode(body.mode), int(body.visible), int(body.white_label), body.sort, pid))
        conn.commit()
        return db.package_public(db.row(conn, 'SELECT * FROM packages WHERE id=?', (pid,)))


@app.delete('/api/packages/{pid}')
def package_delete(pid: int, request: Request):
    current(request)
    with db.connect() as conn:
        conn.execute('DELETE FROM packages WHERE id=?', (pid,))
        conn.commit()
    return {'ok': True}


# ---------- Panel: firmalar
class CompanyIn(BaseModel):
    name: str
    master_username: str
    master_name: str = ''
    package_slug: str = ''
    mode: str = 'online'
    modules: list[str] = []
    url: str = ''
    password: str = ''   # boşsa provisioning/offline anında üretilir
    white_label: bool = False   # boş bırakılırsa paketten miras alınır
    note: str = ''


@app.get('/api/companies')
def companies(request: Request):
    current(request)
    with db.connect() as conn:
        return [db.company_public(c) for c in db.rows(conn, 'SELECT * FROM companies ORDER BY id DESC')]


@app.get('/api/companies/{cid}')
def company_get(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        return db.company_public(c)


@app.post('/api/companies')
def company_create(body: CompanyIn, request: Request):
    current(request)
    user = body.master_username.strip().lower()
    if '@' not in user:
        raise HTTPException(400, 'Geçerli bir master e-postası girin')
    with db.connect() as conn:
        pkg_row = db.row(conn, 'SELECT * FROM packages WHERE slug=?', (body.package_slug,)) if body.package_slug else None
        mods = valid_modules(body.modules) or (db.package_public(pkg_row)['modules'] if pkg_row else [])
        fee = pkg_row['monthly_fee'] if pkg_row else 0
        wl = int(body.white_label or (pkg_row['white_label'] if pkg_row else 0))   # firma ayarı yoksa paketten
        pwd = body.password.strip() or provision.gen_password()
        slug = _unique_slug(conn, provision.slugify(body.name))
        cur = conn.execute(
            'INSERT INTO companies(slug,name,url,package_id,mode,modules,white_label,master_username,master_name,'
            'master_password_hash,master_secret,monthly_fee,status,self_registered,note,created_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (slug, body.name.strip(), body.url.strip(), (pkg_row['id'] if pkg_row else None), _mode(body.mode, allow_offline=True),
             _j(mods), wl, user, body.master_name.strip(), make_hash(pwd), pwd, fee, 'approved', 0, body.note, db.now()))
        conn.commit()
        return db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cur.lastrowid,)))


@app.put('/api/companies/{cid}')
def company_update(cid: int, body: CompanyIn, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        mods = valid_modules(body.modules)
        conn.execute('UPDATE companies SET name=?,url=?,master_username=?,master_name=?,mode=?,modules=?,note=? WHERE id=?',
                     (body.name.strip() or c['name'], body.url.strip(), body.master_username.strip().lower() or c['master_username'],
                      body.master_name.strip(), _mode(body.mode, allow_offline=True), _j(mods or []), body.note, cid))
        conn.commit()
        return db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,)))


@app.post('/api/companies/{cid}/approve')
def company_approve(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        if c['status'] == 'pending':
            conn.execute("UPDATE companies SET status='approved' WHERE id=?", (cid,))
            conn.commit()
    return {'ok': True}


@app.post('/api/companies/{cid}/provision')
def company_provision(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,)) or {})
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        # düz şifre (varsa) provisioning için gerekli; company_public onu çıkardı → ham satırdan al
        raw = db.row(conn, 'SELECT master_secret FROM companies WHERE id=?', (cid,))
        c['master_secret'] = raw.get('master_secret') if raw else None
        if c['mode'] == 'offline':
            raise HTTPException(400, 'Offline firma için provisioning yok; offline paket indirin.')
        ok, detail = provision.provision_online(conn, c)
        if not ok:
            raise HTTPException(500, detail.get('error', 'Provisioning başarısız'))
        return {'ok': True, **detail}


@app.post('/api/companies/{cid}/suspend')
def company_suspend(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,)) or {})
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        provision.deprovision(conn, c)
    return {'ok': True}


@app.delete('/api/companies/{cid}')
def company_delete(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        conn.execute('DELETE FROM companies WHERE id=?', (cid,))
        conn.commit()
    return {'ok': True}


@app.get('/api/companies/{cid}/offline-package')
def company_offline(cid: int, request: Request):
    current(request)
    with db.connect() as conn:
        c = db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        mods = db.company_public(c)['modules']
        pwd = c.get('master_secret') or provision.gen_password()
        if not c.get('master_secret'):
            conn.execute('UPDATE companies SET master_secret=?, master_password_hash=? WHERE id=?',
                         (pwd, make_hash(pwd), cid))
            conn.commit()
        out = pkg.build_offline_zip(Path(tempfile.gettempdir()) / 'veilox-pkg', c['name'],
                                    c['master_username'], c.get('master_name') or 'Yönetici', pwd, mods)
        conn.execute("UPDATE companies SET status='offline' WHERE id=? AND status IN ('approved','pending')", (cid,))
        conn.commit()
    return FileResponse(out, filename=out.name, media_type='application/zip')


@app.post('/api/companies/{cid}/download-link')
def company_download_link(cid: int, request: Request):
    """Master'ın veilox.app üzerinden boş programı kendi indirebilmesi için süreli, token'lı kurulum linki üretir."""
    current(request)
    with db.connect() as conn:
        if not db.row(conn, 'SELECT 1 FROM companies WHERE id=?', (cid,)):
            raise HTTPException(404, 'Firma bulunamadı')
        token = secrets.token_urlsafe(24)
        exp = time.strftime('%Y-%m-%dT%H:%M:%S', time.localtime(time.time() + 7 * 86400))
        conn.execute('INSERT INTO download_tokens(token,company_id,created_at,expires_at) VALUES(?,?,?,?)',
                     (token, cid, db.now(), exp))
        conn.commit()
    return {'ok': True, 'token': token, 'url': f'/kur/{token}', 'expires_at': exp}


def _valid_token(conn, token):
    t = db.row(conn, 'SELECT * FROM download_tokens WHERE token=?', (token,))
    if not t or t['expires_at'] < db.now():
        raise HTTPException(404, 'Bağlantı geçersiz veya süresi dolmuş')
    return t


@app.get('/api/kur/{token}')
def kur_info(token: str):
    """Public: kurulum linki sayfası için firma bilgisi (veri içermez)."""
    with db.connect() as conn:
        t = _valid_token(conn, token)
        c = db.row(conn, 'SELECT name, mode, modules FROM companies WHERE id=?', (t['company_id'],))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        mods = db.company_public(c)['modules']
    return {'company': c['name'], 'mode': c['mode'], 'module_count': len(mods), 'expires_at': t['expires_at']}


@app.get('/api/kur/{token}/download')
def kur_download(token: str):
    """Public: token geçerliyse firmanın boş kurulum paketini (offline ZIP) indirir."""
    with db.connect() as conn:
        t = _valid_token(conn, token)
        c = db.row(conn, 'SELECT * FROM companies WHERE id=?', (t['company_id'],))
        if not c:
            raise HTTPException(404, 'Firma bulunamadı')
        mods = db.company_public(c)['modules']
        pwd = c.get('master_secret') or provision.gen_password()
        if not c.get('master_secret'):
            conn.execute('UPDATE companies SET master_secret=?, master_password_hash=? WHERE id=?',
                         (pwd, make_hash(pwd), c['id']))
        out = pkg.build_offline_zip(Path(tempfile.gettempdir()) / 'veilox-pkg', c['name'],
                                    c['master_username'], c.get('master_name') or 'Yönetici', pwd, mods)
        conn.execute('UPDATE download_tokens SET downloaded_at=? WHERE token=?', (db.now(), token))
        conn.commit()
    return FileResponse(out, filename=out.name, media_type='application/zip')


# ---------- yardımcılar
def _j(x):
    import json
    return json.dumps(x)


def _mode(m, allow_offline=False):
    m = (m or 'online').strip().lower()
    allowed = {'online', 'offline', 'both'} if allow_offline else {'online', 'offline', 'both'}
    return m if m in allowed else 'online'


def _unique_slug(conn, base, table='companies'):
    slug = base
    i = 2
    while conn.execute(f'SELECT 1 FROM {table} WHERE slug=?', (slug,)).fetchone():
        slug = f'{base}-{i}'
        i += 1
    return slug


# ---------- Arayüz: tanıtım (herkese açık) + panel (yetki arkasında)
app.mount('/static', StaticFiles(directory=STATIC), name='static')


@app.get('/')
def index():
    land = STATIC / 'landing.html'
    return FileResponse(land if land.exists() else STATIC / 'index.html')


@app.get('/panel')
def panel():
    return FileResponse(STATIC / 'index.html')


@app.get('/kur/{token}')
def kur_page(token: str):
    return FileResponse(STATIC / 'kur.html')
