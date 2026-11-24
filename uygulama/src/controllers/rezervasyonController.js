const rezervasyonVerisi = require('../veri/rezervasyonVerisi');
const { KullaniciHatasi } = require('../hatalar');
const { tamSayi } = require('./yardimci');

// POST /api/rezervasyonlar  { menuId, porsiyon }
// Procedure kaynakta çalışıp yeni bakiyeyi döndürüyor. Ekranda bu bakiyeyi
// gösteriyoruz; replikadan okusaydık replikasyon gecikmesi yüzünden eski
// bakiye görünebilirdi.
async function yap(req, res) {
  const menuId = tamSayi(req.body && req.body.menuId, 'menü');
  const porsiyon = (req.body && req.body.porsiyon) || 'tam';
  if (porsiyon !== 'tam' && porsiyon !== 'yarim') {
    throw new KullaniciHatasi('Geçersiz porsiyon seçimi.');
  }
  const sonuc = await rezervasyonVerisi.yap(req.kullanici.kullaniciId, menuId, porsiyon);
  res.status(201).json({
    rezervasyonId: sonuc.rezervasyon_id,
    ucret: sonuc.ucret,
    bakiye: sonuc.bakiye,
    porsiyon: sonuc.porsiyon,
  });
}

// POST /api/rezervasyonlar/:id/iptal
async function iptal(req, res) {
  const rezervasyonId = tamSayi(req.params.id, 'rezervasyon');
  const sonuc = await rezervasyonVerisi.iptal(req.kullanici.kullaniciId, rezervasyonId);
  res.json({ rezervasyonId: sonuc.rezervasyon_id, iade: sonuc.iade, bakiye: sonuc.bakiye });
}

// GET /api/rezervasyonlar
async function listele(req, res) {
  const satirlar = await rezervasyonVerisi.listele(req.kullanici.kullaniciId);
  res.json(
    satirlar.map((s) => ({
      id: s.id,
      durum: s.durum,
      porsiyon: s.porsiyon,
      ucret: s.ucret,
      menuId: s.menu_id,
      tarih: s.tarih,
      ogun: s.ogun,
      yemekhane: s.yemekhane,
      iptalEdilebilir: s.iptal_edilebilir === 1,
      puan: s.puan,
    }))
  );
}

module.exports = { yap, iptal, listele };
