// =====================================================================
// Redis bağlantısı · menü önbelleği ve oturum deposu aynı bağlantıyı kullanır
// Adres compose dosyasındaki REDIS_HOST / REDIS_PORT değişkenlerinden gelir.
// =====================================================================
const { createClient } = require('redis');

const istemci = createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
});

istemci.on('error', (err) => console.error('[redis] bağlantı hatası:', err.message));

module.exports = istemci;
