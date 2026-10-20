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

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE = Path(__file__).resolve().parent.parent
STATIC = BASE / 'static'


# .env, alt modüllerden ÖNCE yüklenmeli: db/provision/cloudflare/pkg ayarlarını içe aktarılırken okur
# (önceden sonra yükleniyordu → VEILOX_CF_*, VEILOX_TENANT_APP_DIR vb. sessizce yok sayılıyordu).
from . import settings  # noqa: E402
settings.load()

from . import db  # noqa: E402
from .modules_catalog import MODULES, MODULE_KEYS, kobi_modules, valid_modules, esnaf_modules, drone_modules, ESNAF_PKGS  # noqa: E402
from .passwd import make_hash, verify_password  # noqa: E402
from . import provision, pkg, mailer  # noqa: E402
USERNAME = os.environ.get('VEILOX_USERNAME', '').strip().lower()
PASSWORD_HASH = os.environ.get('VEILOX_PASSWORD_HASH', '')
SESSION_HOURS = 12
COOKIE = 'veilox_session'
# Merkez (yönetim) girişi YALNIZCA bu alan adlarında: hepgo.com'da merkez girişi yoktur, firmalar "Firma girişi"ni kullanır.
CENTRAL_HOSTS = {h.strip().lower() for h in os.environ.get('VEILOX_CENTRAL_HOSTS', 'veilox.app,www.veilox.app,localhost,127.0.0.1,testserver').split(',') if h.strip()}
FIRM_BASE = os.environ.get('VEILOX_CF_BASE', 'hepgo.com').strip().lower() or 'hepgo.com'
MERKEZ_URL = os.environ.get('VEILOX_MERKEZ_URL', 'https://merkez.veilox.app/app')
# AÇIK BETA: açıkken fiyatlar gizlenir ve her yeni firma TAM PAKET (tüm modüller) ücretsiz üye olur.
# Fiyatlandırma politikası belirlenince VEILOX_OPEN_BETA=0 yapılır (kod değişmeden normale döner).
OPEN_BETA = os.environ.get('VEILOX_OPEN_BETA', '1').strip().lower() not in ('0', 'false', 'no', '')


def _host(request):
    return (request.headers.get('host') or '').split(':')[0].strip().lower()


