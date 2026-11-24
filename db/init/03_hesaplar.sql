-- =====================================================================
-- Yemekhane Otomasyonu · Test hesaplarının düzenlenmesi
-- Örnek veri (02) yüklendikten sonra çalışır.
--   * Öğrenci e-postası öğrenci numarasından üretilir:  251229001@ktun.edu.tr
--     (25: giriş yılı, 1229: fakülte/bölüm, 001: sıra)
--   * Personel ve yönetici:                             ad.soyad@ktun.edu.tr
--   * Bütün test hesaplarının şifresi: 12345  (bcrypt, $2a$, cost 10)
-- Yalnızca kimlik bilgileri değişir; bakiye, rezervasyon ve hareketlere dokunulmaz.
-- =====================================================================
SET NAMES utf8mb4;
USE yemekhane;

UPDATE kullanicilar
   SET eposta = CONCAT(ogrenci_no, '@ktun.edu.tr')
 WHERE rol = 'ogrenci';

UPDATE kullanicilar
   SET eposta = REPLACE(eposta, '@kampus.edu.tr', '@ktun.edu.tr')
 WHERE rol IN ('personel', 'yonetici');

UPDATE kullanicilar
   SET sifre_hash = '$2a$10$OgPzOzBFKbzm6jQyCt.Ht.RbwtOklmGf1Xvbw86St42lp5LWZwX5G';
