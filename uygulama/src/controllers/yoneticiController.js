// Yönetici paneli: menü oluşturma/düzenleme, doluluk ve puan raporu
const yoneticiVerisi = require('../veri/yoneticiVerisi');
const { KullaniciHatasi } = require('../hatalar');
const { tamSayi, tarih, bugun } = require('./yardimci');

// GET /api/yonetici/rapor?baslangic=...&bitis=...
async function rapor(req, res) {
  const baslangic = req.query.baslangic ? tarih(req.query.baslangic) : bugun();
  const bitis = req.query.bitis ? tarih(req.query.bitis) : baslangic;
  res.json(await yoneticiVerisi.menuRaporu(baslangic, bitis));
}

// GET /api/yonetici/yemekler
async function yemekler(req, res) {
  res.json(await yoneticiVerisi.tumYemekler());
}

// GET /api/yonetici/menuler/:id
async function menuGetir(req, res) {
  const menu = await yoneticiVerisi.menuGetir(tamSayi(req.params.id, 'menü'));
  if (!menu) throw new KullaniciHatasi('Menü bulunamadı.', 404);
  res.json(menu);
}

// Formdan gelen fiyat ve yemek listesini denetler
function menuGovdesi(govde) {
  const ogrenciFiyati = Number(govde.ogrenciFiyati);
  const personelFiyati = Number(govde.personelFiyati);
  if (!(ogrenciFiyati >= 0) || !(personelFiyati >= 0)) {
    throw new KullaniciHatasi('Fiyatlar sıfır ya da pozitif bir sayı olmalıdır.');
  }
  const yemekIdler = Array.isArray(govde.yemekIdler)
    ? [...new Set(govde.yemekIdler.map((id) => tamSayi(id, 'yemek')))]
    : [];
  if (yemekIdler.length === 0) {
    throw new KullaniciHatasi('Menüye en az bir yemek ekleyin.');
  }
  return { ogrenciFiyati, personelFiyati, yemekIdler };
}

// POST /api/yonetici/menuler
async function olustur(req, res) {
  const govde = req.body || {};
  const menu = {
    yemekhaneId: tamSayi(govde.yemekhaneId, 'yemekhane'),
    tarih: tarih(govde.tarih),
    ogunId: tamSayi(govde.ogunId, 'öğün'),
    ...menuGovdesi(govde),
  };
  const menuId = await yoneticiVerisi.menuOlustur(menu);
  res.status(201).json({ menuId });
}

// PUT /api/yonetici/menuler/:id
async function guncelle(req, res) {
  const menuId = tamSayi(req.params.id, 'menü');
  await yoneticiVerisi.menuGuncelle(menuId, menuGovdesi(req.body || {}));
  res.json({ menuId });
}

module.exports = { rapor, yemekler, menuGetir, olustur, guncelle };
