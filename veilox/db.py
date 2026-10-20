"""Veilox merkez veritabanı (data/central.db).

Merkez YALNIZCA kendi kayıtlarını tutar: paketler (vitrin), firmalar (provision edilmiş tenant'lar) ve
self-servis kayıt talepleri. Tenant (firma) veritabanlarına ASLA erişmez — KVKK gereği veri izolasyonu.
Stdlib sqlite3; düz şifre kalıcı saklanmaz (yalnızca provisioning anına kadar geçici master_secret).
"""
import json
import os
import sqlite3
import time
from pathlib import Path
from . import settings
settings.load()   # .env, aşağıdaki ayarlar okunmadan önce (bkz. settings.py)

BASE = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get('VEILOX_DATA_DIR', BASE / 'data'))
DB_PATH = DATA_DIR / 'central.db'


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%S')


def connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        os.chmod(DB_PATH, 0o600)   # tek kullanıcı; düz master_secret geçici de olsa korunur
    except OSError:
        pass
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    modules TEXT NOT NULL DEFAULT '[]',   -- JSON modül anahtarları
    monthly_fee REAL NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'online',  -- online | offline | both
    visible INTEGER NOT NULL DEFAULT 1,   -- tanıtım sayfasında görünür
    white_label INTEGER NOT NULL DEFAULT 0,  -- firma kendi markası/domaini (HEPGO görünmez)
    sort INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    url TEXT DEFAULT '',
    port INTEGER,
    socket TEXT,
    data_dir TEXT,
    app_dir TEXT,
    brand_dir TEXT,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    mode TEXT NOT NULL DEFAULT 'online',  -- online | offline
    modules TEXT NOT NULL DEFAULT '[]',
    firm_type TEXT NOT NULL DEFAULT 'kobi',  -- kobi | esnaf | dron (kayıtta seçilen firma tipi)
    white_label INTEGER NOT NULL DEFAULT 0,
    master_username TEXT NOT NULL,
    master_name TEXT DEFAULT '',
    master_password_hash TEXT DEFAULT '',  -- merkez kaydı (PBKDF2); doğrulama için
    master_secret TEXT,                    -- GEÇİCİ düz şifre; provisioning sonrası NULL'lanır
    monthly_fee REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',-- pending|approved|provisioning|active|suspended|offline|error
    service_name TEXT DEFAULT '',
    self_registered INTEGER NOT NULL DEFAULT 0,
    note TEXT DEFAULT '',
    error TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    provisioned_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);

CREATE TABLE IF NOT EXISTS download_tokens (
    token TEXT PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    downloaded_at TEXT
);

