// Değerlendirme ekranı: kullanılmış menülere 1–5 puan ve yorum
const mesaj = document.getElementById('mesaj');
const bekleyenEl = document.getElementById('bekleyenler');
const verilenEl = document.getElementById('verilenler');
// Rezervasyonlarım ekranındaki "Değerlendir" bağlantısı ?menu=ID ile gelir
const isaretli = Number(new URLSearchParams(location.search).get('menu'));

async function basla() {
  await sayfaBaslat('Değerlendirme', '/profil.html');
  bekleyenEl.addEventListener('submit', gonder);
  yukle();
}

async function yukle() {
  try {
    const { bekleyenler, verilenler } = await api('/degerlendirmeler');
    cizBekleyenler(bekleyenler);
    cizVerilenler(verilenler);
    document.getElementById('menu-' + isaretli)?.scrollIntoView({ block: 'center' });
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function yildizlar(menuId) {
  // row-reverse ile çizildiği için 5'ten 1'e yazılır
  return [5, 4, 3, 2, 1].map((n) => `
    <input type="radio" id="p-${menuId}-${n}" name="puan" value="${n}" required>
    <label for="p-${menuId}-${n}" title="${n} puan">★</label>`).join('');
}

function cizBekleyenler(liste) {
  if (liste.length === 0) {
    bekleyenEl.innerHTML = '<div class="kart bos-durum">Değerlendirilecek menü yok. Yediğin menüler burada görünür.</div>';
    return;
  }
  bekleyenEl.innerHTML = liste.map((m) => `
    <form class="ogun-kart" id="menu-${m.menu_id}" data-menu="${m.menu_id}"
          ${m.menu_id === isaretli ? 'style="border-color: var(--ana)"' : ''}>
      <div class="ogun-ust">
        <span class="ogun-ad">${tarihYaz(m.tarih)} · ${esc(m.ogun)}</span>
      </div>
      <p class="ogun-yemekler">${esc(m.yemekhane)} — ${esc(m.yemekler)}</p>
      <fieldset style="border:0;padding:0;margin:0 0 0.5rem">
        <legend class="soluk">Puanın</legend>
        <div class="yildizlar">${yildizlar(m.menu_id)}</div>
      </fieldset>
      <div class="alan">
        <label for="yorum-${m.menu_id}" class="soluk" style="font-weight:400">Yorum (isteğe bağlı)</label>
        <textarea id="yorum-${m.menu_id}" name="yorum" rows="2" maxlength="500"></textarea>
      </div>
      <button class="dugme dugme-kucuk" type="submit">Gönder</button>
    </form>`).join('');
}

function cizVerilenler(liste) {
  verilenEl.innerHTML = liste.length === 0
    ? '<div class="kart bos-durum">Henüz puan vermedin.</div>'
    : liste.map((d) => `
      <article class="ogun-kart">
        <div class="ogun-ust">
          <span class="ogun-ad">${tarihYaz(d.tarih)} · ${esc(d.ogun)}</span>
          <span class="etiket etiket-sari">${'★'.repeat(d.puan)}</span>
        </div>
        <p class="ogun-yemekler" style="margin-bottom:0">${esc(d.yemekhane)}${d.yorum ? ' — “' + esc(d.yorum) + '”' : ''}</p>
      </article>`).join('');
}

async function gonder(olay) {
  olay.preventDefault();
  const form = olay.target;
  const secili = form.querySelector('input[name=puan]:checked');
  if (!secili) {
    bildir(mesaj, 'Lütfen 1 ile 5 arasında bir puan seç.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  try {
    await api('/degerlendirmeler', {
      yontem: 'POST',
      govde: { menuId: Number(form.dataset.menu), puan: Number(secili.value), yorum: form.yorum.value },
    });
    bildir(mesaj, 'Teşekkürler, değerlendirmen kaydedildi.', 'basari');
    setTimeout(yukle, 500);   // replikadan yenile
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

basla();
