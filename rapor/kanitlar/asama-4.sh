#!/bin/bash
# =====================================================================
# Aşama 4 kanıtları: değişiklik talebinin ÇALIŞAN sisteme uygulanması
# Migration bir kez çalışır; bu script de sistem Aşama 3 durumundayken bir kez
# çalıştırılmak içindir:
#   bash rapor/kanitlar/asama-4.sh > rapor/kanitlar/asama-4.txt
# =====================================================================
cd "$(dirname "$0")/../.."
API=http://localhost:8080/api
CEREZ=$(mktemp)
k() { echo; echo "\$ $*"; eval "$@" 2>&1 | grep -v "Using a password"; }
P="docker compose exec -T mysql-primary mysql --default-character-set=utf8mb4 -uroot -pyemekhane_kok yemekhane"
R="docker compose exec -T mysql-replica mysql --default-character-set=utf8mb4 -uroot -pyemekhane_kok yemekhane"
BUGUN=$(date +%F); YARIN=$(date -d tomorrow +%F)

echo "# Aşama 4 kanıtları · $(date '+%d.%m.%Y %H:%M')"

curl -s -c $CEREZ -X POST $API/giris -H 'Content-Type: application/json' \
  -d '{"eposta":"251229002@ktun.edu.tr","sifre":"12345"}' >/dev/null

echo; echo "## 0. Başlangıç: eski uygulama çalışıyor, Redis'te eski yapıda menü kayıtları var"
for o in 1 2 3; do curl -s -b $CEREZ "$API/menu?yemekhane=1&tarih=$YARIN&ogun=$o" >/dev/null; done
k "docker compose exec -T redis redis-cli --scan --pattern 'menu:*'"
k "docker compose exec -T redis redis-cli GET menu:1:$YARIN:2 | head -c 330; echo"
echo "# eski kayıtta yarimPorsiyonVar alanı yok"
k "$R -e 'SHOW CREATE TABLE rezervasyonlar\G' | grep -E 'durum|porsiyon|ucret'"

echo; echo "## 1. Migration kaynakta çalıştırılıyor (tek dosya: db/init/04_degisiklik.sql)"
k "docker compose exec -T mysql-primary mysql -uroot -pyemekhane_kok yemekhane < db/init/04_degisiklik.sql && echo 'migration tamam'"

echo; echo "## 2. Mevcut veri bozulmadı"
k "$P -e \"SELECT porsiyon, COUNT(*) AS adet FROM rezervasyonlar GROUP BY porsiyon\""
echo "# bakiye = SUM(hareketler) kuralı: tutarsız kullanıcı sayısı 0 olmalı"
k "$P -e \"SELECT COUNT(*) AS tutarsiz FROM kullanicilar k WHERE k.bakiye <> (SELECT COALESCE(SUM(tutar),0) FROM bakiye_hareketleri h WHERE h.kullanici_id = k.id)\""

echo; echo "## 3. Değişiklik replikaya da geçti (çıktılar REPLİKADAN)"
sleep 1
k "$R -e 'SHOW CREATE TABLE rezervasyonlar\G'"
k "$R -e 'SHOW CREATE TABLE kullanici_alerjenleri\G'"
k "$R -e 'SELECT id, ad, yarim_porsiyon_var FROM ogunler'"
k "$R -e \"SELECT PARAMETER_NAME, DATA_TYPE FROM information_schema.PARAMETERS WHERE SPECIFIC_SCHEMA='yemekhane' AND SPECIFIC_NAME='sp_rezervasyon_yap' ORDER BY ORDINAL_POSITION\""
k "docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e 'SHOW REPLICA STATUS\G' | grep -E 'Running:|Last_SQL_Error:'"

echo; echo "## 4. Uygulama yeni sürümle yeniden derleniyor"
k "docker compose up -d --build uygulama 2>&1 | grep -E 'Built|Started'"
sleep 4

echo; echo "## 5. Redis'te eski yapıdaki menü kayıtları temizleniyor"
k "docker compose exec -T redis redis-cli --scan --pattern 'menu:*'"
k "docker compose exec -T redis sh -c \"redis-cli --scan --pattern 'menu:*' | xargs -r redis-cli DEL\""
k "docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l"
echo "# oturumlar (oturum:*) silinmedi, kullanıcılar çıkış yapmak zorunda kalmaz:"
k "curl -s -b $CEREZ $API/ben | head -c 80; echo"

echo; echo "## 6. Yarım porsiyon"
OGLE=$($R -N -e "SELECT id FROM menuler WHERE yemekhane_id=1 AND tarih='$YARIN' AND ogun_id=2" 2>/dev/null)
KAHVALTI=$($R -N -e "SELECT id FROM menuler WHERE yemekhane_id=1 AND tarih='$YARIN' AND ogun_id=1" 2>/dev/null)
k "curl -s -b $CEREZ '$API/menu?yemekhane=1&tarih=$YARIN&ogun=2' | python3 -c \"import sys,json;m=json.load(sys.stdin)['menu'];print({k:m[k] for k in ('ogun','fiyat','yarimPorsiyonVar','yarimFiyat')})\""
k "docker compose exec -T redis redis-cli GET menu:1:$YARIN:2 | grep -o '\"yarimPorsiyonVar\":[a-z]*'"
echo "# öğle, yarım porsiyon (tam fiyat 40 TL, beklenen 24 TL):"
k "curl -s -b $CEREZ -X POST $API/rezervasyonlar -H 'Content-Type: application/json' -d '{\"menuId\":$OGLE,\"porsiyon\":\"yarim\"}'"
echo "# kahvaltı, yarım porsiyon (reddedilmeli):"
k "curl -s -b $CEREZ -X POST $API/rezervasyonlar -H 'Content-Type: application/json' -d '{\"menuId\":$KAHVALTI,\"porsiyon\":\"yarim\"}'"
k "$P -e \"SELECT id, menu_id, durum, porsiyon, ucret FROM rezervasyonlar WHERE kullanici_id=7 AND menu_id=$OGLE\""
k "$P -e \"SELECT tur, tutar, aciklama FROM bakiye_hareketleri WHERE kullanici_id=7 ORDER BY id DESC LIMIT 1\""

echo; echo "## 7. Alerjen uyarısı"
echo "# Mehmet profilinde Gluten (1) ve Süt (7) seçiyor:"
k "curl -s -b $CEREZ -X PUT $API/profil/alerjenler -H 'Content-Type: application/json' -d '{\"alerjenIdler\":[1,7]}'"
sleep 1
k "$R -e 'SELECT * FROM kullanici_alerjenleri WHERE kullanici_id = 7'"
k "curl -s -b $CEREZ '$API/menu?yemekhane=1&tarih=$YARIN&ogun=2' | python3 -c \"import sys,json;m=json.load(sys.stdin)['menu'];print('alerjenUyarisi:',m['alerjenUyarisi']);[print(' ',y['ad'],'->',y['uyarilar']) for y in m['yemekler']]\""
rm -f $CEREZ
