// Veritabanı bağlantıları. Yazmalar kaynağa (mysql-primary), okumalar replikaya
// (mysql-replica) gidiyor. SQL sorguları sadece bu klasördeki dosyalarda.
const mysql = require('mysql2/promise');

const ayarlar = {
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_KULLANICI,
  password: process.env.DB_SIFRE,
  database: process.env.DB_ADI,
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,     // tarihler '2026-11-24' gibi string gelsin
  decimalNumbers: true,  // bakiye ve fiyatlar sayı olarak gelsin
  connectionLimit: 10,
  connectTimeout: 3000,
};

const yazma = mysql.createPool({ ...ayarlar, host: process.env.DB_YAZMA_HOST });
const replika = mysql.createPool({ ...ayarlar, host: process.env.DB_OKUMA_HOST });

// Replikaya hiç bağlanılamazsa (container durmuşsa) okumayı kaynaktan yapıyoruz,
// böylece replika çökünce bütün ekranlar hata vermiyor.
const BAGLANTI_HATALARI = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'PROTOCOL_CONNECTION_LOST'];

const okuma = {
  async query(sql, parametreler) {
    try {
      return await replika.query(sql, parametreler);
    } catch (err) {
      if (!BAGLANTI_HATALARI.includes(err.code)) throw err;
      console.warn('Replikaya ulaşılamadı, kaynaktan okunuyor:', err.code);
      return yazma.query(sql, parametreler);
    }
  },
};

// Stored procedure çağırır, dönen ilk satırı verir.
// mysql2'de CALL sonucu [[satırlar], OkPacket] şeklinde geliyor.
async function yordam(ad, parametreler) {
  const soruIsaretleri = parametreler.map(() => '?').join(', ');
  const [sonuc] = await yazma.query(`CALL ${ad}(${soruIsaretleri})`, parametreler);
  return sonuc[0][0];
}

module.exports = { yazma, okuma, yordam };
