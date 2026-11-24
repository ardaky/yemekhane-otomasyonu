// Kullanıcı sorguları
const { yazma, okuma } = require('./baglanti');

// Girişte kullanılır. Kaynaktan okunur: yeni açılmış ya da şifresi yeni
// değişmiş bir hesap replikaya henüz geçmemiş olabilir.
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
