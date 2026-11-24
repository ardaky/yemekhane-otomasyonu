// =====================================================================
// Oturum kontrolü (Express middleware)
// Tarayıcı her istekte "oturum" çerezini gönderir. Bu fonksiyon çerezdeki
// token'ı depoda arar; bulursa kullanıcıyı req.kullanici'ya koyar.
// =====================================================================
const depo = require('./oturumDeposu');

const CEREZ = 'oturum';

async function girisGerekli(req, res, next) {
  const token = req.cookies[CEREZ];
  const bilgi = token ? await depo.getirVeYenile(token) : null;
  if (!bilgi) {
    return res.status(401).json({ hata: 'Oturumunuz kapalı. Lütfen giriş yapın.' });
  }
  req.kullanici = bilgi;
  req.token = token;
  next();
}

function yoneticiGerekli(req, res, next) {
  if (req.kullanici.rol !== 'yonetici') {
    return res.status(403).json({ hata: 'Bu sayfa yalnızca yöneticiler içindir.' });
  }
  next();
}

module.exports = { girisGerekli, yoneticiGerekli, CEREZ };
