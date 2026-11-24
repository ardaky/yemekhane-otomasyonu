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

# Aşama 2 · Uygulama

## Mimari ve katmanlar

Uygulama `uygulama/` klasöründedir ve compose dosyasına `uygulama` servisi olarak eklenmiştir.
Container içinde 8000 portunu dinler, dışarıya port açmaz: tarayıcı uygulamaya yalnızca Apache
üzerinden (`/api/...`) ulaşır. Veritabanı ve Redis adreslerini compose dosyasındaki ortam
değişkenlerinden (`DB_YAZMA_HOST`, `DB_OKUMA_HOST`, ...) okur.

| Katman | Dosyalar | Görevi |
|---|---|---|
| Rotalar | `src/rotalar.js` | Hangi adres ve yöntemin hangi controller fonksiyonuna gideceği |
| Controller | `src/controllers/*.js` | Girdiyi denetler, iş kurallarını uygular, JSON yanıtı kurar. SQL içermez |
| Veri katmanı | `src/veri/*.js` | Bütün SQL buradadır. `yazma` (kaynak) ve `okuma` (replika) havuzları |
| Oturum | `src/oturum/*.js` | Giriş yapan kullanıcıyı token ile tanır, rol kontrolü yapar |
| Arayüz | `frontend/*.html`, `frontend/js/*.js` | HTML5 + CSS3, veriyi `fetch` ile alır. İş kuralı içermez |

Para hareketi yapan işlemlerde SQL yeniden yazılmadı, hazır stored procedure'ler çağrıldı:
rezervasyon (`sp_rezervasyon_yap`), iptal (`sp_rezervasyon_iptal`) ve bakiye yükleme
(`sp_bakiye_yukle`). Menü ekranları `v_menu_detay` ve `v_menu_doluluk`, yönetici raporu
ayrıca `v_menu_puan` view'larını kullanır.

## Bir isteğin yolu: rezervasyon yapmak

Kullanıcı haftalık menüde "Rezerve et" düğmesine bastığında arayüz şu isteği gönderir:

```js
// frontend/js/haftalik.js
const sonuc = await api('/rezervasyonlar', { yontem: 'POST', govde: { menuId } });
```

