// Bütün sayfaların kullandığı fonksiyonlar: API çağrısı, biçimlendirme,
// üst çubuk ve alt sekmeler.

// API'ye istek atar. Hata olursa sunucunun gönderdiği mesajla hata fırlatır.
async function api(yol, { yontem = 'GET', govde } = {}) {
  const ayar = { method: yontem, headers: { Accept: 'application/json' } };
  if (govde !== undefined) {
    ayar.headers['Content-Type'] = 'application/json';
    ayar.body = JSON.stringify(govde);
  }

  let yanit;
  try {
    yanit = await fetch('/api' + yol, ayar);
  } catch {
    throw new Error('Sunucuya bağlanılamadı. İnternet bağlantını kontrol et.');
  }
  const veri = await yanit.json().catch(() => ({}));

  // oturum düşmüşse giriş sayfasına dön (giriş sayfasının kendisi hariç)
  if (yanit.status === 401 && location.pathname !== '/' && location.pathname !== '/index.html') {
    location.href = '/';
    return new Promise(() => {}); // sayfa değişene kadar bekle, hata kutusu çıkmasın
  }
  if (!yanit.ok) {
    throw new Error(veri.hata || 'Bir hata oluştu.');
  }
  return veri;
}

// veritabanından gelen yazıları innerHTML'e koymadan önce kaçışla (XSS'e karşı)
function esc(metin) {
  return String(metin ?? '').replace(/[&<>"']/g, (k) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[k]
  ));
}

// 40 -> "40,00 TL"
function tl(sayi) {
  return Number(sayi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

// "2026-11-25" -> "25 Kasım Çarşamba"
function tarihYaz(tarih, gunAdi = true) {
  const [y, a, g] = tarih.slice(0, 10).split('-').map(Number);
  const secenek = gunAdi ? { day: 'numeric', month: 'long', weekday: 'long' } : { day: 'numeric', month: 'long' };
  return new Date(y, a - 1, g).toLocaleDateString('tr-TR', secenek);
}

// "2026-11-25 10:00:00" -> "25 Kasım 10:00"
function zamanYaz(zaman) {
  return tarihYaz(zaman, false) + ' ' + zaman.slice(11, 16);
}

function gunEkle(tarih, n) {
  const [y, a, g] = tarih.split('-').map(Number);
  const d = new Date(y, a - 1, g + n);
  const iki = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

// mesaj kutusuna hata ya da başarı mesajı yaz
function bildir(kutu, mesaj, tur = 'hata') {
  kutu.textContent = mesaj;
  kutu.className = 'bildirim bildirim-' + tur;
  kutu.hidden = false;
}

const SEKMELER = [
  { adres: '/menu.html', ad: 'Menü', ikon: '🍽' },
  { adres: '/haftalik.html', ad: 'Hafta', ikon: '📅' },
  { adres: '/rezervasyonlar.html', ad: 'Rezerv.', ikon: '🎫' },
  { adres: '/bakiye.html', ad: 'Bakiye', ikon: '💳' },
  { adres: '/profil.html', ad: 'Profil', ikon: '👤' },
];

// Her sayfa açılırken çağrılıyor: giriş yapılmış mı bakar, üst çubuğu ve
// alt sekmeleri ekler, giriş yapan kullanıcıyı döndürür.
async function sayfaBaslat(baslik, aktifAdres) {
  const kullanici = await api('/ben');

  const ust = document.createElement('header');
  ust.className = 'ust-cubuk';
  ust.innerHTML = `<div class="kapsayici">
      <h1>${esc(baslik)}</h1>
      <span class="kim">${esc(kullanici.ad)} ${esc(kullanici.soyad)}</span>
    </div>`;
  document.body.prepend(ust);

  const alt = document.createElement('nav');
  alt.className = 'alt-sekmeler';
  alt.innerHTML = '<ul>' + SEKMELER.map((s) => `
      <li><a href="${s.adres}" ${s.adres === aktifAdres ? 'aria-current="page"' : ''}>
        <span class="ikon">${s.ikon}</span>${s.ad}</a></li>`).join('') + '</ul>';
  document.body.append(alt);

  return kullanici;
}
