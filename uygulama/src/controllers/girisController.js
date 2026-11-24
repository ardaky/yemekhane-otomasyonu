// Giriş, çıkış ve oturumdaki kullanıcı
const bcrypt = require('bcryptjs');
const kullaniciVerisi = require('../veri/kullaniciVerisi');
const depo = require('../oturum/oturumDeposu');
const { CEREZ } = require('../oturum/oturumKontrol');
const { KullaniciHatasi } = require('../hatalar');

async function giris(req, res) {
  const { eposta, sifre } = req.body || {};
  if (!eposta || !sifre) {
    throw new KullaniciHatasi('E-posta ve şifre gerekli.');
  }

  const kullanici = await kullaniciVerisi.epostaIleBul(String(eposta).trim().toLowerCase());
  // Kullanıcı yoksa da şifre yanlışsa da aynı mesaj: hangi e-postaların
  // kayıtlı olduğu dışarıya sızmasın
  const dogru = kullanici && (await bcrypt.compare(String(sifre), kullanici.sifre_hash));
  if (!dogru) {
    throw new KullaniciHatasi('E-posta ya da şifre hatalı.', 401);
  }
  if (!kullanici.aktif) {
    throw new KullaniciHatasi('Hesabınız pasif durumda.', 403);
  }

  const bilgi = { kullaniciId: kullanici.id, rol: kullanici.rol, ad: kullanici.ad };
  const token = await depo.olustur(bilgi);

  // httpOnly: JavaScript çerezi okuyamaz, yalnızca tarayıcı isteklerle gönderir
  res.cookie(CEREZ, token, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json(bilgi);
}

async function cikis(req, res) {
  await depo.sil(req.token);
  res.clearCookie(CEREZ, { path: '/' });
  res.json({ tamam: true });
}

async function ben(req, res) {
  const profil = await kullaniciVerisi.profil(req.kullanici.kullaniciId);
  res.json(profil);
}

module.exports = { giris, cikis, ben };
