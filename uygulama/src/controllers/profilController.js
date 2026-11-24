// Profil · alerjen seçimi (Aşama 4)
const alerjenVerisi = require('../veri/alerjenVerisi');
const { KullaniciHatasi } = require('../hatalar');
const { tamSayi } = require('./yardimci');

// GET /api/profil/alerjenler
async function alerjenler(req, res) {
  const [tumu, secili] = await Promise.all([
    alerjenVerisi.tumu(),
    alerjenVerisi.kullanicininkiler(req.kullanici.kullaniciId),
  ]);
  res.json({ tumu, secili });
}

// PUT /api/profil/alerjenler  { alerjenIdler: [1, 7] }
async function alerjenleriKaydet(req, res) {
  const liste = req.body && req.body.alerjenIdler;
  if (!Array.isArray(liste)) {
    throw new KullaniciHatasi('Alerjen listesi gönderilmedi.');
  }
  const idler = [...new Set(liste.map((id) => tamSayi(id, 'alerjen')))];
  await alerjenVerisi.kaydet(req.kullanici.kullaniciId, idler);
  res.json({ secili: idler });
}

module.exports = { alerjenler, alerjenleriKaydet };