Apache `/api/` ile başlayan isteği `uygulama:8000`'e iletir. Express'te istek önce oturum
kontrolünden geçer (`girisGerekli`, çerezdeki token'dan kullanıcıyı bulur), sonra rotaya göre
controller'a gider:

```js
// src/rotalar.js
rota.use(girisGerekli);
rota.post('/rezervasyonlar', rezervasyon.yap);
```

Controller girdiyi denetler ve veri katmanını çağırır. SQL yazmaz:

```js
// src/controllers/rezervasyonController.js
async function yap(req, res) {
  const menuId = tamSayi(req.body && req.body.menuId, 'menü');
  const sonuc = await rezervasyonVerisi.yap(req.kullanici.kullaniciId, menuId);
  res.status(201).json({ rezervasyonId: sonuc.rezervasyon_id, ucret: sonuc.ucret, bakiye: sonuc.bakiye });
}
```

Veri katmanı stored procedure'ü **kaynak** bağlantısı üzerinden çağırır:

```js
// src/veri/rezervasyonVerisi.js
function yap(kullaniciId, menuId) {
  return yordam('sp_rezervasyon_yap', [kullaniciId, menuId]);
}

// src/veri/baglanti.js
async function yordam(ad, parametreler) {
  const yer = parametreler.map(() => '?').join(', ');
  const [sonuc] = await yazma.query(`CALL ${ad}(${yer})`, parametreler);
  return sonuc[0][0];
}
```

Yanıt `{"rezervasyonId":368,"ucret":40,"bakiye":315}` biçiminde JSON olarak döner ve arayüz
"Rezervasyon yapıldı. 40,00 TL düşüldü, güncel bakiyen 315,00 TL." mesajını gösterir.

Yordam hata verirse (ör. bakiye yetmiyorsa) MySQL `SQLSTATE 45000` ve Türkçe mesaj döndürür.
`src/hatalar.js` bu hatayı yakalar ve mesajı değiştirmeden `{"hata":"Bakiye yetersiz."}` olarak
iletir; arayüz de onu kırmızı bildirim kutusunda gösterir. Diğer veritabanı hataları (CHECK ihlali
gibi) günlüğe yazılır, kullanıcıya ham hali gösterilmez.

## Okuma ve yazma ayrımı

| İşlem | Bağlantı |
|---|---|
| Rezervasyon, iptal, bakiye yükleme (stored procedure) | Kaynak (`mysql-primary`) |
| Değerlendirme ekleme, menü oluşturma ve düzenleme | Kaynak |
| Giriş sırasında kullanıcıyı bulma | Kaynak (yeni açılmış hesap replikada henüz olmayabilir) |
| Değerlendirmeden hemen önce "bu menü kullanıldı mı?" kontrolü | Kaynak (yazmayla tutarlı olsun) |
| Günün menüsü, haftalık menü, rezervasyonlarım, bakiye geçmişi | Replika (`mysql-replica`) |
| Değerlendirme listeleri, yönetici raporu | Replika |

## Rezervasyondan sonraki bakiye neden kaynaktan okunuyor

MySQL replikasyonu eşzamansızdır. Kaynak bir değişikliği kendi tablosuna ve binary log'a yazar
ve uygulamaya hemen "tamam" der; replikanın bu değişikliği binary log'dan alıp uygulaması bir
süre sonra olur. Bu süre normalde milisaniyelerdir ama sistem yoğunken saniyelere çıkabilir
(Aşama 1'de, açılışta replikanın bir süre bağlanamadığı durumda bu açıkça görüldü). Rezervasyondan
hemen sonra bakiye replikadan okunsaydı, replika rezervasyonu henüz almamış olabileceği için
kullanıcı eski bakiyesini görür ve paranın düşmediğini sanabilirdi. Bu yüzden rezervasyon, iptal
ve yüklemeden sonra gösterilen bakiye, kaynakta çalışan yordamın döndürdüğü değerdir. Aynı
nedenle haftalık menü rezervasyondan sonra replikadan yeniden çekilmez; arayüz o menüyü yerinde
"Rezerve edildi" olarak işaretler ve boş yer sayısını bir azaltır.

## Ekranlar (telefon genişliği, 400 px)

Arayüz mobil önce tasarlandı. Telefonda ekranlar arasında alt sekme çubuğuyla geçilir; haftalık
menüde her gün bir karttır ve günler arasında yana kaydırılır. Geniş ekranda gün kartları ızgara
olarak dizilir.

![Giriş ve hatalı şifre](ekran/01-giris.png){width=32%} ![Günün menüsü](ekran/02-gunun-menusu.png){width=32%} ![Haftalık menü ve rezervasyon](ekran/03-haftalik.png){width=32%}

![Rezervasyonlarım](ekran/04-rezervasyonlar.png){width=32%} ![Bakiye](ekran/05-bakiye.png){width=32%} ![Değerlendirme](ekran/06-degerlendirme.png){width=32%}

![Yönetici paneli: doluluk ve puan](ekran/07-yonetici-rapor.png){width=32%} ![Yönetici paneli: menü formu](ekran/07-yonetici-form.png){width=32%} ![Profil](ekran/08-profil.png){width=32%}

Sırasıyla: giriş (hatalı şifre mesajı), günün menüsü (toplam kalori, vejetaryen ve alerjen
etiketleri), haftalık menü (boş yer, rol fiyatı, süresi geçen öğünde pasif düğme),
rezervasyonlarım (aktif kayıtta iptal), bakiye (yükleme ve hareket geçmişi), değerlendirme
(kullanılmış menüye 1–5 puan), yönetici paneli (menü bazında doluluk ve ortalama puan; menü
oluşturma ve düzenleme) ve profil.

## Hata mesajının arayüze taşınması

![Bakiye yetersiz](ekran/09-bakiye-yetersiz.png){width=32%}

Bakiyesi 12,50 TL olan öğrenci 40 TL'lik bir menüye rezervasyon yapmak istediğinde
`sp_rezervasyon_yap` yordamının döndürdüğü "Bakiye yetersiz." mesajı değiştirilmeden gösterilir.

## Geniş ekran

![Haftalık menü, 1280 px](ekran/10-haftalik-masaustu.png){width=90%}

# Aşama 3 · Redis

Redis iki iş için kullanılır. İkisi de `src/onbellek/redis.js`'teki tek bağlantıyı paylaşır.
Komutların ve çıktıların tamamı `rapor/kanitlar/asama-3.txt` dosyasındadır; aynı denemeyi
`bash rapor/kanitlar/asama-3.sh` ile tekrar çalıştırmak mümkündür.

| Görev | Anahtar | Süre | Ne zaman silinir |
|---|---|---|---|
| Menü önbelleği | `menu:{yemekhane_id}:{tarih}:{ogun_id}` | Menünün gününün sonuna kadar (`EXAT`) | Yönetici o menüyü değiştirdiğinde |
| Oturum | `oturum:{token}` | 30 dakika, her istekte yenilenir (`EXPIRE`) | Çıkış yapıldığında |

Önbelleğe yalnızca bütün kullanıcılar için aynı olan menü bilgisi yazılır (yemekler, kalori,
alerjenler, iki fiyat). Kullanıcının rolüne göre fiyat seçimi önbellekten okunduktan sonra
controller'da yapılır; böylece tek kayıt herkese hizmet eder.

## Menü önbelleği: ilk istek veritabanından, ikincisi Redis'ten

```text
$ curl -s -b cerez 'http://localhost:8080/api/menu?yemekhane=1&tarih=2026-11-24&ogun=3'
$ curl -s -b cerez 'http://localhost:8080/api/menu?yemekhane=1&tarih=2026-11-24&ogun=3'

$ docker compose logs --no-log-prefix uygulama | grep 'menu:1:2026-11-24:3'
[önbellek] menu:1:2026-11-24:3 -> veritabanından okundu, Redis'e yazıldı
[önbellek] menu:1:2026-11-24:3 -> Redis'ten geldi

$ docker compose exec -T redis redis-cli --scan --pattern 'menu:*'
menu:1:2026-11-24:3

$ docker compose exec -T redis redis-cli TTL menu:1:2026-11-24:3
49243
```

TTL, kaydın günün 23.59.59'unda silineceğini gösterir (saat 10.19'da yaklaşık 13,7 saat).

## Menü güncellenince eski kayıt siliniyor

Yönetici panelinden aynı menüye bir yemek (Ayran) eklendi:

```text
$ curl -s -b yonetici -X PUT http://localhost:8080/api/yonetici/menuler/45 \
    -H 'Content-Type: application/json' \
    -d '{"ogrenciFiyati":40,"personelFiyati":90,"yemekIdler":[4, 10, 25, 40, 50]}'
{"menuId":45}

$ docker compose exec -T redis redis-cli EXISTS menu:1:2026-11-24:3
0

$ curl -s -b cerez 'http://localhost:8080/api/menu?yemekhane=1&tarih=2026-11-24&ogun=3'
['Yayla Çorbası', 'Tavuk Sote', 'Fırın Makarna', 'Aşure', 'Ayran']

$ docker compose logs --no-log-prefix uygulama | grep 'menu:1:2026-11-24:3' | tail -3
[önbellek] menu:1:2026-11-24:3 -> Redis'ten geldi
[önbellek] menu:1:2026-11-24:3 -> silindi (1 kayıt)
[önbellek] menu:1:2026-11-24:3 -> veritabanından okundu, Redis'e yazıldı
```

Silmenin bir ayrıntısı var: güncelleme kaynağa yazılır, önbellek ise boşalınca replikadan
doldurulur. Güncellemeden hemen sonra gelen bir istek, değişikliği henüz almamış replikadan eski
menüyü okuyup önbelleğe geri yazabilir (replikasyon gecikmesi). Bunu önlemek için anahtar bir
saniye sonra bir kez daha silinir (`src/onbellek/menuOnbellegi.js`).

## Oturum Redis'te ve uygulama yeniden başlasa da düşmüyor

```text
$ docker compose exec -T redis redis-cli --scan --pattern 'oturum:*'
oturum:9fb4f71ce70c199cb9dc33a8f3610e32ff2e859bb6ab06532bb76fb174d2e753

$ docker compose exec -T redis redis-cli GET oturum:9fb4f71c...
{"kullaniciId":7,"rol":"ogrenci","ad":"Mehmet"}

$ docker compose exec -T redis redis-cli TTL oturum:9fb4f71c...
1795
$ curl -s -b cerez http://localhost:8080/api/ben
$ docker compose exec -T redis redis-cli TTL oturum:9fb4f71c...
1800

$ docker compose restart uygulama
$ curl -s -b cerez http://localhost:8080/api/ben
{"id":7,"ad":"Mehmet","soyad":"Yıldız","eposta":"251229002@ktun.edu.tr","rol":"ogrenci",...}

$ curl -s -b cerez -X POST http://localhost:8080/api/cikis
{"tamam":true}
$ docker compose exec -T redis redis-cli EXISTS oturum:9fb4f71c...
0
```

Her istekte süre yeniden 1800 saniyeye çekilir. Aşama 2'de oturumlar uygulamanın belleğinde
tutuluyordu ve container yeniden başlayınca kayboluyordu; Redis'e taşındıktan sonra uygulama
yeniden başlatıldığında aynı çerezle istek hâlâ kabul edilir. Redis'in kendisi de AOF ile
(`--appendonly yes`) veriyi diske yazdığı için Redis yeniden başlasa da oturumlar kalır.
Çıkışta kayıt silinir ve aynı çerez artık kabul edilmez.

# Aşama 4 · Değişiklik talebi

Yemekhane Müdürlüğü sistem çalışırken iki özellik istedi: öğle ve akşamda %60 fiyatla yarım
porsiyon (kahvaltıda yok, geçmiş rezervasyonlar tam sayılır) ve kullanıcının profilinde seçtiği
alerjenleri içeren yemeklerin menüde uyarıyla gösterilmesi. Değişiklik çalışan sisteme aşağıdaki
sırayla uygulandı. Komut ve çıktıların tamamı `rapor/kanitlar/asama-4.txt` dosyasındadır.

## Migration: `db/init/04_degisiklik.sql`

| Değişiklik | Neden |
|---|---|
| `ogunler.yarim_porsiyon_var` (varsayılan 1, kahvaltıda 0) | "Kahvaltıda yarım porsiyon yok" kuralı koda değil veriye yazıldı |
| `rezervasyonlar.porsiyon ENUM('tam','yarim') DEFAULT 'tam'` | Varsayılan değer sayesinde mevcut bütün rezervasyonlar tam porsiyon olur |
| `kullanici_alerjenleri` tablosu (kullanıcı–alerjen, çoka çok) | Profilde seçilen alerjenler |
| `sp_rezervasyon_yap(kullanici_id, menu_id, porsiyon)` | Porsiyonu denetler, yarımda ücreti `ROUND(fiyat * 0.60, 2)` yapar |

Yordamın geri kalanı (kilitler, son saat, kapasite, bakiye kontrolü, hareket kaydı) olduğu gibi
korundu; değişen satırlar dosyada "YENİ" yorumuyla işaretlidir. Dosya `db/init` klasöründe
olduğu için depoyu sıfırdan kuran biri değişikliği kendiliğinden alır. Çalışan sistemde ise
yalnızca kaynağa uygulandı:

```text
$ docker compose exec -T mysql-primary mysql -uroot -pyemekhane_kok yemekhane < db/init/04_degisiklik.sql
migration tamam
```

## Mevcut veri bozulmadı

```text
$ ... -e "SELECT porsiyon, COUNT(*) AS adet FROM rezervasyonlar GROUP BY porsiyon"
porsiyon  adet
tam       367

$ ... -e "SELECT COUNT(*) AS tutarsiz FROM kullanicilar k
          WHERE k.bakiye <> (SELECT COALESCE(SUM(tutar),0) FROM bakiye_hareketleri h
                              WHERE h.kullanici_id = k.id)"
tutarsiz
0
```

## Değişiklik replikaya geçti (çıktılar replikadan)

```text
$ docker compose exec -T mysql-replica mysql ... -e 'SHOW CREATE TABLE rezervasyonlar\G'
Create Table: CREATE TABLE `rezervasyonlar` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `kullanici_id` int unsigned NOT NULL,
  `menu_id` int unsigned NOT NULL,
  `durum` enum('aktif','kullanildi','iptal') ... NOT NULL DEFAULT 'aktif',
  `porsiyon` enum('tam','yarim') COLLATE utf8mb4_tr_0900_ai_ci NOT NULL DEFAULT 'tam',
  `ucret` decimal(8,2) NOT NULL,
  ...

$ docker compose exec -T mysql-replica mysql ... -e 'SHOW CREATE TABLE kullanici_alerjenleri\G'
Create Table: CREATE TABLE `kullanici_alerjenleri` (
  `kullanici_id` int unsigned NOT NULL,
  `alerjen_id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`kullanici_id`,`alerjen_id`),
  KEY `fk_ka_alerjen` (`alerjen_id`),
  CONSTRAINT `fk_ka_alerjen` FOREIGN KEY (`alerjen_id`) REFERENCES `alerjenler` (`id`),
  CONSTRAINT `fk_ka_kullanici` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar` (`id`) ON DELETE CASCADE
)

$ docker compose exec -T mysql-replica mysql ... -e 'SELECT id, ad, yarim_porsiyon_var FROM ogunler'
id  ad        yarim_porsiyon_var
1   Kahvaltı  0
2   Öğle      1
3   Akşam     1

$ ... information_schema.PARAMETERS (replika) ... sp_rezervasyon_yap
PARAMETER_NAME  DATA_TYPE
p_kullanici_id  int
p_menu_id       int
p_porsiyon      varchar
```

