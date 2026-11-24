// Menü sorguları · hepsi okuma, replikadan
const { okuma } = require('./baglanti');

async function yemekhaneler() {
  const [satirlar] = await okuma.query(
    'SELECT id, ad, kapasite FROM yemekhaneler ORDER BY id'
  );
  return satirlar;
}

async function ogunler() {
  const [satirlar] = await okuma.query(
    'SELECT id, ad, son_saat FROM ogunler ORDER BY sira'
  );
  return satirlar;
}

// Günün menüsü: bir yemekhane + tarih + öğün için menü ve yemekleri.
// Kullanıcıya özel bilgi içermez, bu yüzden önbelleğe alınabilir (Aşama 3).
async function gununMenusu(yemekhaneId, tarih, ogunId) {
  const [satirlar] = await okuma.query(
    `SELECT menu_id, tarih, yemekhane, ogun, rezervasyon_son,
            ogrenci_fiyati, personel_fiyati,
            yemek_id, yemek, kategori, kalori, vejetaryen, alerjenler, alerjen_idler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?
      ORDER BY kategori_sira, yemek`,
    [yemekhaneId, tarih, ogunId]
  );
  if (satirlar.length === 0) return null;

  const ilk = satirlar[0];
  return {
    menuId: ilk.menu_id,
    tarih: ilk.tarih,
    yemekhane: ilk.yemekhane,
    ogun: ilk.ogun,
    rezervasyonSon: ilk.rezervasyon_son,
    ogrenciFiyati: ilk.ogrenci_fiyati,
    personelFiyati: ilk.personel_fiyati,
    yemekler: satirlar.map((s) => ({
      id: s.yemek_id,
      ad: s.yemek,
      kategori: s.kategori,
      kalori: s.kalori,
      vejetaryen: s.vejetaryen === 1,
      alerjenler: s.alerjenler ? s.alerjenler.split(', ') : [],
      alerjenIdler: s.alerjen_idler ? s.alerjen_idler.split(',').map(Number) : [],
    })),
  };
}

// Haftalık menü: başlangıç tarihinden itibaren 7 gün.
// Boş yer, süre bilgisi ve kullanıcının o menüdeki rezervasyon durumu birlikte gelir.
// Son saat karşılaştırması veritabanında yapılır (NOW() >= rezervasyon_son).
async function haftalik(yemekhaneId, baslangic, kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.ogun_id, d.ogun, d.kapasite, d.bos_yer,
            d.rezervasyon_son, (NOW() >= d.rezervasyon_son) AS suresi_doldu,
            m.ogrenci_fiyati, m.personel_fiyati,
            r.id AS rezervasyon_id, r.durum AS rezervasyon_durum,
            (SELECT GROUP_CONCAT(vd.yemek ORDER BY vd.kategori_sira, vd.yemek SEPARATOR ' · ')
               FROM v_menu_detay vd WHERE vd.menu_id = d.menu_id) AS yemekler
       FROM v_menu_doluluk d
       JOIN menuler m ON m.id = d.menu_id
       JOIN ogunler o ON o.id = d.ogun_id
       LEFT JOIN rezervasyonlar r ON r.menu_id = d.menu_id AND r.kullanici_id = ?
      WHERE d.yemekhane_id = ?
        AND d.tarih BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
      ORDER BY d.tarih, o.sira`,
    [kullaniciId, yemekhaneId, baslangic, baslangic]
  );
  return satirlar;
}

module.exports = { yemekhaneler, ogunler, gununMenusu, haftalik };
