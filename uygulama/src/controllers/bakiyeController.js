const bakiyeVerisi = require('../veri/bakiyeVerisi');
const { KullaniciHatasi } = require('../hatalar');

// GET /api/bakiye
async function ozet(req, res) {
  res.json(await bakiyeVerisi.ozet(req.kullanici.kullaniciId));
}

// POST /api/bakiye/yukle  { tutar }
// 10-1000 TL sınırını procedure kontrol ediyor
async function yukle(req, res) {
  const girilen = req.body && req.body.tutar;
  const tutar = typeof girilen === 'number' || (typeof girilen === 'string' && /^\d+([.,]\d{1,2})?$/.test(girilen.trim()))
    ? Number(String(girilen).replace(',', '.'))
    : NaN;
  if (!Number.isFinite(tutar) || Math.round(tutar * 100) !== tutar * 100) {
    throw new KullaniciHatasi('Geçerli bir tutar girin (en fazla iki ondalık).');
  }
  const sonuc = await bakiyeVerisi.yukle(req.kullanici.kullaniciId, tutar);
  res.status(201).json({ hareketId: sonuc.hareket_id, bakiye: sonuc.bakiye });
}

module.exports = { ozet, yukle };
