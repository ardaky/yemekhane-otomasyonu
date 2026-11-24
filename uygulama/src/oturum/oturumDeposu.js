// Oturumlar Redis'te: anahtar oturum:{token}, süre 30 dakika.
// Her istekte süre baştan başlıyor. Uygulama yeniden başlasa da oturum gitmiyor.
const crypto = require('crypto');
const redis = require('../onbellek/redis');

const SURE = 30 * 60; // saniye

async function olustur(bilgi) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(`oturum:${token}`, JSON.stringify(bilgi), { EX: SURE });
  return token;
}

async function getirVeYenile(token) {
  const kayit = await redis.get(`oturum:${token}`);
  if (!kayit) return null;
  await redis.expire(`oturum:${token}`, SURE);
  return JSON.parse(kayit);
}

async function sil(token) {
  await redis.del(`oturum:${token}`);
}

module.exports = { olustur, getirVeYenile, sil };