def central_host(request):
    return _host(request) in CENTRAL_HOSTS

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
    ga = request.url.path in ('/', '/index.html')   # Google Analytics yalnız tanıtım ana sayfasında (izinle) — panel ve API'de asla
    gs, gc = (' https://www.googletagmanager.com', ' https://*.google-analytics.com https://*.analytics.google.com'
              ' https://www.googletagmanager.com') if ga else ('', '')
    response.headers['Content-Security-Policy'] = (f"default-src 'self'; img-src 'self' data:{gc}; style-src 'self'; "
                                                   f"script-src 'self'{gs}; connect-src 'self'{gc}; frame-ancestors 'none'; "
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
    # HEPGO Merkez (merkez.veilox.app) yönetim çağrıları: yalnız Merkez ile paylaşılan iç anahtar (firmalarda yok)
    cs = os.environ.get('VEILOX_CENTRAL_API_SECRET', '')
    hdr = request.headers.get('x-central-secret', '')
    if cs and hdr and hmac.compare_digest(hdr, cs):
        return 'central'
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
    if not central_host(request):
        raise HTTPException(404, 'Bulunamadı')
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
    # Açık betada fiyat API'den HİÇ gönderilmez (0) → önbellekteki eski arayüz bile fiyat gösteremez.
    return [{'slug': p['slug'], 'name': p['name'], 'description': p['description'],
             'monthly_fee': (0 if OPEN_BETA else p['monthly_fee']), 'mode': p['mode'], 'open_beta': OPEN_BETA,
             'modules': db.package_public(p)['modules']} for p in pkgs]


@app.get('/api/modules')
def modules():
    from . import modules_catalog as _mc
    return [{'key': k, 'title': t, 'group': g, 'tier': _mc.tier(k)} for k, t, g in MODULES]


@app.get('/api/public/site')
def site(request: Request):
    """Tanıtım sayfası: merkez girişi düğmesi yalnız merkez alan adında (veilox.app) gösterilir."""
    return {'central': central_host(request), 'merkez_url': MERKEZ_URL if central_host(request) else None, 'firm_base': FIRM_BASE,
            'email_verify': mailer.enabled(), 'open_beta': OPEN_BETA}


_look = {}   # ip → [zamanlar] (firma adresi sorgusu)
_find_fails = {}   # ip → [zamanlar] (e-posta + şifre ile firma bulma)


def _throttle(store, ip, limit, window):
    now = time.time()
    store[ip] = [t for t in store.get(ip, []) if now - t < window]
    if len(store[ip]) >= limit:
        raise HTTPException(429, 'Çok fazla deneme. Biraz sonra tekrar deneyin.')
    store[ip].append(now)


def _firm_url(c):
    return (c.get('url') or '').strip() or f"https://{c['slug']}.{FIRM_BASE}"


def _firm_state(c):
    """Firma girişinde gösterilecek durum (veri içermez)."""
    st = c.get('status')
    if st == 'active':
        return {'status': 'active', 'url': _firm_url(c) + '/app'}
    if st in ('pending', 'approved', 'provisioning'):
        return {'status': 'pending', 'message': 'Başvurunuz alındı ve inceleniyor. Kurulum tamamlanınca firma adresinizden giriş yapabileceksiniz.'}
    if st == 'offline':
        return {'status': 'offline', 'message': 'Bu firma kendi sunucusunda çalışıyor; kendi sunucu adresinizden giriş yapın.'}
    return {'status': 'unavailable', 'message': 'Bu firma hesabı şu an kullanılamıyor. Lütfen destek ekibimizle iletişime geçin.'}


class LookupIn(BaseModel):
    address: str


@app.post('/api/public/firm-lookup')
def firm_lookup(body: LookupIn, request: Request):
    """Firma girişi: firma adresi (ör. acme ya da acme.hepgo.com) → panel adresi. Ad ya da kişisel bilgi döndürmez."""
    _throttle(_look, _ip(request), 30, 600)
    raw = body.address.strip().lower()
    raw = raw.split('://', 1)[-1].split('/', 1)[0].split('?', 1)[0]
    if not raw or len(raw) > 120:
        raise HTTPException(400, 'Firma adresinizi yazın')
    slug = raw[:-len(FIRM_BASE) - 1] if raw.endswith('.' + FIRM_BASE) else (raw if '.' not in raw else None)
    with db.connect() as conn:
        c = db.row(conn, 'SELECT slug, url, status FROM companies WHERE slug=?', (provision.slugify(slug),)) if slug else None
        if not c:
            for r in db.rows(conn, 'SELECT slug, url, status FROM companies WHERE url != ""'):
                host = (r['url'] or '').split('://', 1)[-1].split('/', 1)[0].lower()
                if host and host in (raw, 'www.' + raw):
                    c = r
                    break
    if not c:
        raise HTTPException(404, 'Bu adreste kayıtlı bir firma bulunamadı. Adresi kontrol edin ya da e-postanızla arayın.')
    return _firm_state(c)


class FindIn(BaseModel):
    email: str
    password: str


@app.post('/api/public/firm-find')
def firm_find(body: FindIn, request: Request):
    """Adresini hatırlamayan firma yöneticisi: kayıt e-postası + şifresiyle firmasını (ve başvuru durumunu) bulur."""
    ip = _ip(request)
    now = time.time()
    _find_fails[ip] = [t for t in _find_fails.get(ip, []) if now - t < LOCK_SECONDS]
    if len(_find_fails[ip]) >= LOCK_AFTER:
        raise HTTPException(429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.')
    email = body.email.strip().lower()
    with db.connect() as conn:
        rows = db.rows(conn, 'SELECT slug, name, url, status, master_password_hash, created_at FROM companies WHERE lower(master_username)=?', (email,))
    found = [r for r in rows if r.get('master_password_hash') and verify_password(body.password, r['master_password_hash'])]
    if not found:
        _find_fails[ip].append(now)
        time.sleep(0.6)
        raise HTTPException(401, 'E-posta ya da şifre hatalı. Şifrenizi firma panelinizde değiştirdiyseniz destek ekibimizle iletişime geçin.')
    _find_fails.pop(ip, None)
    return {'firms': [{'name': r['name'], 'created_at': r['created_at'], **_firm_state(r)} for r in found]}


@app.get('/api/public/slug-preview')
def slug_preview(name: str = ''):
    base = provision.slugify(name)[:40].strip('-') or 'firma'
    with db.connect() as conn:
        slug = _unique_slug(conn, base)
    return {'slug': slug, 'domain': f'{slug}.{FIRM_BASE}'}


RESERVED_SLUGS = {'www', 'api', 'app', 'master', 'merkez', 'veilox', 'caymaz', 'gokkubbe', 'turkbey',
                  'admin', 'mail', 'static', 'cdn', 'support', 'destek', 'hepgo', 'panel', 'kur'}


def _slug_valid(s):
    import re
    return bool(s) and 3 <= len(s) <= 40 and bool(re.fullmatch(r'[a-z0-9]([a-z0-9-]*[a-z0-9])?', s)) and '--' not in s


def _slug_status(conn, raw):
    """Kullanıcının seçtiği firma adresini normalize edip uygunluğunu döner."""
    s = provision.slugify(raw or '')[:40].strip('-')
    if not _slug_valid(s):
        return {'ok': False, 'slug': s, 'reason': 'Adres 3–40 karakter; küçük harf, rakam ve tire içerebilir.'}
    if s in RESERVED_SLUGS:
        return {'ok': False, 'slug': s, 'reason': 'Bu adres ayrılmış; başka bir adres seçin.'}
    taken = conn.execute("SELECT 1 FROM companies WHERE slug=? AND status IN ('pending','approved','provisioning','active','offline')", (s,)).fetchone()
    if taken:
        return {'ok': False, 'slug': s, 'reason': 'Bu adres alınmış; başka bir adres seçin.'}
    return {'ok': True, 'slug': s, 'domain': f'{s}.{FIRM_BASE}'}


@app.get('/api/public/slug-check')
def slug_check(slug: str = ''):
    """Firma adresi (subdomain) uygun mu? Kullanıcı yazdıkça kontrol edilir."""
    with db.connect() as conn:
        return _slug_status(conn, slug)


LOGO_MAX_BYTES = 2 * 1024 * 1024   # 2 MB
_LOGO_EXT = {'png': 'png', 'jpeg': 'jpg', 'jpg': 'jpg', 'webp': 'webp', 'gif': 'gif'}


def _save_firm_logo(slug, data_uri):
    """Kayıt sihirbazından gelen logoyu (data URI) merkez diskine kaydeder; (yol) döner. Kurallı: tür + boyut."""
    import base64
    import re
    m = re.match(r'data:image/([a-z+]+);base64,(.+)$', (data_uri or '').strip(), re.I | re.S)
    if not m:
        raise HTTPException(400, 'Logo PNG, JPG, WEBP veya GIF olmalı')
    ext = _LOGO_EXT.get(m.group(1).lower())
    if not ext:
        raise HTTPException(400, 'Logo PNG, JPG, WEBP veya GIF olmalı (SVG desteklenmez)')
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except Exception:
        raise HTTPException(400, 'Logo dosyası çözülemedi')
    if not raw or len(raw) > LOGO_MAX_BYTES:
        raise HTTPException(400, 'Logo en fazla 2 MB olmalı')
    d = db.DATA_DIR / 'firm-logos'
    d.mkdir(parents=True, exist_ok=True)
    path = d / f'{slug}.{ext}'
    path.write_bytes(raw)
    return str(path)


def _single_line(body, *fields):
    """Kurulumda .env / systemd birimine yazılan alanlar tek satır olmalı (satır sonuyla yeni ayar eklenemesin)."""
    for f in fields:
        if provision.has_ctrl(getattr(body, f, '')):
            raise HTTPException(400, 'Alanlarda satır sonu veya kontrol karakteri kullanılamaz')


class RegisterIn(BaseModel):
    company_name: str
    master_username: str
    master_name: str = ''
    password: str
    package_slug: str = ''
    phone: str = ''
    tax_no: str = ''
    city: str = ''
    accept: bool = True
    email_code: str = ''        # e-posta doğrulama kodu (SMTP yapılandırıldıysa zorunlu)
    slug: str = ''              # kullanıcının seçtiği firma adresi (boşsa firma adından üretilir)
    country: str = ''           # ülke kodu (ör. TR)
    logo: str = ''              # data URI (base64) — isteğe bağlı firma logosu (kurallı)
    lang: str = ''              # kayıt dili (tr/en/de/fr/es/ar/ru) → master kullanıcının ERP varsayılan dili olur
    firm_type: str = 'kobi'     # 'kobi' (modül seçimli) | 'esnaf' (hazır paketler) | 'dron' (Dron paketi)
    modules: list = []          # KOBİ: seçilen OPSİYONEL modüller (zorunlular otomatik eklenir; merkez modülleri hariç)
    esnaf_pkg: str = ''         # ESNAF: paket (bakkal/berber/lokanta) → modül seti pakete göre belirlenir


class SendCodeIn(BaseModel):
    email: str


class VerifyCodeIn(BaseModel):
    email: str
    code: str = ''


_code_reg = {}                     # ip → [zamanlar] (kod gönderimi)
CODE_LIMIT, CODE_WINDOW = 6, 3600  # saatte en çok 6 kod / IP
CODE_TTL = 600                     # kod 10 dk geçerli


def _code_expiry():
    from datetime import datetime, timedelta
    return (datetime.now() + timedelta(seconds=CODE_TTL)).strftime('%Y-%m-%dT%H:%M:%S')


@app.post('/api/register/send-code')
def register_send_code(body: SendCodeIn, request: Request):
    """Kayıt için girilen e-postaya 6 haneli doğrulama kodu gönderir (Zoho SMTP). SMTP yoksa 503."""
    if not mailer.enabled():
        raise HTTPException(503, 'E-posta doğrulama henüz yapılandırılmadı.')
    _single_line(body, 'email')
    email = body.email.strip().lower()
    if '@' not in email or len(email) < 5:
        raise HTTPException(400, 'Geçerli bir e-posta girin')
    ip = _ip(request)
    now = time.time()
    _code_reg[ip] = [t for t in _code_reg.get(ip, []) if now - t < CODE_WINDOW]
    if len(_code_reg[ip]) >= CODE_LIMIT:
        raise HTTPException(429, 'Çok fazla kod isteği. Daha sonra tekrar deneyin.')
    from datetime import datetime
    code = f'{secrets.randbelow(1000000):06d}'
    with db.connect() as conn:
        r = db.row(conn, 'SELECT sent_at FROM email_codes WHERE email=?', (email,))
        if r and r['sent_at']:
            try:
                if (datetime.now() - datetime.fromisoformat(r['sent_at'])).total_seconds() < 50:
                    raise HTTPException(429, 'Kod az önce gönderildi; lütfen e-postanızı kontrol edin.')
            except (TypeError, ValueError):
                pass
        conn.execute('INSERT OR REPLACE INTO email_codes(email, code_hash, expires_at, attempts, sent_at) VALUES(?,?,?,?,?)',
                     (email, make_hash(code), _code_expiry(), 0, db.now()))
        conn.commit()
    try:
        mailer.send_code(email, code)
    except Exception:   # noqa: BLE001
        raise HTTPException(502, 'E-posta gönderilemedi. Adresi kontrol edin ya da biraz sonra tekrar deneyin.')
    _code_reg[ip].append(now)
    m = email.split('@')
    masked = (m[0][:2] + '***@' + m[1]) if len(m) == 2 else email
    return {'ok': True, 'sent_to': masked}


def _check_code(conn, email, code):
    """Kodu doğrular (silmez). True=geçerli. Hata → HTTPException."""
    from datetime import datetime
    r = db.row(conn, 'SELECT code_hash, expires_at, attempts FROM email_codes WHERE email=?', (email,))
    if not r:
        raise HTTPException(400, 'Önce e-posta doğrulama kodunu alın.')
    try:
        if datetime.now() > datetime.fromisoformat(r['expires_at']):
            conn.execute('DELETE FROM email_codes WHERE email=?', (email,))
            conn.commit()
            raise HTTPException(400, 'Doğrulama kodunun süresi doldu. Yeni kod isteyin.')
    except (TypeError, ValueError):
        pass
    if (r['attempts'] or 0) >= 5:
        conn.execute('DELETE FROM email_codes WHERE email=?', (email,))
        conn.commit()
        raise HTTPException(429, 'Çok fazla hatalı deneme. Yeni kod isteyin.')
    if not verify_password((code or '').strip(), r['code_hash']):
        conn.execute('UPDATE email_codes SET attempts=attempts+1 WHERE email=?', (email,))
        conn.commit()
        raise HTTPException(400, 'Doğrulama kodu hatalı.')
    return True


def _verify_email_code(conn, email, code):
    """Kayıt sırasında e-posta doğrulamasını zorunlu kılar. Modal'da önceden doğrulandıysa (verified_at)
    kod istemeden kabul eder; aksi halde kodu doğrular. Her iki durumda satırı siler. True/HTTPException."""
    from datetime import datetime
    pre = db.row(conn, 'SELECT verified_at, expires_at FROM email_codes WHERE email=?', (email,))
    if pre and pre.get('verified_at'):
        # Modal akışı: kod zaten doğrulanmış; şifre adımında tekrar kod istemeyiz
        conn.execute('DELETE FROM email_codes WHERE email=?', (email,))
        return True
    _check_code(conn, email, code)
    conn.execute('DELETE FROM email_codes WHERE email=?', (email,))
    return True


@app.post('/api/register/verify-code')
def register_verify_code(body: VerifyCodeIn, request: Request):
    """Modal akışı: pin'i şifre adımından ÖNCE doğrular. Satırı silmez, verified_at işaretler →
    sonraki /api/register çağrısı kod istemeden kabul eder (şifre o adımda alınır)."""
    _single_line(body, 'email', 'code')
    email = body.email.strip().lower()
    with db.connect() as conn:
        _check_code(conn, email, body.code)
        conn.execute('UPDATE email_codes SET verified_at=?, attempts=0 WHERE email=?', (db.now(), email))
        conn.commit()
    return {'ok': True, 'verified': True}


@app.post('/api/register')
def register(body: RegisterIn, request: Request, background: BackgroundTasks):
    ip = _ip(request)
    now = time.time()
    _reg[ip] = [t for t in _reg.get(ip, []) if now - t < REG_WINDOW]
    if len(_reg[ip]) >= REG_LIMIT:
        raise HTTPException(429, 'Çok fazla kayıt denemesi. Daha sonra tekrar deneyin.')
    _single_line(body, 'company_name', 'master_username', 'master_name', 'password', 'phone', 'tax_no', 'city')
    name = body.company_name.strip()
    user = body.master_username.strip().lower()
    if len(name) < 2:
        raise HTTPException(400, 'Firma adı gerekli')
    if '@' not in user or len(user) < 5:
        raise HTTPException(400, 'Geçerli bir e-posta girin')
    if len(body.password) < 10:
        raise HTTPException(400, 'Şifre en az 10 karakter olmalı')
    if not body.accept:
        raise HTTPException(400, 'Devam etmek için başvuru koşullarını onaylayın')
    with db.connect() as conn:
        # Aynı e-posta ile zaten bir firma varsa TEKRAR OLUŞTURMA (idempotent) — özellikle çift tıklama/yeniden
        # göndermede: kuruluysa doğrudan giriş yanıtı döneriz (400 "kodu alın" hatası yerine).
        exist = db.row(conn, "SELECT * FROM companies WHERE lower(master_username)=? "
                             "AND status IN ('pending','approved','provisioning','active','error') ORDER BY id DESC LIMIT 1", (user,))
        if exist:
            if exist['status'] == 'active':
                ec = db.company_public(exist)
                return {'ok': True, 'application_no': f"B-{exist['id']:05d}", 'domain': f"{exist['slug']}.{FIRM_BASE}",
                        'package': None, 'status': 'active', 'url': _firm_url(ec) + '/app',
                        'message': 'Bu e-posta ile firmanız zaten kurulu. Giriş yapabilirsiniz.'}
            raise HTTPException(409, 'Bu e-posta ile bir başvurunuz zaten var. Durumunu “Firma girişi” ekranından sorgulayabilirsiniz.')
        verified = 0
        if mailer.enabled():   # SMTP yapılandırıldıysa e-posta doğrulaması ZORUNLU
            _verify_email_code(conn, user, body.email_code)
            verified = 1
        pkg_row = db.row(conn, 'SELECT * FROM packages WHERE slug=? AND visible=1', (body.package_slug,)) \
            if body.package_slug else None
        if OPEN_BETA:
            # Açık beta: ücretsiz. KOBİ kaydında firma SEÇTİĞİ modüllerle açılır (zorunlu + seçilen opsiyonel;
            # merkez modülleri hariç). Seçim yoksa (eski akış / esnaf) tüm modüller verilir (geri uyumluluk).
            pkg_row = pkg_row or db.row(conn, "SELECT * FROM packages WHERE slug='kurumsal'") \
                or db.row(conn, 'SELECT * FROM packages ORDER BY sort, id LIMIT 1')
            ft = body.firm_type or 'kobi'
            if ft == 'esnaf':
                pkg = (body.esnaf_pkg or 'bakkal').strip().lower()
                if pkg not in ESNAF_PKGS:
                    pkg = 'bakkal'
                mods = esnaf_modules(pkg)                       # esnaf: pakete göre modül seti (bakkal/berber/lokanta)
            elif ft == 'dron':
                mods = drone_modules()                          # Dron paketi: sabit modül seti (Dron Yönetimi yalnız burada)
            elif body.modules:
                mods = kobi_modules(body.modules)              # KOBİ: zorunlu + seçilen opsiyonel
            else:
                mods = list(MODULE_KEYS)                        # eski akış: tüm modüller (geri uyumluluk)
            mode = 'online'
            fee = 0
            wl = 0
        else:
            mods = db.package_public(pkg_row)['modules'] if pkg_row else []
            mode = (pkg_row['mode'] if pkg_row else 'online')
            if mode == 'both':
                mode = 'online'
            fee = pkg_row['monthly_fee'] if pkg_row else 0
            wl = int(pkg_row['white_label']) if pkg_row else 0
        # Firma adresi: kullanıcı kendi seçtiyse doğrula + benzersizleştir, yoksa firma adından üret
        if body.slug.strip():
            st = _slug_status(conn, body.slug)
            if not st['ok']:
                raise HTTPException(409, st['reason'])
            slug = st['slug']
        else:
            slug = _unique_slug(conn, provision.slugify(name))
        country = (body.country or '').strip()[:2].upper() or None
        logo_path = _save_firm_logo(slug, body.logo) if body.logo.strip() else None   # kurallı (tür+2MB)
        _reg[ip].append(now)
        _ftype = body.firm_type if body.firm_type in ('esnaf', 'dron') else 'kobi'
        cur = conn.execute(
            'INSERT INTO companies(slug,name,package_id,mode,modules,firm_type,white_label,master_username,master_name,'
            'master_password_hash,master_secret,monthly_fee,status,self_registered,phone,tax_no,city,country,logo,email_verified,created_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (slug, name, (pkg_row['id'] if pkg_row else None), mode, _j(mods), _ftype, wl,
             user, body.master_name.strip(), make_hash(body.password), body.password, fee,
             'pending', 1, body.phone.strip()[:40] or None, body.tax_no.strip()[:20] or None,
             body.city.strip()[:60] or None, country, logo_path, verified, db.now()))
        conn.commit()
        cid = cur.lastrowid
        # Açık beta: sistem yöneticisi onayı YOK → kayıt biter bitmez firma otomatik kurulur ve
        # kullanıcı doğrudan sisteme girebilir. (Beta dışında klasik "başvuru → onay" akışı.)
        if OPEN_BETA and mode != 'offline':
            try:
                c = db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,)))
                c['master_secret'] = body.password          # provisioning için düz şifre
                _lang = (body.lang or '').strip().lower()   # kayıt dili → master'ın ERP varsayılan dili
                c['lang'] = _lang if _lang in ('tr', 'en', 'de', 'fr', 'es', 'ar', 'ru') else ''
                if _ftype == 'esnaf':                        # esnaf paketi → tenant CAYMAZ_ESNAF_PKG (Bölümler/Garson UI)
                    _pkg = (body.esnaf_pkg or 'bakkal').strip().lower()
                    c['esnaf_pkg'] = _pkg if _pkg in ESNAF_PKGS else 'bakkal'
                # Cloudflared reload'u BURADA yapma: reload (SIGHUP) bu register isteğinin KENDİ cloudflared
                # bağlantısını kesip firma kurulsa bile tarayıcıda yanlış "Hata" gösteriyordu. Reload'u HTTP
                # yanıtı gönderildikten SONRA (BackgroundTask) tetikliyoruz → yanıt sağlam döner, subdomain
                # birkaç saniye içinde yayına girer.
                ok, detail = provision.provision_online(conn, c, do_reload=False)
                if ok:
                    from . import cloudflare as _cf
                    background.add_task(_cf.reload_tunnel)   # tünel tazeleme: yanıttan sonra, kesintisiz
                    return {'ok': True, 'application_no': f'B-{cid:05d}',
                            'domain': f'{slug}.{FIRM_BASE}', 'package': pkg_row['name'] if pkg_row else None,
                            'status': 'active', 'url': (detail.get('url') or _firm_url(c)) + '/app',
                            'message': 'Firmanız hazır! Giriş yapabilirsiniz.'}
            except Exception as e:
                import traceback; traceback.print_exc()
                print(f'[register] open-beta otomatik kurulum başarısız (cid={cid}): {e}', flush=True)
            # Kurulum anında tamamlanamazsa başvuru bekliyor olarak kalır (arka planda tamamlanır)
    return {'ok': True, 'application_no': f'B-{cid:05d}', 'domain': f'{slug}.{FIRM_BASE}', 'package': pkg_row['name'] if pkg_row else None,
            'message': 'Başvurunuz alındı. Onaylandığında firmanız kurulacak ve giriş adresiniz e-postanıza iletilecek.'}


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


