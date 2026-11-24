// Controller'ların ortak kullandığı küçük yardımcılar
const { KullaniciHatasi } = require('../hatalar');

// Pozitif tam sayı bekleyen parametreler için (id'ler)
function tamSayi(deger, alanAdi) {
  const sayi = Number(deger);
  if (!Number.isInteger(sayi) || sayi <= 0) {
    throw new KullaniciHatasi(`Geçersiz ${alanAdi}.`);
  }
  return sayi;
}

// 'YYYY-AA-GG' biçiminde tarih
function tarih(deger, alanAdi = 'tarih') {
  if (typeof deger !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deger)) {
    throw new KullaniciHatasi(`Geçersiz ${alanAdi}.`);
  }
  return deger;
}

// Container'da TZ=Europe/Istanbul tanımlı, yerel tarih İstanbul tarihidir
function bugun() {
  const s = new Date();
  const iki = (n) => String(n).padStart(2, '0');
  return `${s.getFullYear()}-${iki(s.getMonth() + 1)}-${iki(s.getDate())}`;
}

// İş kuralı: öğrenci öğrenci fiyatını, personel ve yönetici personel fiyatını öder
function rolFiyati(rol, ogrenciFiyati, personelFiyati) {
  return rol === 'ogrenci' ? ogrenciFiyati : personelFiyati;
}

// Aşama 4: yarım porsiyon tam fiyatın %60'ı. Asıl hesap sp_rezervasyon_yap'tadır;
// bu fonksiyon yalnızca arayüzde gösterilecek fiyat içindir.
function yarimFiyat(fiyat) {
  return Math.round(fiyat * 60) / 100;
}

module.exports = { tamSayi, tarih, bugun, rolFiyati, yarimFiyat };
