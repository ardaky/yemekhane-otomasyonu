const { okuma, yordam } = require('./baglanti');

function yukle(kullaniciId, tutar) {
  return yordam('sp_bakiye_yukle', [kullaniciId, tutar]);
}

// güncel bakiye ve son 50 hareket
async function ozet(kullaniciId) {
  const [[kullanici]] = await okuma.query('SELECT bakiye FROM kullanicilar WHERE id = ?', [kullaniciId]);
  const [hareketler] = await okuma.query(
    `SELECT id, tur, tutar, aciklama, olusturma
       FROM bakiye_hareketleri
      WHERE kullanici_id = ?
      ORDER BY olusturma DESC, id DESC
      LIMIT 50`,
    [kullaniciId]
  );
  return { bakiye: kullanici ? kullanici.bakiye : 0, hareketler };
}

module.exports = { yukle, ozet };