BETA_SEATS_TOTAL = 100

@app.get('/api/beta/seats')
def beta_seats():
    """Herkese açık: beta koltuk sayacı (toplam 100, kayıtlı firma sayısı düşülür)."""
    with db.connect() as conn:
        taken = int(db.row(conn, 'SELECT COUNT(*) AS c FROM companies')['c'])
    left = max(0, BETA_SEATS_TOTAL - taken)
    return {'total': BETA_SEATS_TOTAL, 'taken': taken, 'left': left}


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
    _single_line(body, 'name', 'master_username', 'master_name', 'url', 'password')
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
    _single_line(body, 'name', 'master_username', 'master_name', 'url', 'password')
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
    """Firmayı siler + OTOMATİK DEPROVISION: servis kaldırılır, soket + Cloudflare ingress/DNS temizlenir
    (cloudflared reload — kesintisiz). Veri klasörü KORUNUR (elle silinir). Çekirdek firmalar (gokkubbe/turkbey…) korunur."""
    current(request)
    detail = {}
    with db.connect() as conn:
        c = db.company_public(db.row(conn, 'SELECT * FROM companies WHERE id=?', (cid,)) or {})
        if c and c.get('slug') and c['slug'] not in RESERVED_SLUGS:
            try:
                _, detail = provision.deprovision(conn, c)   # servis + soket + ingress/DNS (veri korunur)
            except Exception as e:   # noqa: BLE001 — deprovision hatası silmeyi engellemesin
                detail = {'deprovision_error': str(e)}
        conn.execute('DELETE FROM companies WHERE id=?', (cid,))
        conn.commit()
    return {'ok': True, 'deprovisioned': detail}


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
def index(lang: str = ''):
    # Ana sayfa: tanıtım (static/exp2) — SEO etiketleri dile göre sunucuda eklenir (veilox/seo.py); yoksa emergent landing'e düş.
    exp = STATIC / 'exp2' / 'index.html'
    if not exp.exists():
        return FileResponse(STATIC / 'landing.html')
    from . import seo
    return HTMLResponse(seo.render(exp.read_text(encoding='utf-8'), lang, STATIC / 'exp2' / 'i18n'), headers={'Cache-Control': 'no-cache'})


