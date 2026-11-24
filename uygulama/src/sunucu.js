// Express sunucusu. Sadece JSON döner, sayfaları Apache sunuyor.
// Apache /api/ ile başlayan istekleri buraya (uygulama:8000) yönlendiriyor.
const express = require('express');
const cookieParser = require('cookie-parser');
const rotalar = require('./rotalar');
const { hataYakalayici } = require('./hatalar');
const redis = require('./onbellek/redis');

const app = express();

app.use(express.json());
app.use(cookieParser());

// her isteği loga yaz
app.use((req, res, next) => {
  const baslangic = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - baslangic}ms`);
  });
  next();
});

app.use('/api', rotalar);
app.use('/api', (req, res) => res.status(404).json({ hata: 'Böyle bir adres yok.' }));
app.use(hataYakalayici);

const PORT = 8000;

// oturumlar Redis'te olduğu için önce Redis'e bağlanıyoruz
redis.connect()
  .then(() => {
    console.log('Redis bağlantısı kuruldu');
    app.listen(PORT, '0.0.0.0', () => console.log(`Uygulama ${PORT} portunda çalışıyor`));
  })
  .catch((err) => {
    console.error('Redis bağlantısı kurulamadı:', err.message);
    process.exit(1); // docker restart politikası yeniden başlatır
  });
