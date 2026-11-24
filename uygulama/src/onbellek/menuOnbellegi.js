// =====================================================================
// Menü önbelleği
//   Anahtar : menu:{yemekhane_id}:{tarih}:{ogun_id}
//   Süre    : menünün gününün sonuna kadar (geçmiş bir günse bugünün sonuna kadar)
//   Silinme : yönetici o menüyü değiştirdiğinde
// Önbellekte kullanıcıya özel bilgi tutulmaz (fiyat seçimi, doluluk yok);
// böylece aynı kayıt bütün kullanıcılara verilebilir.
// =====================================================================
const redis = require('./redis');

function anahtar(yemekhaneId, tarih, ogunId) {
  return `menu:${yemekhaneId}:${tarih}:${ogunId}`;
}

// Günün sonu (23:59:59) Unix zamanı (saniye). Container saati İstanbul'dur.
function gunSonu(tarih) {
  const [y, a, g] = tarih.split('-').map(Number);
  const menuGunu = new Date(y, a - 1, g, 23, 59, 59).getTime();
  const bugun = new Date();
  bugun.setHours(23, 59, 59, 0);
  return Math.floor(Math.max(menuGunu, bugun.getTime()) / 1000);
}

async function getir(yemekhaneId, tarih, ogunId) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const kayit = await redis.get(k);
  if (kayit) {
    console.log(`[önbellek] ${k} -> Redis'ten geldi`);
    return JSON.parse(kayit);
  }
  return null;
}

async function yaz(yemekhaneId, tarih, ogunId, menu) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  await redis.set(k, JSON.stringify(menu), { EXAT: gunSonu(tarih) });
  console.log(`[önbellek] ${k} -> veritabanından okundu, Redis'e yazıldı`);
}

async function sil(yemekhaneId, tarih, ogunId) {
  const k = anahtar(yemekhaneId, tarih, ogunId);
  const silinen = await redis.del(k);
  console.log(`[önbellek] ${k} -> silindi (${silinen} kayıt)`);
  // İkinci silme: menü değiştikten hemen sonra gelen bir istek, değişikliği henüz
  // almamış replikadan eski menüyü okuyup önbelleğe yazmış olabilir
  // (replikasyon gecikmesi). Bir saniye sonra anahtarı bir kez daha sileriz.
  setTimeout(() => redis.del(k).catch(() => {}), 1000);
}

module.exports = { getir, yaz, sil };
