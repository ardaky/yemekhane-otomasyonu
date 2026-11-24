// Rezervasyonlarım ekranı: aktif, kullanıldı, iptal
const alan = document.getElementById('liste');
const mesaj = document.getElementById('mesaj');
let rezervasyonlar = [];

const BOLUMLER = [
  { durum: 'aktif',      baslik: 'Aktif',      etiket: 'etiket-mor', ad: 'Aktif' },
  { durum: 'kullanildi', baslik: 'Kullanıldı', etiket: 'etiket-vejetaryen', ad: 'Kullanıldı' },
  { durum: 'iptal',      baslik: 'İptal',      etiket: '', ad: 'İptal' },
];

async function basla() {
  await sayfaBaslat('Rezervasyonlarım', '/rezervasyonlar.html');
  alan.addEventListener('click', iptalTiklandi);
  try {
    rezervasyonlar = await api('/rezervasyonlar');
    ciz();
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function eylem(r) {
  if (r.durum === 'aktif') {
    return r.iptalEdilebilir
      ? `<button class="dugme dugme-ikincil dugme-kucuk" data-iptal="${r.id}">İptal et</button>`
      : '<span class="soluk">İptal süresi doldu</span>';
  }
  if (r.durum === 'kullanildi') {
    return r.puan
      ? `<span class="etiket etiket-sari">${'★'.repeat(r.puan)}</span>`
      : `<a class="dugme dugme-kucuk" href="/degerlendirme.html?menu=${r.menuId}">Değerlendir</a>`;
  }
  return '';
}

function ciz() {
  if (rezervasyonlar.length === 0) {
    alan.innerHTML = '<div class="kart bos-durum">Henüz rezervasyonun yok.</div>';
    return;
  }
  alan.innerHTML = BOLUMLER.map((b) => {
    const liste = rezervasyonlar.filter((r) => r.durum === b.durum);
    if (liste.length === 0) return '';
    return `
      <h2 class="gun-baslik">${b.baslik} (${liste.length})</h2>
      ${liste.map((r) => `
        <article class="ogun-kart">
          <div class="ogun-ust">
            <span class="ogun-ad">${tarihYaz(r.tarih)} · ${esc(r.ogun)}</span>
            <span class="etiket ${b.etiket}">${b.ad}</span>
          </div>
          <p class="ogun-yemekler">${esc(r.yemekhane)}</p>
          <div class="ogun-alt">
            <span class="fiyat">${tl(r.ucret)}</span>
            ${eylem(r)}
          </div>
        </article>`).join('')}`;
  }).join('');
}

async function iptalTiklandi(olay) {
  const dugme = olay.target.closest('button[data-iptal]');
  if (!dugme) return;
  if (!confirm('Bu rezervasyonu iptal etmek istiyor musun? Ücret bakiyene iade edilir.')) return;
  const id = Number(dugme.dataset.iptal);
  dugme.disabled = true;
  try {
    const sonuc = await api(`/rezervasyonlar/${id}/iptal`, { yontem: 'POST' });
    bildir(mesaj, `Rezervasyon iptal edildi. ${tl(sonuc.iade)} iade edildi, güncel bakiyen ${tl(sonuc.bakiye)}.`, 'basari');
    const r = rezervasyonlar.find((x) => x.id === id);
    r.durum = 'iptal';
    r.iptalEdilebilir = false;
    ciz();
  } catch (hata) {
    bildir(mesaj, hata.message);
    dugme.disabled = false;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

basla();
