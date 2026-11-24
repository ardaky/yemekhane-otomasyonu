const degerlendirmeVerisi = require('../veri/degerlendirmeVerisi');
const rezervasyonVerisi = require('../veri/rezervasyonVerisi');
const { KullaniciHatasi } = require('../hatalar');
const { tamSayi } = require('./yardimci');

// GET /api/degerlendirmeler
async function liste(req, res) {
  const id = req.kullanici.kullaniciId;
  const [bekleyenler, verilenler] = await Promise.all([
    degerlendirmeVerisi.bekleyenler(id),
    degerlendirmeVerisi.verilenler(id),
  ]);
  res.json({ bekleyenler, verilenler });
}

// POST /api/degerlendirmeler  { menuId, puan, yorum }
async function ekle(req, res) {
  const govde = req.body || {};
  const menuId = tamSayi(govde.menuId, 'menü');
  const puan = Number(govde.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) {
    throw new KullaniciHatasi('Puan 1 ile 5 arasında olmalıdır.');
  }
  const yorum = govde.yorum ? String(govde.yorum).trim() : '';
  if (yorum.length > 500) {
    throw new KullaniciHatasi('Yorum en fazla 500 karakter olabilir.');
  }

  // sadece turnikeden geçilmiş (kullanılmış) menüye puan verilebilir
  if (!(await rezervasyonVerisi.kullanildiMi(req.kullanici.kullaniciId, menuId))) {
    throw new KullaniciHatasi('Yalnızca yediğiniz bir menüyü değerlendirebilirsiniz.');
  }
  const eklendi = await degerlendirmeVerisi.ekle(req.kullanici.kullaniciId, menuId, puan, yorum || null);
  if (!eklendi) {
    throw new KullaniciHatasi('Bu menüyü zaten değerlendirdiniz.', 409);
  }
  res.status(201).json({ tamam: true });
}

module.exports = { liste, ekle };
