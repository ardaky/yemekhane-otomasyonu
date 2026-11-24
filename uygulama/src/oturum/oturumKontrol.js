// Tarayıcı her istekte "oturum" çerezini gönderiyor. Token Redis'te varsa
// kullanıcı bilgisini req.kullanici'ya koyuyoruz.
const depo = require('./oturumDeposu');

const CEREZ = 'oturum';

async function girisGerekli(req, res, next) {
  const token = req.cookies[CEREZ];
  const bilgi = token ? await depo.getirVeYenile(token) : null;
  if (!bilgi) {
    return res.status(401).json({ hata: 'Oturumunuz kapalı. Lütfen giriş yapın.' });
  }
  req.kullanici = bilgi;
  next();
}

function yoneticiGerekli(req, res, next) {
  if (req.kullanici.rol !== 'yonetici') {
    return res.status(403).json({ hata: 'Bu sayfa yalnızca yöneticiler içindir.' });
  }
  next();
}

module.exports = { girisGerekli, yoneticiGerekli, CEREZ };