-- Kayıt e-posta doğrulama kodları (6 haneli, 10 dk geçerli; e-posta başına tek kayıt)
CREATE TABLE IF NOT EXISTS email_codes (
    email      TEXT PRIMARY KEY,
    code_hash  TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    sent_at    TEXT NOT NULL,
    verified_at TEXT
);
"""


def init():
    with connect() as conn:
        conn.executescript(SCHEMA)
        # Mevcut central.db için eksik sütun migrasyonu (soket)
        cols = [r[1] for r in conn.execute('PRAGMA table_info(companies)')]
        if 'socket' not in cols:
            conn.execute('ALTER TABLE companies ADD COLUMN socket TEXT')
        if 'white_label' not in cols:
            conn.execute('ALTER TABLE companies ADD COLUMN white_label INTEGER NOT NULL DEFAULT 0')
        for col in ('phone', 'tax_no', 'city', 'country', 'logo'):   # self-kayıt: iletişim/fatura + ülke + logo yolu
            if col not in cols:
                conn.execute(f'ALTER TABLE companies ADD COLUMN {col} TEXT')
        if 'email_verified' not in cols:           # kayıtta e-posta doğrulandı mı
            conn.execute('ALTER TABLE companies ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0')
        if 'firm_type' not in cols:                # kayıtta seçilen firma tipi (kobi | esnaf)
            conn.execute("ALTER TABLE companies ADD COLUMN firm_type TEXT NOT NULL DEFAULT 'kobi'")
        ecols = [r[1] for r in conn.execute('PRAGMA table_info(email_codes)')]
        if 'verified_at' not in ecols:             # kod modal'da doğrulandıysa (şifre adımından önce)
            conn.execute('ALTER TABLE email_codes ADD COLUMN verified_at TEXT')
        pcols = [r[1] for r in conn.execute('PRAGMA table_info(packages)')]
        if 'white_label' not in pcols:
            conn.execute('ALTER TABLE packages ADD COLUMN white_label INTEGER NOT NULL DEFAULT 0')
        conn.commit()
        _seed_packages(conn)
        _migrate_tenants(conn)
        conn.commit()


def _seed_packages(conn):
    if conn.execute('SELECT COUNT(*) FROM packages').fetchone()[0]:
        return
    from .modules_catalog import MODULE_KEYS, CORE_MODULES
    uretim = CORE_MODULES + ['production', 'orders', 'printers', 'products', 'stock', 'warehouse', 'tools', 'reports']
    defaults = [
        ('baslangic', 'Başlangıç', 'Küçük ekipler için çekirdek yönetim modülleri.',
         CORE_MODULES + ['tools', 'reports', 'documents'], 1500, 'online', 1, 10),
        ('uretim', 'Üretim', 'Üretim, iş emri, yazıcı ve stok yönetimi.',
         uretim, 3500, 'online', 1, 20),
        ('kurumsal', 'Kurumsal', 'Tüm modüller — fabrikanın tamamı.',
         MODULE_KEYS, 6500, 'both', 1, 30),
        ('offline-kurumsal', 'Offline Kurumsal', 'Tüm modüller, kendi sunucunuza kurulum (Windows/Linux).',
         MODULE_KEYS, 9500, 'offline', 1, 40),
    ]
    for slug, name, desc, mods, fee, mode, vis, sort in defaults:
        conn.execute('INSERT INTO packages(slug,name,description,modules,monthly_fee,mode,visible,sort,created_at) '
                     'VALUES(?,?,?,?,?,?,?,?,?)',
                     (slug, name, desc, json.dumps(mods), fee, mode, vis, sort, now()))


def _migrate_tenants(conn):
    """Mevcut tenants.json firmalarını (GÖKKUBBE, Türkbey) merkez kaydına taşır — yalnızca üstveri, veri DEĞİL."""
    tfile = Path(os.environ.get('VEILOX_TENANTS', BASE / 'tenants.json'))
    if not tfile.exists():
        return
    from .modules_catalog import MODULE_KEYS
    try:
        tenants = json.loads(tfile.read_text(encoding='utf-8'))
    except (ValueError, OSError):
        return
    master_env = os.environ.get('CAYMAZ_MASTER_USERNAME', 'mkaderoglu@gokkubbetech.com')
    for t in tenants:
        slug = t.get('id')
        if not slug or conn.execute('SELECT 1 FROM companies WHERE slug=?', (slug,)).fetchone():
            continue
        conn.execute(
            'INSERT INTO companies(slug,name,url,data_dir,app_dir,brand_dir,mode,modules,master_username,'
            'master_name,status,self_registered,note,created_at,provisioned_at) '
            'VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (slug, t.get('name', slug), t.get('url', ''), t.get('data_dir'), t.get('app_dir'),
             t.get('brand_dir'), 'online', json.dumps(MODULE_KEYS),
             master_env.split(',')[0].strip(), 'Sistem Sahibi', 'active', 0,
             'tenants.json üzerinden taşındı', now(), now()))


# ---------- yardımcılar
def rows(conn, sql, args=()):
    return [dict(r) for r in conn.execute(sql, args)]


def row(conn, sql, args=()):
    r = conn.execute(sql, args).fetchone()
    return dict(r) if r else None


def company_public(c):
    """Firma kaydının herkese/panele açık hâli (sırlar çıkarılır)."""
    c = dict(c)
    c.pop('master_secret', None)
    c.pop('master_password_hash', None)
    for k in ('modules',):
        if isinstance(c.get(k), str):
            try:
                c[k] = json.loads(c[k])
            except ValueError:
                c[k] = []
    return c


def package_public(p):
    p = dict(p)
    if isinstance(p.get('modules'), str):
        try:
            p['modules'] = json.loads(p['modules'])
        except ValueError:
            p['modules'] = []
    return p