@app.get('/robots.txt')
def robots_txt():
    from . import seo
    return Response(seo.robots(), media_type='text/plain', headers={'Cache-Control': 'public, max-age=3600'})


@app.get('/sitemap.xml')
def sitemap_xml():
    from . import seo
    return Response(seo.sitemap(), media_type='application/xml', headers={'Cache-Control': 'public, max-age=3600'})


@app.get('/platform')
def platform_page():
    land = STATIC / 'landing.html'
    return FileResponse(land if land.exists() else STATIC / 'index.html')


@app.get('/panel')
def panel(request: Request):
    if not central_host(request):   # hepgo.com'da merkez paneli yok
        return RedirectResponse('/giris', status_code=307)
    return FileResponse(STATIC / 'index.html')


@app.get('/giris')
def firm_login_page():
    return FileResponse(STATIC / 'giris.html')


@app.get('/kur/{token}')
def kur_page(token: str):
    return FileResponse(STATIC / 'kur.html')


# Herkese açık yasal sayfalar (kayıt ekranından linklenir; 7 dil, legal.js kullanıcının dilinde açar).
import html as _htmlmod   # noqa: E402
_LEGAL_VALS = {'DATE': '16 Ekim 2026', 'PROVIDER': 'GÖKKUBBE Teknoloji', 'EMAIL': 'destek@gokkubbetech.com', 'HOST': 'HEPGO'}


