const { yazma, okuma } = require('./baglanti');

// Girişte kullanılıyor. Kaynaktan okuyoruz, yeni eklenen bir kullanıcı replikaya
// henüz geçmemiş olabilir.
async function epostaIleBul(eposta) {
  const [satirlar] = await yazma.query(
    `SELECT id, ad, soyad, eposta, sifre_hash, rol, aktif
       FROM kullanicilar WHERE eposta = ?`,
    [eposta]
  );
  return satirlar[0] || null;
}

async function profil(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT id, ad, soyad, eposta, rol, ogrenci_no, bakiye
       FROM kullanicilar WHERE id = ?`,
    [kullaniciId]
  );
  return satirlar[0] || null;
}

module.exports = { epostaIleBul, profil };
