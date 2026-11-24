---
title: "Yemekhane Otomasyonu · Dönem Ödevi Raporu"
subtitle: "Web Teknolojileri"
author: "Arda Kerem Yolcu · 241229099"
date: "24 Kasım 2026"
lang: tr
---

# Seçilen yol: Web API + arayüz

Uygulama **Web API** yolunda yazıldı. Sunucu tarafı Node.js üzerinde **Express** ile yazıldı
ve yalnızca JSON döndürür. Arayüz düz HTML5, CSS3 ve JavaScript'tir; `frontend` container'ındaki
Apache tarafından sunulur ve veriyi `fetch` ile `/api/...` adreslerinden alır. Apache
`-D WEBAPI` modunda çalışır ve `/api/` ile başlayan istekleri `uygulama` servisine iletir.

Depo: <https://github.com/ardaky/yemekhane-otomasyonu>

# Aşama 1 · Altyapı

Başlangıç paketi `docker compose up -d` ile çalıştırıldı. Aşağıdaki çıktıların tamamı
`rapor/kanitlar/asama-1.txt` dosyasındadır.

## Tüm servisler çalışıyor

```text
$ docker compose ps -a
NAME                        IMAGE                SERVICE         STATUS
yemekhane-frontend-1        yemekhane-frontend   frontend        Up (healthy)
yemekhane-mysql-primary-1   mysql:8.4            mysql-primary   Up (healthy)
yemekhane-mysql-replica-1   mysql:8.4            mysql-replica   Up (healthy)
yemekhane-redis-1           redis:7.4-alpine     redis           Up (healthy)
yemekhane-replica-setup-1   mysql:8.4            replica-setup   Exited (0)
```

Dört servis `healthy`. `replica-setup` bir kerelik bir iştir: replikayı kurar ve başarıyla
çıkar (`Exited (0)`). Replika zaten kuruluysa hiçbir şey yapmadan çıkar.

## Replikasyon çalışıyor

```text
$ docker compose exec -T mysql-replica mysql -uroot -pyemekhane_kok \
    -e "SHOW REPLICA STATUS\G" | grep -E "Source_Host|Running:|Seconds_Behind"
                  Source_Host: mysql-primary
           Replica_IO_Running: Yes
          Replica_SQL_Running: Yes
        Seconds_Behind_Source: 0
```

`IO` işçisi kaynağın binary log'undaki yeni değişiklikleri alır, `SQL` işçisi bunları
replikanın tablolarına uygular. İkisinin de `Yes` olması replikasyonun çalıştığını gösterir.

## Kaynakta yapılan bakiye yüklemesi replikada görünüyor

```text
$ docker compose exec -T mysql-replica mysql ... -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
id  bakiye
7   1025.00

$ docker compose exec -T mysql-primary mysql ... -e "CALL sp_bakiye_yukle(7, 100)"
hareket_id  bakiye
461         1125.00

$ docker compose exec -T mysql-replica mysql ... -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
id  bakiye
7   1125.00
```

Yükleme yalnızca kaynakta (`mysql-primary`) yapıldı, replika aynı değeri kendiliğinden gösterdi.

## Replikaya yazma denemesi reddediliyor

```text
$ docker compose exec -T mysql-replica mysql ... -e "CALL sp_bakiye_yukle(7, 50)"
ERROR 1290 (HY000) at line 1: The MySQL server is running with the --super-read-only
option so it cannot execute this statement
```

Replikasyon tek yönlüdür. Replikaya yazılabilseydi kaynak bu değişikliği hiç öğrenmez ve iki
veritabanı farklı bakiyeler gösterirdi. `replica-setup.sh` bu yüzden replikayı
`super_read_only` ile kilitler.

## Durdurulan replika aradaki değişikliği yakalıyor

```text
$ docker compose stop mysql-replica
$ docker compose exec -T mysql-primary mysql ... -e "CALL sp_bakiye_yukle(7, 200)"
hareket_id  bakiye
462         1325.00
$ docker compose start mysql-replica
$ docker compose exec -T mysql-replica mysql ... -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
id  bakiye
7   1325.00
```

Replika kapalıyken kaynakta yapılan 200 TL'lik yükleme, replika açıldıktan sonra replikada da
göründü. Replika binary log'da kaldığı yeri (GTID) bildiği için açılınca kaçırdığı
değişiklikleri sırayla uygular. Verisi volume'da durduğu için container'ın durup başlaması
veriyi silmez.

## Gözlem: bilgisayar açılışında replika bir süre bağlanamayabiliyor

Bilgisayar yeniden başlatılınca iki MySQL container'ı aynı anda kalkıyor. İlk ölçümde
`Replica_IO_Running: Connecting` görüldü ve kaynakta yapılan yükleme replikaya hemen geçmedi.
Replika, kaynak henüz hazır değilken bağlanmayı denemiş ve varsayılan ayarla 60 saniye
sonra yeniden denemek üzere beklemeye geçmişti. Bağlantı kurulunca bekleyen değişikliklerin
hepsi uygulandı. Bu durum, replikanın her an kaynakla aynı olmadığını gösteren bir örnektir.

## Redis çalışıyor

```text
$ docker compose exec -T redis redis-cli ping
PONG
```
