// Alerjen sorguları (Aşama 4: kullanıcının alerjenleri)
const { yazma, okuma } = require('./baglanti');

async function tumu() {
  const [satirlar] = await okuma.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

// Kullanıcının seçtiği alerjenlerin id'leri · replikadan
async function kullanicininkiler(kullaniciId) {
  const [satirlar] = await okuma.query(
    'SELECT alerjen_id FROM kullanici_alerjenleri WHERE kullanici_id = ?',
    [kullaniciId]
  );
  return satirlar.map((s) => s.alerjen_id);
}

// Kullanıcının alerjenlerinin adları · menü uyarısı için, replikadan.
// (v_menu_detay alerjen adlarını alfabetik, id'leri sayı sırasıyla verir; iki listeyi
// sıra ile eşleştirmek yanlış olur, bu yüzden adlar üzerinden karşılaştırılır.)
async function kullanicininAdlari(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT a.ad FROM kullanici_alerjenleri ka
       JOIN alerjenler a ON a.id = ka.alerjen_id
      WHERE ka.kullanici_id = ?`,
    [kullaniciId]
  );
  return satirlar.map((s) => s.ad);
}

// Seçimi tek transaction'da yeniler: eskileri silip yenileri ekler
async function kaydet(kullaniciId, alerjenIdler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdler.length > 0) {
      await baglanti.query(
        'INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?',
        [alerjenIdler.map((id) => [kullaniciId, id])]
      );
    }
    await baglanti.commit();
  } catch (err) {
    await baglanti.rollback();
    throw err;
  } finally {
    baglanti.release();
  }
}

module.exports = { tumu, kullanicininkiler, kullanicininAdlari, kaydet };
