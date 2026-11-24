// Adres -> controller eşleşmeleri. sunucu.js bunları /api altına bağlıyor,
// yani buradaki '/menu' aslında '/api/menu'.
const express = require('express');
const { girisGerekli, yoneticiGerekli } = require('./oturum/oturumKontrol');
const giris = require('./controllers/girisController');
const menu = require('./controllers/menuController');
const rezervasyon = require('./controllers/rezervasyonController');
const bakiye = require('./controllers/bakiyeController');
const degerlendirme = require('./controllers/degerlendirmeController');
const yonetici = require('./controllers/yoneticiController');
const profil = require('./controllers/profilController');

const rota = express.Router();

rota.get('/', (req, res) => res.json({ durum: 'çalışıyor' }));

rota.post('/giris', giris.giris);
rota.post('/cikis', giris.cikis);

// buradan sonraki her şey giriş istiyor
rota.use(girisGerekli);

rota.get('/ben', giris.ben);

rota.get('/secenekler', menu.secenekler);
rota.get('/menu', menu.gununMenusu);
rota.get('/menuler/haftalik', menu.haftalik);

rota.get('/rezervasyonlar', rezervasyon.listele);
rota.post('/rezervasyonlar', rezervasyon.yap);
rota.post('/rezervasyonlar/:id/iptal', rezervasyon.iptal);

rota.get('/bakiye', bakiye.ozet);
rota.post('/bakiye/yukle', bakiye.yukle);

rota.get('/degerlendirmeler', degerlendirme.liste);
rota.post('/degerlendirmeler', degerlendirme.ekle);

rota.get('/profil/alerjenler', profil.alerjenler);
rota.put('/profil/alerjenler', profil.alerjenleriKaydet);

rota.get('/yonetici/rapor', yoneticiGerekli, yonetici.rapor);
rota.get('/yonetici/yemekler', yoneticiGerekli, yonetici.yemekler);
rota.get('/yonetici/menuler/:id', yoneticiGerekli, yonetici.menuGetir);
rota.post('/yonetici/menuler', yoneticiGerekli, yonetici.olustur);
rota.put('/yonetici/menuler/:id', yoneticiGerekli, yonetici.guncelle);

module.exports = rota;
