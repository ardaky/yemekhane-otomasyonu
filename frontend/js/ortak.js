// =====================================================================
// Ortak arayüz kodu · bütün sayfalar kullanır
// Burada iş kuralı yoktur: yalnızca API çağrısı, biçimlendirme ve
// sayfa iskeleti (üst çubuk, alt sekmeler) bulunur.
// =====================================================================

// API çağrısı. Hata durumunda sunucunun Türkçe mesajıyla Error fırlatır.
async function api(yol, { yontem = 'GET', govde } = {}) {
  const ayar = { method: yontem, headers: { Accept: 'application/json' } };
  if (govde !== undefined) {
    ayar.headers['Content-Type'] = 'application/json';
    ayar.body = JSON.stringify(govde);
  }
  const yanit = await fetch('/api' + yol, ayar);
  const veri = await yanit.json().catch(() => ({}));

  if (yanit.status === 401 && location.pathname !== '/' && location.pathname !== '/index.html') {
    location.href = '/';
    throw new Error(veri.hata || 'Oturum kapalı.');
  }
  if (!yanit.ok) {
    throw new Error(veri.hata || 'Sunucuya ulaşılamadı.');
  }
  return veri;
}

// Veritabanından gelen metni HTML'e güvenle yerleştirmek için
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
  const d = new Date(y, a - 1, g);
  return d.toLocaleDateString('tr-TR', gunAdi
    ? { day: 'numeric', month: 'long', weekday: 'long' }
    : { day: 'numeric', month: 'long' });
}

// "2026-11-25 10:00:00" -> "25 Kasım 10:00"
function zamanYaz(zaman) {
  return tarihYaz(zaman, false) + ' ' + zaman.slice(11, 16);
}

// "2026-11-25" + n gün
function gunEkle(tarih, n) {
  const [y, a, g] = tarih.split('-').map(Number);
  const d = new Date(y, a - 1, g + n);
  const iki = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

// Bildirim kutusuna mesaj yaz (tur: 'hata' | 'basari')
function bildir(kutu, mesaj, tur = 'hata') {
  kutu.textContent = mesaj;
  kutu.className = 'bildirim bildirim-' + tur;
  kutu.hidden = false;
  kutu.setAttribute('role', tur === 'hata' ? 'alert' : 'status');
}

const SEKMELER = [
  { adres: '/menu.html',          ad: 'Menü',     ikon: '🍽' },
  { adres: '/haftalik.html',      ad: 'Hafta',    ikon: '📅' },
  { adres: '/rezervasyonlar.html', ad: 'Rezerv.', ikon: '🎫' },
  { adres: '/bakiye.html',        ad: 'Bakiye',   ikon: '💳' },
  { adres: '/profil.html',        ad: 'Profil',   ikon: '👤' },
];

// Her sayfanın başında çağrılır: oturumu kontrol eder, üst çubuğu ve
// alt sekmeleri çizer, giriş yapan kullanıcıyı döndürür.
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
  alt.setAttribute('aria-label', 'Ana gezinme');
  alt.innerHTML = '<ul>' + SEKMELER.map((s) => `
      <li><a href="${s.adres}" ${s.adres === aktifAdres ? 'aria-current="page"' : ''}>
        <span class="ikon" aria-hidden="true">${s.ikon}</span>${s.ad}</a></li>`).join('') + '</ul>';
  document.body.append(alt);

  return kullanici;
}
