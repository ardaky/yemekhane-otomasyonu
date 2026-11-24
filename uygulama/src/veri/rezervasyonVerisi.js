// Rezervasyon sorguları
const { yazma, okuma, yordam } = require('./baglanti');

// Para hareketi yapan işlemler stored procedure ile, kaynakta yapılır
function yap(kullaniciId, menuId) {
  return yordam('sp_rezervasyon_yap', [kullaniciId, menuId]);
}

function iptal(kullaniciId, rezervasyonId) {
  return yordam('sp_rezervasyon_iptal', [kullaniciId, rezervasyonId]);
}

// Rezervasyonlarım listesi · replikadan
async function listele(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT r.id, r.durum, r.ucret, r.olusturma, r.kullanma_zamani, r.iptal_zamani,
            m.id AS menu_id, m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            TIMESTAMP(m.tarih, o.son_saat) AS rezervasyon_son,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir,
            d.puan
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       LEFT JOIN degerlendirmeler d
              ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

// Değerlendirme yazılmadan hemen önce kontrol edilir; yazmayla tutarlı
// olsun diye kaynaktan okunur.
async function kullanildiMi(kullaniciId, menuId) {
  const [satirlar] = await yazma.query(
    `SELECT 1 FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId]
  );
  return satirlar.length > 0;
}

module.exports = { yap, iptal, listele, kullanildiMi };
