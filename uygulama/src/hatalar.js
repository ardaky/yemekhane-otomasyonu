// Kullanıcıya gösterilecek hatalar için kendi hata sınıfımız
class KullaniciHatasi extends Error {
  constructor(mesaj, durum = 400) {
    super(mesaj);
    this.durum = durum;
  }
}

// MySQL'in kullanıcı girdisinden kaynaklanan hataları anlaşılır mesaja çeviriyoruz
const VERITABANI_MESAJLARI = {
  ER_NO_REFERENCED_ROW_2: 'Seçilen kayıt bulunamadı.',
  ER_TRUNCATED_WRONG_VALUE: 'Geçersiz tarih.',
  ER_WRONG_VALUE: 'Geçersiz değer.',
  ER_WARN_DATA_OUT_OF_RANGE: 'Girilen değer çok büyük.',
};

function hataYakalayici(err, req, res, next) {
  if (err instanceof KullaniciHatasi) {
    return res.status(err.durum).json({ hata: err.message });
  }
  // stored procedure'lerin SIGNAL ile verdiği Türkçe mesajlar olduğu gibi gidiyor
  if (err.sqlState === '45000') {
    return res.status(400).json({ hata: err.sqlMessage || err.message });
  }
  if (VERITABANI_MESAJLARI[err.code]) {
    return res.status(400).json({ hata: VERITABANI_MESAJLARI[err.code] });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek okunamadı.' });
  }
  // geri kalanlar bizim hatamız, kullanıcıya ayrıntı göstermiyoruz
  console.error(`[hata] ${req.method} ${req.originalUrl}:`, err.code || '', err.message);
  res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' });
}

module.exports = { KullaniciHatasi, hataYakalayici };
