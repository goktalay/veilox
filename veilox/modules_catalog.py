"""Fabrika Yönetim Sistemi modül katalogu — merkez (Veilox) tarafında paket/firma modül seçimi için.

Tenant uygulamasındaki (caymazbuild) app/auth.py MODULE_ROLES anahtarları ve static/js/app.js MODULES
başlıkları ile BİREBİR uyumlu tutulur. Merkez bir firmaya hangi modüllerin verileceğini buradan seçer;
seçim, provisioning sırasında tenant .env dosyasına CAYMAZ_MODULES olarak yazılır.
"""

# (anahtar, görünen ad, grup) — grup yalnızca arayüzde gruplama içindir.
MODULES = [
    ('admin',        'Yönetim',               'sistem'),
    ('users',        'Kullanıcı Yönetimi',    'sistem'),
    ('announcements','Duyurular',             'sistem'),
    ('reports',      'Raporlar',              'sistem'),
    ('tools',        'Araçlar',               'sistem'),
    ('production',   'Üretim Yönetimi',       'üretim'),
    ('orders',       'İş Emri Yönetimi',      'üretim'),
    ('printers',     'Yazıcı Yönetimi',       'üretim'),
    ('products',     'Ürün Yönetimi',         'üretim'),
    ('mrp',          'MRP',                   'üretim'),
    ('design',       'Endüstriyel Tasarım',   'üretim'),
    ('warehouse',    'Depo Yönetimi',         'depo'),
    ('stock',        'Stok',                  'depo'),
    ('purchasing',   'Satın Alma',            'depo'),
    ('field',        'Saha Yönetimi',         'saha'),
    ('companies',    'Firma Yönetimi (CRM)',  'crm'),
    ('sales',        'Satış Yönetimi',        'crm'),
    ('secretariat',  'Sekreterya',            'crm'),
    ('documents',    'Evrak Yönetimi',        'ofis'),
    ('hr',           'İnsan Kaynakları',      'ofis'),
    ('security',     'Güvenlik',              'ofis'),
    ('cleaning',     'Temizlik',              'ofis'),
    ('mikro',        'Mikro ERP (entegrasyon)', 'ofis'),
]

MODULE_KEYS = [m[0] for m in MODULES]
MODULE_TITLES = {m[0]: m[1] for m in MODULES}

# Sistem yönetilebilsin diye önerilen çekirdek modüller (seçilebilir ama varsayılan açık).
CORE_MODULES = ['admin', 'users', 'announcements']


def valid_modules(keys):
    """Verilen listeden yalnızca geçerli modül anahtarlarını, katalog sırasıyla döndürür."""
    s = set(keys or [])
    return [k for k in MODULE_KEYS if k in s]
