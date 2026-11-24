// Günün menüsü ekranı
const secim = document.getElementById('secim');
const alan = document.getElementById('menu');
const mesaj = document.getElementById('mesaj');

async function basla() {
  await sayfaBaslat('Günün Menüsü', '/menu.html');
  const { yemekhaneler, ogunler, bugun } = await api('/secenekler');

  secim.yemekhane.innerHTML = yemekhaneler
    .map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
  secim.ogun.innerHTML = ogunler
    .map((o) => `<option value="${o.id}">${esc(o.ad)}</option>`).join('');
  secim.ogun.value = 2;          // varsayılan: öğle
  secim.tarih.value = bugun;

  secim.addEventListener('change', yukle);
  yukle();
}

async function yukle() {
  mesaj.hidden = true;
  const p = new URLSearchParams({
    yemekhane: secim.yemekhane.value,
    ogun: secim.ogun.value,
    tarih: secim.tarih.value,
  });
  try {
    const { menu } = await api('/menu?' + p);
    ciz(menu);
  } catch (hata) {
    alan.innerHTML = '';
    bildir(mesaj, hata.message);
  }
}

function ciz(menu) {
  if (!menu) {
    alan.innerHTML = '<div class="kart bos-durum">Bu gün ve öğün için menü yok.</div>';
    return;
  }

  const yemekler = menu.yemekler.map((y) => `
    <li>
      <div class="yemek-kategori">${esc(y.kategori)}</div>
      <div class="yemek-ust">
        <span class="yemek-ad">${esc(y.ad)}</span>
        <span class="kalori">${y.kalori} kcal</span>
      </div>
      <div class="etiketler">
        ${y.vejetaryen ? '<span class="etiket etiket-vejetaryen">Vejetaryen</span>' : ''}
        ${y.alerjenler.map((a) => `<span class="etiket">${esc(a)}</span>`).join('')}
      </div>
    </li>`).join('');

  alan.innerHTML = `
    <article class="kart">
      <h2>${esc(menu.yemekhane)} · ${esc(menu.ogun)}</h2>
      <p class="soluk">${tarihYaz(menu.tarih)}</p>
      <div class="menu-ozet">
        <span class="etiket etiket-sari">${tl(menu.fiyat)}</span>
        <span class="etiket etiket-mor">Toplam ${menu.toplamKalori} kcal</span>
        <span class="etiket">Son rezervasyon ${menu.rezervasyonSon.slice(11, 16)}</span>
      </div>
      <ul class="yemek-listesi">${yemekler}</ul>
    </article>
    <a class="dugme dugme-tam" href="/haftalik.html" style="text-align:center">Rezervasyon için haftalık menüye git</a>`;
}

basla();
