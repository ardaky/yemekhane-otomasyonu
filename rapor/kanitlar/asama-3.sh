#!/bin/bash
# =====================================================================
# Aşama 3 kanıtları: Redis menü önbelleği ve oturum deposu
# Depo kökünde çalıştırın:  bash rapor/kanitlar/asama-3.sh > rapor/kanitlar/asama-3.txt
# Her komut önce "$ ..." olarak yazılır, ardından çıktısı gelir.
# =====================================================================
cd "$(dirname "$0")/../.."
API=http://localhost:8080/api
CEREZ=$(mktemp); YCEREZ=$(mktemp)
k() { echo; echo "\$ $*"; eval "$@" 2>&1 | grep -v "Using a password"; }
rc() { docker compose exec -T redis redis-cli "$@"; }
BUGUN=$(date +%F)

echo "# Aşama 3 kanıtları · $(date '+%d.%m.%Y %H:%M')"

echo; echo "## 1. Oturum Redis'te tutuluyor (oturum:{token}, 30 dakika)"
k "curl -s -c $CEREZ -X POST $API/giris -H 'Content-Type: application/json' -d '{\"eposta\":\"251229002@ktun.edu.tr\",\"sifre\":\"12345\"}'"
TOKEN=$(awk '$6=="oturum"{print $7}' $CEREZ)
k "docker compose exec -T redis redis-cli --scan --pattern 'oturum:*'"
k "docker compose exec -T redis redis-cli GET oturum:$TOKEN"
k "docker compose exec -T redis redis-cli TTL oturum:$TOKEN"
sleep 3
k "docker compose exec -T redis redis-cli TTL oturum:$TOKEN"
k "curl -s -b $CEREZ $API/ben"
echo "# her istekte süre yeniden 30 dakikaya (1800 sn) çekilir:"
k "docker compose exec -T redis redis-cli TTL oturum:$TOKEN"

echo; echo "## 2. Menü önbelleği: ilk istek veritabanından, ikincisi Redis'ten"
rc DEL "menu:1:$BUGUN:3" >/dev/null
k "curl -s -b $CEREZ '$API/menu?yemekhane=1&tarih=$BUGUN&ogun=3' | head -c 160; echo"
k "curl -s -b $CEREZ '$API/menu?yemekhane=1&tarih=$BUGUN&ogun=3' | head -c 160; echo"
k "docker compose logs --no-log-prefix uygulama | grep 'menu:1:$BUGUN:3' | tail -2"
k "docker compose exec -T redis redis-cli --scan --pattern 'menu:*'"
k "docker compose exec -T redis redis-cli TTL menu:1:$BUGUN:3"
echo "# TTL, bu günün 23:59:59'una kadar kalan saniyedir"

echo; echo "## 3. Yönetici menüyü değiştirince eski kayıt siliniyor"
MENU=$(docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -N -e "SELECT id FROM menuler WHERE yemekhane_id=1 AND tarih='$BUGUN' AND ogun_id=3" 2>/dev/null)
ESKI=$(curl -s -c $YCEREZ -X POST $API/giris -H 'Content-Type: application/json' -d '{"eposta":"leyla.arslan@ktun.edu.tr","sifre":"12345"}' >/dev/null; curl -s -b $YCEREZ $API/yonetici/menuler/$MENU)
ESKI_YEMEKLER=$(echo "$ESKI" | python3 -c "import sys,json;print(json.load(sys.stdin)['yemekIdler'])")
YENI_YEMEKLER=$(echo "$ESKI" | python3 -c "import sys,json;d=json.load(sys.stdin)['yemekIdler'];print(d+[50] if 50 not in d else d)")
echo "# menü $MENU, yemekler: $ESKI_YEMEKLER -> $YENI_YEMEKLER (Ayran eklendi)"
k "curl -s -b $YCEREZ -X PUT $API/yonetici/menuler/$MENU -H 'Content-Type: application/json' -d '{\"ogrenciFiyati\":40,\"personelFiyati\":90,\"yemekIdler\":$YENI_YEMEKLER}'"
k "docker compose exec -T redis redis-cli EXISTS menu:1:$BUGUN:3"
sleep 1.5
k "curl -s -b $CEREZ '$API/menu?yemekhane=1&tarih=$BUGUN&ogun=3' | python3 -c \"import sys,json;print([y['ad'] for y in json.load(sys.stdin)['menu']['yemekler']])\""
k "docker compose logs --no-log-prefix uygulama | grep 'menu:1:$BUGUN:3' | tail -3"
# Menüyü eski haline döndür (bu da önbelleği yeniden siler)
curl -s -b $YCEREZ -X PUT $API/yonetici/menuler/$MENU -H 'Content-Type: application/json' -d "{\"ogrenciFiyati\":40,\"personelFiyati\":90,\"yemekIdler\":$ESKI_YEMEKLER}" >/dev/null

echo; echo "## 4. Uygulama container'ı yeniden başlasa da oturum düşmüyor"
k "docker compose restart uygulama"
sleep 4
k "curl -s -b $CEREZ $API/ben"

echo; echo "## 5. Çıkış yapınca oturum kaydı siliniyor"
k "curl -s -b $CEREZ -X POST $API/cikis"
k "docker compose exec -T redis redis-cli EXISTS oturum:$TOKEN"
k "curl -s -b $CEREZ $API/ben"
rm -f $CEREZ $YCEREZ
