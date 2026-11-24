const yoneticiVerisi = require('../veri/yoneticiVerisi');
const menuOnbellegi = require('../onbellek/menuOnbellegi');
const { KullaniciHatasi } = require('../hatalar');
const { tamSayi, tarih, bugun } = require('./yardimci');

// GET /api/yonetici/rapor?baslangic=...&bitis=...  (en fazla 62 gün)
async function rapor(req, res) {
  const baslangic = req.query.baslangic ? tarih(req.query.baslangic) : bugun();
  const bitis = req.query.bitis ? tarih(req.query.bitis) : baslangic;
  const gunFarki = (new Date(bitis) - new Date(baslangic)) / 86400000;
  if (gunFarki < 0) throw new KullaniciHatasi('Bitiş tarihi başlangıçtan önce olamaz.');
  if (gunFarki > 62) throw new KullaniciHatasi('En fazla iki aylık rapor alınabilir.');
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

// kuruşa yuvarlanmış hali 0,50 ile 10.000 TL arasında olmalı
function fiyat(deger, ad) {
  const sayi = (typeof deger === 'number' || typeof deger === 'string') && deger !== '' ? Number(deger) : NaN;
  const yuvarlak = Math.round(sayi * 100) / 100;
  if (!(yuvarlak >= 0.5 && yuvarlak <= 10000)) {
    throw new KullaniciHatasi(`${ad} 0,50 ile 10.000 TL arasında olmalıdır.`);
  }
  return yuvarlak;
}

// fiyatlar ve yemek listesi
function menuBilgisi(govde) {
  const yemekIdler = Array.isArray(govde.yemekIdler)
    ? [...new Set(govde.yemekIdler.map((id) => tamSayi(id, 'yemek')))]
    : [];
  if (yemekIdler.length === 0) {
    throw new KullaniciHatasi('Menüye en az bir yemek ekleyin.');
  }
  return {
    ogrenciFiyati: fiyat(govde.ogrenciFiyati, 'Öğrenci fiyatı'),
    personelFiyati: fiyat(govde.personelFiyati, 'Personel fiyatı'),
    yemekIdler,
  };
}

// POST /api/yonetici/menuler
async function olustur(req, res) {
  const govde = req.body || {};
  const menu = {
    yemekhaneId: tamSayi(govde.yemekhaneId, 'yemekhane'),
    tarih: tarih(govde.tarih),
    ogunId: tamSayi(govde.ogunId, 'öğün'),
    ...menuBilgisi(govde),
  };
  if (menu.tarih < bugun()) {
    throw new KullaniciHatasi('Geçmiş bir tarihe menü eklenemez.');
  }
  const menuId = await yoneticiVerisi.menuOlustur(menu);
  if (!menuId) {
    throw new KullaniciHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.', 409);
  }
  res.status(201).json({ menuId });
}

// PUT /api/yonetici/menuler/:id
// Menü değişince önbellekteki eski hali siliniyor, sonraki istek yenisini okuyor.
async function guncelle(req, res) {
  const menuId = tamSayi(req.params.id, 'menü');
  const bilgi = menuBilgisi(req.body || {});
  const eski = await yoneticiVerisi.menuGetir(menuId);
  if (!eski) throw new KullaniciHatasi('Menü bulunamadı.', 404);
  // geçmiş menüler yenmiş ve puanlanmış olabilir, içerikleri değişmesin
  if (eski.tarih < bugun()) throw new KullaniciHatasi('Geçmiş menüler değiştirilemez.');
  const m = await yoneticiVerisi.menuGuncelle(menuId, bilgi);
  if (!m) throw new KullaniciHatasi('Menü bulunamadı.', 404);
  await menuOnbellegi.sil(m.yemekhane_id, m.tarih, m.ogun_id);
  res.json({ menuId });
}

module.exports = { rapor, yemekler, menuGetir, olustur, guncelle };
