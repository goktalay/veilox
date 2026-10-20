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
    ('drone',        'Dron Yönetimi',         'saha'),
    ('companies',    'Firma Yönetimi (CRM)',  'crm'),
    ('sales',        'Satış Yönetimi',        'crm'),
    ('secretariat',  'Sekreterya',            'crm'),
    ('documents',    'Evrak Yönetimi',        'ofis'),
    ('hr',           'İnsan Kaynakları',      'ofis'),
    ('security',     'Güvenlik',              'ofis'),
    ('cleaning',     'Temizlik',              'ofis'),
    ('finance',      'Finans / Ön Muhasebe',  'ofis'),
    ('mikro',        'Mikro ERP (entegrasyon)', 'ofis'),
    ('projects',     'Proje Yönetimi',        'ofis'),
    ('boss',         'Patron',                'ofis'),
    ('rehber',       'Rehber',                'crm'),
    ('certs',        'Sertifikasyon',         'ofis'),
    ('fleet',        'Araç Yönetimi',         'saha'),
    ('cameras',      'Kameralar',             'ofis'),
    ('pos',          'Esnaf Kasa',            'esnaf'),
    ('sections',     'Bölümler',              'esnaf'),
    ('services',     'Hizmetler',             'esnaf'),
    ('reservations', 'Rezervasyon',           'esnaf'),
    ('waiter',       'Garson',                'esnaf'),
]

MODULE_KEYS = [m[0] for m in MODULES]
MODULE_TITLES = {m[0]: m[1] for m in MODULES}

# Sistem yönetilebilsin diye önerilen çekirdek modüller (seçilebilir ama varsayılan açık).
CORE_MODULES = ['admin', 'users', 'announcements']

# Modül katmanları (tenant app/modules_tier.py ile BİREBİR senkron):
# required = KOBİ firmada her zaman açık; optional = kayıtta/sonradan seçilir; central = yalnız merkez açar.
REQUIRED = {'admin', 'users', 'mrp', 'stock', 'warehouse', 'purchasing', 'sales', 'companies', 'documents', 'hr', 'finance'}
OPTIONAL = {'boss', 'production', 'orders', 'printers', 'products', 'design', 'field', 'certs', 'fleet', 'projects',
            'secretariat', 'security', 'rehber', 'reports', 'announcements', 'cleaning', 'tools', 'pos',
            'sections', 'services', 'reservations', 'waiter'}
CENTRAL = {'cameras', 'mikro', 'factory', 'konum', 'sms'}
PACKAGE = {'drone'}   # yalnız Dron paketinde gelir (KOBİ modül seçiminde görünmez); tenant modules_tier.PACKAGE ile aynı


def tier(key):
    k = (key or '').split('.')[0]
    if k in REQUIRED:
        return 'required'
    if k in CENTRAL:
        return 'central'
    if k in PACKAGE:
        return 'package'
    return 'optional'


def kobi_modules(selected):
    """KOBİ kaydı: zorunlu modüller + seçilen (geçerli) opsiyonel modüller. Merkez (central) modüller DAHİL EDİLMEZ."""
    sel = {k for k in (selected or []) if k in OPTIONAL}
    keep = REQUIRED | sel
    return [k for k in MODULE_KEYS if k in keep]


def valid_modules(keys):
    """Verilen listeden yalnızca geçerli modül anahtarlarını, katalog sırasıyla döndürür."""
    s = set(keys or [])
    return [k for k in MODULE_KEYS if k in s]


# Esnaf paketleri (firm_type='esnaf'): İK gibi ağır modüller YOK; hafif personel + firma + pakete özel modüller.
# Ortak: admin, users (çekirdek) + companies (müşteri) + finance (kasa) + pos (yazarkasa).
ESNAF_PACKAGES = {
    'bakkal':  ['admin', 'users', 'companies', 'products', 'stock', 'purchasing', 'finance', 'pos'],
    'berber':  ['admin', 'users', 'companies', 'finance', 'pos', 'sections', 'services', 'reservations'],
    'lokanta': ['admin', 'users', 'companies', 'products', 'stock', 'finance', 'pos',
                'sections', 'reservations', 'waiter'],
}
ESNAF_PKGS = tuple(ESNAF_PACKAGES)


def esnaf_modules(pkg):
    """Esnaf kaydı: paket (bakkal/berber/lokanta) → modül listesi (katalog sırasıyla, geçerli anahtarlar)."""
    keys = set(ESNAF_PACKAGES.get(pkg, ESNAF_PACKAGES['bakkal']))
    return [k for k in MODULE_KEYS if k in keys]


# Dron paketi (firm_type='dron'): GÖKTUNGU'nun yerini alan Dron Yönetimi (envanter, canlı uçuş, rotalar, köprüler) + saha görevleri;
# üretim modülü yok. Müşteri (CRM), fatura (finans), evrak ve çekirdek modüller dahil. Dron modülleri başka pakette görünmez.
DRONE_PACKAGE = ['admin', 'users', 'announcements', 'reports', 'tools', 'companies', 'documents', 'finance', 'field', 'drone']


def drone_modules():
    keys = set(DRONE_PACKAGE)
    return [k for k in MODULE_KEYS if k in keys]
