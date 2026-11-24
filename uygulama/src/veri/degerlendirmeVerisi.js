// Değerlendirme sorguları
const { yazma, okuma } = require('./baglanti');
const { KullaniciHatasi } = require('../hatalar');

async function ekle(kullaniciId, menuId, puan, yorum) {
  try {
    await yazma.query(
      'INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum) VALUES (?, ?, ?, ?)',
      [kullaniciId, menuId, puan, yorum]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new KullaniciHatasi('Bu menüyü zaten değerlendirdiniz.', 409);
    }
    throw err;
  }
}

// Kullanılmış ama henüz değerlendirilmemiş menüler · replikadan
async function bekleyenler(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT r.menu_id, m.tarih, o.ad AS ogun, yh.ad AS yemekhane,
            (SELECT GROUP_CONCAT(vd.yemek ORDER BY vd.kategori_sira, vd.yemek SEPARATOR ' · ')
               FROM v_menu_detay vd WHERE vd.menu_id = r.menu_id) AS yemekler
       FROM rezervasyonlar r
       JOIN menuler m       ON m.id  = r.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
       LEFT JOIN degerlendirmeler d
              ON d.menu_id = r.menu_id AND d.kullanici_id = r.kullanici_id
      WHERE r.kullanici_id = ? AND r.durum = 'kullanildi' AND d.id IS NULL
      ORDER BY m.tarih DESC, o.sira DESC`,
    [kullaniciId]
  );
  return satirlar;
}

// Kullanıcının daha önce verdiği puanlar · replikadan
async function verilenler(kullaniciId) {
  const [satirlar] = await okuma.query(
    `SELECT d.menu_id, d.puan, d.yorum, d.olusturma, m.tarih, o.ad AS ogun, yh.ad AS yemekhane
       FROM degerlendirmeler d
       JOIN menuler m       ON m.id  = d.menu_id
       JOIN ogunler o       ON o.id  = m.ogun_id
       JOIN yemekhaneler yh ON yh.id = m.yemekhane_id
      WHERE d.kullanici_id = ?
      ORDER BY m.tarih DESC, o.sira DESC
      LIMIT 30`,
    [kullaniciId]
  );
  return satirlar;
}

module.exports = { ekle, bekleyenler, verilenler };
