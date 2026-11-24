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
};

const yazma = mysql.createPool({ ...ayarlar, host: process.env.DB_YAZMA_HOST });
const okuma = mysql.createPool({ ...ayarlar, host: process.env.DB_OKUMA_HOST });

// Stored procedure çağırır, dönen ilk satırı verir.
// mysql2'de CALL sonucu [[satırlar], OkPacket] şeklinde geliyor.
async function yordam(ad, parametreler) {
  const soruIsaretleri = parametreler.map(() => '?').join(', ');
  const [sonuc] = await yazma.query(`CALL ${ad}(${soruIsaretleri})`, parametreler);
  return sonuc[0][0];
}

module.exports = { yazma, okuma, yordam };
