const { yazma, okuma } = require('./baglanti');

async function tumu() {
  const [satirlar] = await okuma.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return satirlar;
}

// Kullanıcının kendi seçimi. Kaydettikten hemen sonra okunabildiği için
// (profil sayfası, menüdeki uyarı) kaynaktan okuyoruz.
async function kullanicininkiler(kullaniciId) {
  const [satirlar] = await yazma.query(
    'SELECT alerjen_id FROM kullanici_alerjenleri WHERE kullanici_id = ?',
    [kullaniciId]
  );
  return satirlar.map((s) => s.alerjen_id);
}

// Menüdeki yemeklerle karşılaştırmak için alerjen adları lazım
// (v_menu_detay alerjenleri ad olarak veriyor). Bu da kaynaktan.
async function kullanicininAdlari(kullaniciId) {
  const [satirlar] = await yazma.query(
    `SELECT a.ad FROM kullanici_alerjenleri ka
       JOIN alerjenler a ON a.id = ka.alerjen_id
      WHERE ka.kullanici_id = ?`,
    [kullaniciId]
  );
  return satirlar.map((s) => s.ad);
}

// eski seçimi silip yenisini yazıyor
async function kaydet(kullaniciId, alerjenIdler) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    await baglanti.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIdler.length > 0) {
      await baglanti.query('INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?', [
        alerjenIdler.map((id) => [kullaniciId, id]),
      ]);
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