Migration'dan önce replikadaki `rezervasyonlar` tablosunda `porsiyon` sütunu yoktu; replikaya
elle hiçbir şey uygulanmadı, değişiklik replikasyonla geçti.

## Redis'te eski yapıdaki menü kayıtlarının temizlenmesi

Yeni uygulama önbelleğe yazdığı menüye `yarimPorsiyonVar` alanını ekler. Migration'dan önce
yazılmış kayıtlarda bu alan yoktur; temizlenmeseler günün sonuna kadar yarım porsiyon seçeneği
o menülerde görünmezdi. Uygulama yeni sürümle derlendikten sonra yalnızca `menu:*` kayıtları
silindi; `oturum:*` kayıtlarına dokunulmadığı için kullanıcıların oturumu düşmedi.

```text
$ docker compose exec -T redis redis-cli --scan --pattern 'menu:*'
menu:1:2026-11-25:1
menu:1:2026-11-25:3
menu:1:2026-11-25:2

$ docker compose exec -T redis sh -c "redis-cli --scan --pattern 'menu:*' | xargs -r redis-cli DEL"
3

$ docker compose exec -T redis redis-cli --scan --pattern 'menu:*' | wc -l
0

$ docker compose exec -T redis redis-cli GET menu:1:2026-11-25:2 | grep -o '"yarimPorsiyonVar":[a-z]*'
"yarimPorsiyonVar":true
```

