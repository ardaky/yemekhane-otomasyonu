// Menü önbelleği ve oturumlar aynı Redis bağlantısını kullanıyor
const { createClient } = require('redis');

const istemci = createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
});

istemci.on('error', (err) => console.error('Redis hatası:', err.message));

module.exports = istemci;
