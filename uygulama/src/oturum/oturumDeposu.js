// =====================================================================
// Oturum deposu
// Oturum bilgisi token -> { kullaniciId, rol, ad } olarak saklanır.
// Süre 30 dakikadır ve her istekte yenilenir.
// Aşama 2: uygulamanın belleğinde (Map) tutulur. Uygulama yeniden
// başlarsa oturumlar kaybolur; Aşama 3'te Redis'e taşınacak.
// =====================================================================
const crypto = require('crypto');

const SURE_MS = 30 * 60 * 1000;
const oturumlar = new Map();

async function olustur(bilgi) {
  const token = crypto.randomBytes(32).toString('hex');
  oturumlar.set(token, { bilgi, bitis: Date.now() + SURE_MS });
  return token;
}

// Token geçerliyse oturum bilgisini döndürür ve süreyi 30 dakika uzatır
async function getirVeYenile(token) {
  const kayit = oturumlar.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    oturumlar.delete(token);
    return null;
  }
  kayit.bitis = Date.now() + SURE_MS;
  return kayit.bilgi;
}

async function sil(token) {
  oturumlar.delete(token);
}

module.exports = { olustur, getirVeYenile, sil, SURE_MS };
