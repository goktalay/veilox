"""Veilox .env yükleyici. Ayar okuyan her modül (db, provision, cloudflare, pkg, main) içe aktarılırken load() çağırır:
modüller ayarlarını içe aktarılırken okuduğundan .env her durumda onlardan ÖNCE yüklenmiş olur. Ortamdaki değer ezilmez."""
import os
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
_loaded = set()


def load():
    path = Path(os.environ.get('VEILOX_ENV_FILE', BASE / '.env'))
    if path in _loaded:
        return
    _loaded.add(path)
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())
