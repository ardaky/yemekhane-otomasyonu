// =====================================================================
// Hata yönetimi
// Kullanıcıya gösterilecek hatalar JSON olarak { hata: "mesaj" } döner.
//   * Stored procedure hataları (SQLSTATE 45000): Türkçe mesaj olduğu gibi iletilir.
//   * KullaniciHatasi: uygulamanın kendi kural hataları (ör. "Puan 1-5 arası olmalı").
//   * Diğer her şey (CHECK ihlali 3819 dahil) programlama hatasıdır: günlüğe yazılır,
//     kullanıcıya ham hali gösterilmez.
// =====================================================================
class KullaniciHatasi extends Error {
  constructor(mesaj, durum = 400) {
    super(mesaj);
    this.durum = durum;
  }
}

// Express, dört parametreli middleware'i hata yakalayıcı olarak tanır
function hataYakalayici(err, req, res, next) {
  if (err instanceof KullaniciHatasi) {
    return res.status(err.durum).json({ hata: err.message });
  }
  if (err.sqlState === '45000') {
    return res.status(400).json({ hata: err.sqlMessage || err.message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ hata: 'İstek gövdesi okunamadı.' });
  }
  console.error(`[hata] ${req.method} ${req.originalUrl}:`, err.code || '', err.message);
  res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' });
}

module.exports = { KullaniciHatasi, hataYakalayici };
