# Veilox — şirketler paneli

Tek kullanıcılı üst panel: sistemdeki firmaları (Fabrika Yönetim Sistemi kurulumları) logo ve adlarıyla gösterir;
firmaya tıklayınca firmanın tüm verilerinin özeti açılır. Firma veritabanlarını **yalnızca okur** (sqlite mode=ro).

- Adres: https://veilox.app (Cloudflare tüneli `caymaz` → 127.0.0.1:8082)
- Servis: `systemctl --user {status,restart} veilox` (uvicorn, yalnızca 127.0.0.1:8082)
- Python ortamı: `/home/mkaderoglu/caymazbuild/.venv` (FastAPI)
- Firmalar: `tenants.json` (ad, adres, veri klasörü, marka klasörü). Yeni firma = yeni satır + servis yeniden başlatma.
- Kullanıcı: `.env` (chmod 600) — `VEILOX_USERNAME`, `VEILOX_PASSWORD_HASH` (PBKDF2-SHA256; düz şifre saklanmaz).
  Şifre değiştirmek için: `python3 -m veilox.passwd` (yeni özet üretir, .env'e yazar).
- Güvenlik: HttpOnly + SameSite=Strict (+ https'te Secure) oturum çerezi, 12 saatlik oturum (bellekte; servis yeniden
  başlarsa yeniden giriş), IP başına 5 hatalı denemede 15 dk kilit, genel 30 denemede kilit, sıkı CSP, API belgeleri kapalı.
- Arka plandaki dünya: `static/globe.js` + `static/data/land.json` (Fabrika Yönetim Sistemi'nden; Natural Earth 1:110m).
- Test: `/home/mkaderoglu/caymazbuild/.venv/bin/python -m tests.test_veilox`
