# Veilox kurulum servisi (veilox.app)

Sunucuda `/opt/hepgo/veilox` altında `uvicorn veilox.main:app --uds /run/hepgo/veilox.sock` olarak çalışır
(systemd: `hepgo-veilox`). Tanıtım sayfası (veilox.app / hepgo.com), self-servis kayıt, firma kurulumu
(provisioning: systemd + Cloudflare), offline paket ve kurulum linkleri buradadır.

**Yönetim arayüzü artık HEPGO Merkez'dedir** (`merkez.veilox.app`, HEPGO uygulaması merkez modunda —
`CAYMAZ_FEDERATION_CENTRAL=1`). Merkez bu servisi yerel soketten `X-Central-Secret` iç anahtarıyla çağırır
(`VEILOX_CENTRAL_API_SECRET` = Merkez'deki `CAYMAZ_CENTRAL_API_SECRET`; firmalarda bulunmaz).

Dağıtım: `rsync -a central/veilox_server/{veilox,static} root@sunucu:/opt/hepgo/veilox/` → `systemctl restart hepgo-veilox`.
Gizli bilgiler (`.env`, `data/central.db`) repoda yoktur.

**Alan adları:** Merkez (yönetim) girişi yalnız `veilox.app`'tedir (`VEILOX_CENTRAL_HOSTS`); `hepgo.com`'da `/panel` → `/giris`
yönlenir ve `/api/login` yoktur. `/giris` firma girişi sayfasıdır: firma adresiyle kendi paneline giriş, adresini unutan yönetici için
e-posta + şifreyle firma bulma ve başvuru durumu, adım adım yeni firma başvurusu.

Testler (bu klasörde): `../../.venv/bin/python -m tests.test_veilox` ve `../../.venv/bin/python -m tests.test_public`.


## Sunucuda firma kurulumu (sistem servisleri + native cloudflared)

Veilox `hepgo` kullanıcısıyla çalışır; `/etc/systemd/system`'e yazamaz. Birimi root'a ait yardımcı kurar:

    install -o root -g root -m 0755 deploy/hepgo-tenant /usr/local/sbin/hepgo-tenant
    install -o root -g root -m 0440 deploy/sudoers-hepgo-veilox /etc/sudoers.d/hepgo-veilox
    visudo -cf /etc/sudoers.d/hepgo-veilox

`hepgo-tenant install|remove <slug>` birimi kendi şablonundan üretir (`hepgo-<slug>.service`, soket
`/run/hepgo/<slug>.sock`); firma adı birime girmez, elle kurulmuş birimlere dokunmaz. `.env`:

    VEILOX_TENANT_APP_DIR=/opt/hepgo/caymazbuild
    VEILOX_UNIT_HELPER=/usr/local/sbin/hepgo-tenant
    VEILOX_SOCK_DIR=/run/hepgo
    VEILOX_CF_HOME_CONTAINER=          # boş: tünel konteynerde değil, soket yolu doğrudan
    VEILOX_CF_BACKUP_DIR=/opt/hepgo/veilox/data/cf-backups

Her yeni firma (ve askıya alma) `cloudflared`'ı yeniden başlatır: tüm siteler birkaç saniye kesilir.
`.env` alt modüllerden önce yüklenir (`veilox/settings.py`); test: `tests/test_provision_server.py`.
