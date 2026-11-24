const menuVerisi = require('../veri/menuVerisi');
const alerjenVerisi = require('../veri/alerjenVerisi');
const menuOnbellegi = require('../onbellek/menuOnbellegi');
const { tamSayi, tarih, bugun, rolFiyati, yarimFiyat } = require('./yardimci');

// GET /api/secenekler  (yemekhane ve öğün listeleri)
async function secenekler(req, res) {
  const [yemekhaneler, ogunler] = await Promise.all([menuVerisi.yemekhaneler(), menuVerisi.ogunler()]);
  res.json({ yemekhaneler, ogunler, bugun: bugun() });
}

// GET /api/menu?yemekhane=1&tarih=2026-11-24&ogun=2
async function gununMenusu(req, res) {
  const yemekhaneId = tamSayi(req.query.yemekhane, 'yemekhane');
  const ogunId = tamSayi(req.query.ogun, 'öğün');
  const gun = req.query.tarih ? tarih(req.query.tarih) : bugun();

  // önce Redis, yoksa veritabanı
  let menu = await menuOnbellegi.getir(yemekhaneId, gun, ogunId);
  if (!menu) {
    menu = await menuVerisi.gununMenusu(yemekhaneId, gun, ogunId);
    if (!menu) return res.json({ menu: null });
    await menuOnbellegi.yaz(yemekhaneId, gun, ogunId, menu);
  }

  const fiyat = rolFiyati(req.kullanici.rol, menu.ogrenciFiyati, menu.personelFiyati);
  const toplamKalori = menu.yemekler.reduce((toplam, y) => toplam + y.kalori, 0);

  // kullanıcının seçtiği alerjenleri içeren yemekleri işaretle
  const alerjenlerim = await alerjenVerisi.kullanicininAdlari(req.kullanici.kullaniciId);
  const yemekler = menu.yemekler.map((y) => ({
    ...y,
    uyarilar: y.alerjenler.filter((ad) => alerjenlerim.includes(ad)),
  }));

  res.json({
    menu: {
      ...menu,
      yemekler,
      fiyat,
      toplamKalori,
      yarimFiyat: menu.yarimPorsiyonVar ? yarimFiyat(fiyat) : null,
      alerjenUyarisi: yemekler.some((y) => y.uyarilar.length > 0),
    },
  });
}

// GET /api/menuler/haftalik?yemekhane=1&baslangic=2026-11-24
async function haftalik(req, res) {
  const yemekhaneId = tamSayi(req.query.yemekhane, 'yemekhane');
  const baslangic = req.query.baslangic ? tarih(req.query.baslangic) : bugun();
  const satirlar = await menuVerisi.haftalik(yemekhaneId, baslangic, req.kullanici.kullaniciId);

  const menuler = satirlar.map((s) => {
    const fiyat = rolFiyati(req.kullanici.rol, s.ogrenci_fiyati, s.personel_fiyati);
    return {
      menuId: s.menu_id,
      tarih: s.tarih,
      ogun: s.ogun,
      yemekler: s.yemekler,
      bosYer: Number(s.bos_yer),
      rezervasyonSon: s.rezervasyon_son,
      suresiDoldu: s.suresi_doldu === 1,
      fiyat,
      yarimPorsiyonVar: s.yarim_porsiyon_var === 1,
      yarimFiyat: s.yarim_porsiyon_var === 1 ? yarimFiyat(fiyat) : null,
      rezervasyonDurum: s.rezervasyon_durum,
      rezervasyonPorsiyon: s.rezervasyon_porsiyon,
      alerjenUyarisi: s.alerjen_uyarisi === 1,
    };
  });
  res.json({ baslangic, menuler });
}

module.exports = { secenekler, gununMenusu, haftalik };