def _legal_page(name):
    html = (STATIC / 'legal' / f'{name}.html').read_text(encoding='utf-8')
    for k, v in _LEGAL_VALS.items():
        html = html.replace('{{' + k + '}}', _htmlmod.escape(v))
    return HTMLResponse(html, headers={'Cache-Control': 'public, max-age=3600'})


@app.get('/gizlilik')
@app.get('/privacy')
def privacy_page():
    return _legal_page('privacy')


@app.get('/kullanim-sartlari')
@app.get('/terms')
def terms_page():
    return _legal_page('terms')


@app.get('/beta-sozlesmesi')
@app.get('/beta-agreement')
def beta_agreement_page():
    return _legal_page('beta')


# --- Federasyon: müşteri ERP instance'larının merkez destek girişini doğrulaması ---
# Müşteri ERP'si, giriş ekranından gelen merkez destek kullanıcısını buraya sorar (paylaşılan anahtarla korunur).
# Merkez tek yönetici hesabıyla (VEILOX_USERNAME / PASSWORD_HASH) doğrular; geçerliyse kimliğini döner.
_FED_SECRET = os.environ.get('CAYMAZ_FEDERATION_SECRET', '')


@app.post('/api/federation/verify')
def federation_verify(body: LoginIn, request: Request):
    secret = request.headers.get('x-fed-secret', '')
    if not _FED_SECRET or not hmac.compare_digest(secret, _FED_SECRET):
        raise HTTPException(403, 'Yetkisiz')
    ok = (USERNAME and PASSWORD_HASH and hmac.compare_digest(body.username.strip().lower(), USERNAME)
          and verify_password(body.password, PASSWORD_HASH))
    if not ok:
        return {'ok': False}
    return {'ok': True, 'username': USERNAME, 'full_name': os.environ.get('VEILOX_FULL_NAME', 'Veilox Destek')}
