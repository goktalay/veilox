"""Offline kurulum paketi üreticisi (ZIP).

Müşteri kendi sunucusuna (Windows veya Linux) kurabilsin diye Fabrika Yönetim Sistemi'nin BOŞ (verisiz)
halini paketler: uygulama kodu + seçilen modüller (.env CAYMAZ_MODULES) + ilk master kullanıcı (.env seed) +
Linux (run.sh) ve Windows (run.bat) başlatıcı + KUR.txt. Veritabanı yoktur; uygulama ilk açılışta boş DB'yi
kendi şemasıyla oluşturur ve master kullanıcıyı seed eder.
"""
import os
import time
import zipfile
from pathlib import Path
from . import settings
settings.load()   # .env, aşağıdaki ayarlar okunmadan önce (bkz. settings.py)

APP_DIR = Path(os.environ.get('VEILOX_TENANT_APP_DIR', '/home/mkaderoglu/caymazbuild'))

# Pakete GİREN üst-düzey yollar (yalnızca kod + çalıştırma; veri/venv/tenant hariç).
INCLUDE_TOP = ['app', 'static', 'run.sh', 'requirements.txt', 'README.md']
EXCLUDE_PARTS = {'__pycache__', '.git', '.venv', 'data', 'tenants', 'backups', 'node_modules', '.pytest_cache'}
EXCLUDE_SUFFIX = {'.pyc', '.pyo', '.db', '.db-wal', '.db-shm', '.bak', '.log'}

RUN_BAT = """@echo off
REM Fabrika Yonetim Sistemi - Windows baslatici
setlocal
if not exist .venv ( py -3 -m venv .venv || python -m venv .venv )
call .venv\\Scripts\\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if "%PORT%"=="" set PORT=8080
echo Uygulama baslatiliyor: http://localhost:%PORT%/app
python -m uvicorn app.main:app --host 0.0.0.0 --port %PORT%
"""

KUR_TXT = """FABRİKA YÖNETİM SİSTEMİ — KURULUM (Offline)
============================================

Gereksinim: Python 3.11+ (https://www.python.org/downloads/).

LINUX / MAC:
  1) Terminalde bu klasöre girin.
  2) chmod +x run.sh
  3) ./run.sh
  4) Tarayıcıdan http://SUNUCU_IP:8080/app adresine gidin.

WINDOWS:
  1) Bu klasörü açın.
  2) run.bat dosyasına çift tıklayın (ilk açılışta bağımlılıklar kurulur, birkaç dakika sürebilir).
  3) Tarayıcıdan http://localhost:8080/app adresine gidin.

İLK GİRİŞ (master kullanıcı):
  Kullanıcı adı : {master_user}
  Şifre         : {admin_pass}
  * İlk girişten sonra şifrenizi uygulamadan değiştirin.

PORT değiştirmek için: Linux'ta PORT=9000 ./run.sh  |  Windows'ta set PORT=9000 (sonra run.bat).

Bu kurulumdaki modüller merkez tarafından belirlenmiştir (.env içindeki CAYMAZ_MODULES).
Verileriniz yalnızca kendi sunucunuzdadır; düzenli yedek almayı unutmayın (data/ klasörü).
"""


def _env_text(company_name, master_user, full_name, admin_pass, modules):
    from .provision import one_line
    company_name, master_user, full_name, admin_pass = map(one_line, (company_name, master_user, full_name, admin_pass))
    modules = [one_line(m) for m in modules]
    return (
        f'# {company_name} — Fabrika Yönetim Sistemi (offline kurulum)\n'
        f'CAYMAZ_ADMIN_USERNAME={master_user}\n'
        f'CAYMAZ_ADMIN_PASSWORD={admin_pass}\n'
        f'CAYMAZ_ADMIN_FULL_NAME={full_name}\n'
        f'CAYMAZ_COMPANY_NAME={company_name}\n'
        f'CAYMAZ_MASTER_USERNAME={master_user}\n'
        f'CAYMAZ_MODULES={",".join(modules)}\n'
        'CAYMAZ_SEED_SPARE_STOCK=0\n'
    )


def _skip(path: Path):
    if any(part in EXCLUDE_PARTS for part in path.parts):
        return True
    if path.suffix.lower() in EXCLUDE_SUFFIX:
        return True
    return False


def build_offline_zip(dest_dir, company_name, master_user, full_name, admin_pass, modules):
    """ZIP üretir, Path döner. Paket kökü: fabrika-<slug>/ ."""
    from .provision import slugify
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    slug = slugify(company_name)
    root = f'fabrika-{slug}'
    ts = time.strftime('%Y%m%d-%H%M%S')
    out = dest_dir / f'{root}-{ts}.zip'

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for top in INCLUDE_TOP:
            src = APP_DIR / top
            if not src.exists():
                continue
            if src.is_file():
                if not _skip(src):
                    z.write(src, f'{root}/{top}')
                continue
            for p in src.rglob('*'):
                if p.is_file() and not _skip(p):
                    z.write(p, f'{root}/{p.relative_to(APP_DIR)}')
        # Üretilen dosyalar
        z.writestr(f'{root}/.env', _env_text(company_name, master_user, full_name, admin_pass, modules))
        z.writestr(f'{root}/run.bat', RUN_BAT)
        z.writestr(f'{root}/KUR.txt', KUR_TXT.format(master_user=master_user, admin_pass=admin_pass))
    return out
