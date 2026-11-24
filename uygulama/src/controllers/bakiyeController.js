const bakiyeVerisi = require('../veri/bakiyeVerisi');
const { KullaniciHatasi } = require('../hatalar');

// GET /api/bakiye
async function ozet(req, res) {
  res.json(await bakiyeVerisi.ozet(req.kullanici.kullaniciId));
}

// POST /api/bakiye/yukle  { tutar }
// 10-1000 TL sınırını procedure kontrol ediyor
async function yukle(req, res) {
  const tutar = Number(req.body && req.body.tutar);
  if (!Number.isFinite(tutar)) {
    throw new KullaniciHatasi('Geçerli bir tutar girin.');
  }
  const sonuc = await bakiyeVerisi.yukle(req.kullanici.kullaniciId, tutar);
  res.status(201).json({ hareketId: sonuc.hareket_id, bakiye: sonuc.bakiye });
}

module.exports = { ozet, yukle };
