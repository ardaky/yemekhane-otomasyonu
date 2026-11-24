// Günün menüsü ve haftalık menü
const menuVerisi = require('../veri/menuVerisi');
const { tamSayi, tarih, bugun, rolFiyati } = require('./yardimci');

async function secenekler(req, res) {
  const [yemekhaneler, ogunler] = await Promise.all([
    menuVerisi.yemekhaneler(),
    menuVerisi.ogunler(),
  ]);
  res.json({ yemekhaneler, ogunler, bugun: bugun() });
}

// GET /api/menu?yemekhane=1&tarih=2026-11-24&ogun=2
async function gununMenusu(req, res) {
  const yemekhaneId = tamSayi(req.query.yemekhane, 'yemekhane');
  const ogunId = tamSayi(req.query.ogun, 'öğün');
  const gun = req.query.tarih ? tarih(req.query.tarih) : bugun();

  const menu = await menuVerisi.gununMenusu(yemekhaneId, gun, ogunId);
  if (!menu) {
    return res.json({ menu: null });
  }

  // Toplam kaloriyi uygulama toplar (view her yemek için ayrı satır verir)
  const toplamKalori = menu.yemekler.reduce((toplam, y) => toplam + y.kalori, 0);
  const fiyat = rolFiyati(req.kullanici.rol, menu.ogrenciFiyati, menu.personelFiyati);
  res.json({ menu: { ...menu, toplamKalori, fiyat } });
}

// GET /api/menuler/haftalik?yemekhane=1&baslangic=2026-11-24
async function haftalik(req, res) {
  const yemekhaneId = tamSayi(req.query.yemekhane, 'yemekhane');
  const baslangic = req.query.baslangic ? tarih(req.query.baslangic) : bugun();
  const satirlar = await menuVerisi.haftalik(yemekhaneId, baslangic, req.kullanici.kullaniciId);

  const menuler = satirlar.map((s) => ({
    menuId: s.menu_id,
    tarih: s.tarih,
    ogunId: s.ogun_id,
    ogun: s.ogun,
    yemekler: s.yemekler,
    kapasite: s.kapasite,
    bosYer: Number(s.bos_yer),
    rezervasyonSon: s.rezervasyon_son,
    suresiDoldu: s.suresi_doldu === 1,
    fiyat: rolFiyati(req.kullanici.rol, s.ogrenci_fiyati, s.personel_fiyati),
    rezervasyonId: s.rezervasyon_id,
    rezervasyonDurum: s.rezervasyon_durum,
  }));
  res.json({ baslangic, menuler });
}

module.exports = { secenekler, gununMenusu, haftalik };
