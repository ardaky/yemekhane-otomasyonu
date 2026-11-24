const { yazma, okuma, yordam } = require('./baglanti');

// para hareketi olan işlemleri hocanın verdiği procedure'ler yapıyor
function yap(kullaniciId, menuId, porsiyon) {
  return yordam('sp_rezervasyon_yap', [kullaniciId, menuId, porsiyon]);
}

function iptal(kullaniciId, rezervasyonId) {
  return yordam('sp_rezervasyon_iptal', [kullaniciId, rezervasyonId]);
}

async function listele(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT r.id, r.durum, r.porsiyon, r.ucret,
            m.id AS menu_id, m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            (r.durum = 'aktif' AND NOW() < TIMESTAMP(m.tarih, o.son_saat)) AS iptal_edilebilir,
            d.puan
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       LEFT JOIN degerlendirmeler d ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

// değerlendirme kaydetmeden hemen önce bakılıyor, o yüzden kaynaktan
async function kullanildiMi(kullaniciId, menuId) {
  const [satirlar] = await yazma.query(
    `SELECT 1 FROM rezervasyonlar
      WHERE kullanici_id = ? AND menu_id = ? AND durum = 'kullanildi'`,
    [kullaniciId, menuId]
  );
  return satirlar.length > 0;
}

module.exports = { yap, iptal, listele, kullanildiMi };
