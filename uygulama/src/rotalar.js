// =====================================================================
// Rotalar: hangi adrese gelen istek hangi controller fonksiyonuna gider.
// Bu dosya sunucu.js'te "/api" önekiyle bağlanır; yani buradaki "/menu"
// tarayıcıdan "/api/menu" olarak çağrılır.
// =====================================================================
const express = require('express');
const { girisGerekli, yoneticiGerekli } = require('./oturum/oturumKontrol');
const giris = require('./controllers/girisController');
const menu = require('./controllers/menuController');
const rezervasyon = require('./controllers/rezervasyonController');
const bakiye = require('./controllers/bakiyeController');
const degerlendirme = require('./controllers/degerlendirmeController');
const yonetici = require('./controllers/yoneticiController');

const rota = express.Router();

// Sağlık kontrolü (başlangıç sayfası /api/ adresine bakıyordu)
rota.get('/', (req, res) => res.json({ durum: 'çalışıyor' }));

// Oturum
rota.post('/giris', giris.giris);
rota.post('/cikis', girisGerekli, giris.cikis);
rota.get('/ben', girisGerekli, giris.ben);

// Bundan sonraki her rota giriş ister
rota.use(girisGerekli);

// Menü
rota.get('/secenekler', menu.secenekler);
rota.get('/menu', menu.gununMenusu);
rota.get('/menuler/haftalik', menu.haftalik);

// Rezervasyon
rota.get('/rezervasyonlar', rezervasyon.listele);
rota.post('/rezervasyonlar', rezervasyon.yap);
rota.post('/rezervasyonlar/:id/iptal', rezervasyon.iptal);

// Bakiye
rota.get('/bakiye', bakiye.ozet);
rota.post('/bakiye/yukle', bakiye.yukle);

// Değerlendirme
rota.get('/degerlendirmeler', degerlendirme.liste);
rota.post('/degerlendirmeler', degerlendirme.ekle);

// Yönetici paneli
rota.get('/yonetici/rapor', yoneticiGerekli, yonetici.rapor);
rota.get('/yonetici/yemekler', yoneticiGerekli, yonetici.yemekler);
rota.get('/yonetici/menuler/:id', yoneticiGerekli, yonetici.menuGetir);
rota.post('/yonetici/menuler', yoneticiGerekli, yonetici.olustur);
rota.put('/yonetici/menuler/:id', yoneticiGerekli, yonetici.guncelle);

module.exports = rota;
