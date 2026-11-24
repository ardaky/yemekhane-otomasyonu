// =====================================================================
// Oturum deposu · Redis
//   Anahtar : oturum:{token}
//   Değer   : { kullaniciId, rol, ad } (JSON)
//   Süre    : 30 dakika, her istekte yeniden 30 dakikaya çekilir
//   Silinme : çıkış yapıldığında
// Oturum uygulamanın belleğinde değil Redis'te durduğu için uygulama
// container'ı yeniden başlasa da kullanıcının oturumu düşmez.
// =====================================================================
const crypto = require('crypto');
const redis = require('../onbellek/redis');

const SURE_SN = 30 * 60;
const anahtar = (token) => `oturum:${token}`;

async function olustur(bilgi) {
  const token = crypto.randomBytes(32).toString('hex');
  await redis.set(anahtar(token), JSON.stringify(bilgi), { EX: SURE_SN });
  return token;
}

// Token geçerliyse oturum bilgisini döndürür ve süreyi 30 dakikaya yeniler
async function getirVeYenile(token) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const kayit = await redis.get(anahtar(token));
  if (!kayit) return null;
  await redis.expire(anahtar(token), SURE_SN);
  return JSON.parse(kayit);
}

async function sil(token) {
  await redis.del(anahtar(token));
}

module.exports = { olustur, getirVeYenile, sil };
