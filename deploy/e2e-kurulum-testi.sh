#!/bin/bash
# Canlı uçtan uca firma kurulum testi (sunucu modu). Yalnız elle, bilerek çalıştırılır:
#   1. Veilox paneline (merkez iç anahtarıyla) "Deneme Kurulum" firmasını ekler ve KURAR
#      → /etc/systemd/system/hepgo-deneme-kurulum.service, /run/hepgo/deneme-kurulum.sock,
#        cloudflared ingress satırı + tünel yeniden başlatma (tüm siteler birkaç sn kesilir), CF DNS kaydı
#   2. Servisi, soketi, birim içeriğini, tünel satırını ve yedeğini doğrular
#   3. Firmayı ASKIYA ALIR (servis + tünel satırı kaldırılır, tünel yeniden başlar) ve kaydı siler
# Silinmeyenler (elle): Cloudflare DNS kaydı deneme-kurulum.hepgo.com, /opt/hepgo/caymazbuild/tenants/deneme-kurulum
set -uo pipefail
SOCK=/run/hepgo/veilox.sock
SLUG=deneme-kurulum
SEC=$(sed -n 's/^VEILOX_CENTRAL_API_SECRET=//p' /opt/hepgo/veilox/.env | head -1)
[ -n "$SEC" ] || { echo "HATA: merkez iç anahtarı okunamadı"; exit 1; }
api() { curl -s --max-time 240 --unix-socket $SOCK -H 'Host: veilox.app' -H "X-Central-Secret: $SEC" \
             -H 'Content-Type: application/json' "$@"; }
ok=0; bad=0
check() { if eval "$2"; then echo "  ✔ $1"; ok=$((ok+1)); else echo "  ✘ $1"; bad=$((bad+1)); fi; }
sites() { for s in caymaz turkbey merkez veilox; do printf '%s:%s ' $s "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 --unix-socket /run/hepgo/$s.sock http://localhost/)"; done; echo; }

if grep -q "hostname: $SLUG\." /etc/cloudflared/config.yml || [ -e /etc/systemd/system/hepgo-$SLUG.service ]; then
  echo "HATA: $SLUG zaten kurulu görünüyor; önce temizleyin"; exit 1
fi
echo "== Önce: $(sites)"
CID=$(api -X POST http://localhost/api/companies -d "{\"name\":\"Deneme Kurulum\",\"master_username\":\"$SLUG@hepgo.com\",\"modules\":[\"admin\",\"users\",\"documents\"],\"note\":\"uçtan uca kurulum testi\"}" \
      | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["id"] if d.get("slug")=="'$SLUG'" else "")')
[ -n "$CID" ] || { echo "HATA: firma oluşturulamadı (slug $SLUG değil ya da hata)"; exit 1; }
echo "== Kurulum (firma id $CID)"
api -X POST http://localhost/api/companies/$CID/provision | python3 -c 'import sys,json; d=json.load(sys.stdin); print("  yanıt:", {k: d.get(k) for k in ("ok","service","socket","url","cloudflare_error","error")})'
sleep 3
U=/etc/systemd/system/hepgo-$SLUG.service
check "birim dosyası şablondan" "head -1 $U 2>/dev/null | grep -q '^# hepgo-tenant'"
check "birimde firma adı yok" "! grep -q 'Deneme Kurulum' $U"
check "servis aktif" "systemctl is-active -q hepgo-$SLUG"
for i in $(seq 1 20); do [ -S /run/hepgo/$SLUG.sock ] && break; sleep 1; done
check "soket yanıt veriyor" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 --unix-socket /run/hepgo/$SLUG.sock http://localhost/)\" = 307 ]"
check "tünel satırı eklendi" "grep -A1 'hostname: $SLUG.hepgo.com' /etc/cloudflared/config.yml | grep -q 'service: unix:/run/hepgo/$SLUG.sock'"
check "tünel yakalama kuralı sonda" "tail -1 /etc/cloudflared/config.yml | grep -q 'http_status:404'"
check "tünel ayar yedeği alındı" "ls /opt/hepgo/veilox/data/cf-backups/config.yml.bak-* >/dev/null 2>&1"
check "cloudflared aktif" "systemctl is-active -q cloudflared"
echo "  siteler: $(sites)"
echo "== Askıya alma ve kayıt silme"
api -X POST http://localhost/api/companies/$CID/suspend >/dev/null
sleep 3
check "servis kaldırıldı" "[ ! -e $U ] && ! systemctl is-active -q hepgo-$SLUG"
check "tünel satırı kaldırıldı" "! grep -q 'hostname: $SLUG.hepgo.com' /etc/cloudflared/config.yml"
check "tünel ayarı başlangıçla aynı" "diff -q <(grep -v '^$' /etc/cloudflared/config.yml) <(grep -v '^$' /opt/hepgo/veilox/data/cf-backups/\$(ls -t /opt/hepgo/veilox/data/cf-backups | tail -1)) >/dev/null"
check "cloudflared aktif" "systemctl is-active -q cloudflared"
api -X DELETE http://localhost/api/companies/$CID >/dev/null
echo "  siteler: $(sites)"
echo "== Sonuç: $ok geçti, $bad kaldı"
echo "Elle silinecek: Cloudflare DNS 'deneme-kurulum.hepgo.com' ve /opt/hepgo/caymazbuild/tenants/$SLUG (root)"
[ $bad -eq 0 ]
