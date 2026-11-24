#!/bin/bash
# Aşama 1 kanıtları. Depo kökünde: bash rapor/kanitlar/asama-1.sh > rapor/kanitlar/asama-1.txt
cd "$(dirname "$0")/../.."
# Her komutu önce yazdır, sonra çalıştır (çıktı ve hata birlikte)
k() { echo; echo "\$ $*"; eval "$@" 2>&1 | grep -v "Using a password"; }
echo "# Aşama 1 kanıtları · $(date '+%d.%m.%Y %H:%M')"
echo; echo "## 1. Tüm servisler çalışıyor"
k 'docker compose ps -a'
echo; echo "## 2. Replikasyon durumu (IO ve SQL işçileri)"
k 'docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G" | grep -E "Source_Host|Running:|Seconds_Behind"'
echo; echo "## 3. Kaynakta yapılan bakiye yüklemesi replikada görünüyor"
k 'docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"'
k 'docker compose exec -T mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 100)"'
k 'docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"'
echo; echo "## 4. Replikaya yazma denemesi read-only hatasıyla reddediliyor"
k 'docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 50)"'
echo; echo "## 5. Durdurulan replika, aradaki değişikliği yakalıyor"
k 'docker compose stop mysql-replica'
k 'docker compose exec -T mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 200)"'
k 'docker compose start mysql-replica'
docker compose up -d --wait mysql-replica >/dev/null 2>&1; sleep 3
k 'docker compose exec -T mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"'
echo; echo "## 6. Redis çalışıyor"
k 'docker compose exec -T redis redis-cli ping'