## Yarım porsiyon

```text
$ curl ... -X POST /api/rezervasyonlar -d '{"menuId":50,"porsiyon":"yarim"}'     (öğle, tam fiyat 40 TL)
{"rezervasyonId":368,"ucret":24,"bakiye":331,"porsiyon":"yarim"}

$ curl ... -X POST /api/rezervasyonlar -d '{"menuId":49,"porsiyon":"yarim"}'     (kahvaltı)
{"hata":"Bu öğünde yarım porsiyon seçilemez."}

$ ... -e "SELECT id, menu_id, durum, porsiyon, ucret FROM rezervasyonlar WHERE kullanici_id=7 AND menu_id=50"
id   menu_id  durum  porsiyon  ucret
368  50       aktif  yarim     24.00
```

İptalde iade, rezervasyonda saklanan ücret (`ucret`) üzerinden yapıldığı için
`sp_rezervasyon_iptal` değişmeden yarım porsiyonu da doğru iade eder.

## Alerjen uyarısı

Profilde Gluten ve Süt seçildikten sonra aynı menüde bu alerjenleri içeren yemekler işaretlenir:

```text
alerjenUyarisi: True
  Sebze Çorbası -> []
  Izgara Köfte -> ['Gluten']
  Fırın Makarna -> ['Gluten', 'Süt']
  Çoban Salata -> []
```

Önbellekteki menü herkes için aynı kaldığından kullanıcının alerjenleriyle karşılaştırma
önbellekten sonra, her istekte controller'da yapılır.

![Profil: alerjen seçimi](ekran/11-profil-alerjen.png){width=32%} ![Menüde alerjen uyarısı](ekran/12-menu-alerjen-uyari.png){width=32%} ![Haftalık: porsiyon seçimi](ekran/13-haftalik-porsiyon.png){width=32%}

![Rezervasyonlarım: yarım porsiyon](ekran/14-rezervasyon-yarim.png){width=32%}

Haftalık menüde öğle ve akşamda "Tam / Yarım" seçimi çıkar, kahvaltıda çıkmaz; kullanıcının
alerjenini içeren menülerde öğün adının yanında uyarı etiketi görünür.
