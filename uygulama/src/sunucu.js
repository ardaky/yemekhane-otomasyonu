// =====================================================================
// Yemekhane Otomasyonu · uygulama sunucusu (Express, Web API)
// Yalnızca JSON döner. Arayüz frontend container'ındaki Apache'den sunulur,
// Apache /api/ ile başlayan istekleri bu sunucuya (uygulama:8000) iletir.
//
// Bir isteğin yolu:
//   tarayıcı -> Apache -> sunucu.js -> rotalar.js -> controllers/ -> veri/ -> MySQL
// =====================================================================
const express = require('express');
const cookieParser = require('cookie-parser');
const rotalar = require('./rotalar');
const { hataYakalayici } = require('./hatalar');
const redis = require('./onbellek/redis');

const app = express();

app.use(express.json());   // JSON gövdeyi req.body'ye çevirir
app.use(cookieParser());   // Çerezleri req.cookies'e çevirir

// Her isteği günlüğe yaz: yöntem, adres, durum kodu, süre
app.use((req, res, next) => {
  const baslangic = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - baslangic}ms`);
  });
  next();
});

app.use('/api', rotalar);

// Tanımsız /api adresleri
app.use('/api', (req, res) => res.status(404).json({ hata: 'Böyle bir adres yok.' }));

// Express 5, async fonksiyonlarda fırlatılan hataları buraya iletir
app.use(hataYakalayici);

const PORT = 8000;

// Önce Redis'e bağlan (oturumlar ve menü önbelleği orada), sonra istek kabul et
redis.connect()
  .then(() => {
    console.log('Redis bağlantısı kuruldu');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Uygulama ${PORT} portunda dinliyor`);
    });
  })
  .catch((err) => {
    console.error('Redis bağlantısı kurulamadı:', err.message);
    process.exit(1);   // restart: unless-stopped container'ı yeniden başlatır
  });
