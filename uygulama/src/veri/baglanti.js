// =====================================================================
// Veri katmanı · bağlantılar
// İki ayrı bağlantı havuzu vardır:
//   yazma -> mysql-primary (kaynak): INSERT/UPDATE ve stored procedure çağrıları
//   okuma -> mysql-replica (replika): listeleme ve raporlar
// Uygulamada SQL yalnızca src/veri/ klasöründe yazılır.
// =====================================================================
const mysql = require('mysql2/promise');

const ortak = {
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_KULLANICI,
  password: process.env.DB_SIFRE,
  database: process.env.DB_ADI,
  charset: 'utf8mb4',
  timezone: '+03:00',
  dateStrings: true,      // tarihleri '2026-11-24' biçiminde metin olarak al
  decimalNumbers: true,   // DECIMAL sütunlarını sayı olarak al (bakiye, fiyat)
  connectionLimit: 10,
};

const yazma = mysql.createPool({ ...ortak, host: process.env.DB_YAZMA_HOST });
const okuma = mysql.createPool({ ...ortak, host: process.env.DB_OKUMA_HOST });

// Stored procedure çağırır ve dönen tek satırı verir.
// mysql2'de CALL sonucu [[satırlar], OkPacket] biçiminde gelir.
async function yordam(ad, parametreler) {
  const yer = parametreler.map(() => '?').join(', ');
  const [sonuc] = await yazma.query(`CALL ${ad}(${yer})`, parametreler);
  return sonuc[0][0];
}

module.exports = { yazma, okuma, yordam };
