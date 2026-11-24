const { KullaniciHatasi } = require('../hatalar');

function tamSayi(deger, alanAdi) {
  const sayi = Number(deger);
  if (!Number.isInteger(sayi) || sayi <= 0) {
    throw new KullaniciHatasi(`Geçersiz ${alanAdi}.`);
  }
  return sayi;
}

// 'YYYY-AA-GG' biçiminde ve gerçekten var olan bir tarih mi (31 Şubat gibi değil)
function tarih(deger) {
  const uygun = typeof deger === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deger);
  const d = uygun ? new Date(deger + 'T00:00:00Z') : null;
  if (!d || isNaN(d) || d.toISOString().slice(0, 10) !== deger) {
    throw new KullaniciHatasi('Geçersiz tarih.');
  }
  return deger;
}

// container'da TZ=Europe/Istanbul tanımlı
function bugun() {
  const s = new Date();
  const iki = (n) => String(n).padStart(2, '0');
  return `${s.getFullYear()}-${iki(s.getMonth() + 1)}-${iki(s.getDate())}`;
}

// öğrenci öğrenci fiyatını, personel ve yönetici personel fiyatını öder
function rolFiyati(rol, ogrenciFiyati, personelFiyati) {
  return rol === 'ogrenci' ? ogrenciFiyati : personelFiyati;
}

// Yarım porsiyon tam fiyatın %60'ı. Asıl ücreti sp_rezervasyon_yap hesaplıyor,
// bu sadece ekranda göstermek için.
function yarimFiyat(fiyat) {
  return Math.round(fiyat * 60) / 100;
}

module.exports = { tamSayi, tarih, bugun, rolFiyati, yarimFiyat };
