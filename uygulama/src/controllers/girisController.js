const bcrypt = require('bcryptjs');
const kullaniciVerisi = require('../veri/kullaniciVerisi');
const depo = require('../oturum/oturumDeposu');
const { CEREZ } = require('../oturum/oturumKontrol');
const { KullaniciHatasi } = require('../hatalar');

// POST /api/giris
async function giris(req, res) {
  const { eposta, sifre } = req.body || {};
  if (!eposta || !sifre) {
    throw new KullaniciHatasi('E-posta ve şifre gerekli.');
  }

  const kullanici = await kullaniciVerisi.epostaIleBul(String(eposta).trim().toLowerCase());
  const dogru = kullanici && (await bcrypt.compare(String(sifre), kullanici.sifre_hash));
  // e-posta yoksa da şifre yanlışsa da aynı mesajı veriyoruz
  if (!dogru) {
    throw new KullaniciHatasi('E-posta ya da şifre hatalı.', 401);
  }
  if (!kullanici.aktif) {
    throw new KullaniciHatasi('Hesabınız pasif durumda.', 403);
  }

  // bu tarayıcıda önceden açılmış bir oturum varsa onu kapat
  if (req.cookies[CEREZ]) await depo.sil(req.cookies[CEREZ]);

  const bilgi = { kullaniciId: kullanici.id, rol: kullanici.rol, ad: kullanici.ad };
  const token = await depo.olustur(bilgi);
  // httpOnly: sayfadaki JavaScript çereze erişemiyor
  res.cookie(CEREZ, token, { httpOnly: true, sameSite: 'lax', path: '/' });
  res.json(bilgi);
}

// POST /api/cikis  (oturum zaten düşmüşse de çerezi temizliyor)
async function cikis(req, res) {
  const token = req.cookies[CEREZ];
  if (token) await depo.sil(token);
  res.clearCookie(CEREZ, { path: '/' });
  res.json({ tamam: true });
}

// GET /api/ben
async function ben(req, res) {
  const profil = await kullaniciVerisi.profil(req.kullanici.kullaniciId);
  if (!profil) throw new KullaniciHatasi('Kullanıcı bulunamadı.', 404);
  res.json(profil);
}

module.exports = { giris, cikis, ben };
