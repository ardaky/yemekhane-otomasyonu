// Rezervasyon yapma, iptal ve listeleme
const rezervasyonVerisi = require('../veri/rezervasyonVerisi');
const { tamSayi } = require('./yardimci');

// POST /api/rezervasyonlar  { menuId }
// Yordam kaynakta çalışır ve güncel bakiyeyi döndürür. Arayüz rezervasyondan
// hemen sonra bu bakiyeyi gösterir: replikadan okusaydık replikasyon gecikmesi
// yüzünden eski bakiye görünebilirdi.
async function yap(req, res) {
  const menuId = tamSayi(req.body && req.body.menuId, 'menü');
  const sonuc = await rezervasyonVerisi.yap(req.kullanici.kullaniciId, menuId);
  res.status(201).json({
    rezervasyonId: sonuc.rezervasyon_id,
    ucret: sonuc.ucret,
    bakiye: sonuc.bakiye,
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
      ucret: s.ucret,
      menuId: s.menu_id,
      tarih: s.tarih,
      ogun: s.ogun,
      yemekhane: s.yemekhane,
      rezervasyonSon: s.rezervasyon_son,
      iptalEdilebilir: s.iptal_edilebilir === 1,
      kullanmaZamani: s.kullanma_zamani,
      iptalZamani: s.iptal_zamani,
      puan: s.puan,
    }))
  );
}

module.exports = { yap, iptal, listele };
