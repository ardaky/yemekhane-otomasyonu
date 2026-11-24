// Değerlendirme: yenmiş menülere 1-5 puan ve yorum
const mesaj = document.getElementById('mesaj');
const bekleyenEl = document.getElementById('bekleyenler');
const verilenEl = document.getElementById('verilenler');
// Rezervasyonlarım sayfasındaki "Değerlendir" düğmesi ?menu=ID ile açıyor
const secilenMenu = Number(new URLSearchParams(location.search).get('menu'));

async function basla() {
  try {
    await sayfaBaslat('Değerlendirme', '/profil.html');
    await yukle();
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  bekleyenEl.addEventListener('submit', gonder);
}

async function yukle() {
  const { bekleyenler, verilenler } = await api('/degerlendirmeler');
  bekleyenleriCiz(bekleyenler);
  verilenleriCiz(verilenler);
  document.getElementById('menu-' + secilenMenu)?.scrollIntoView({ block: 'center' });
}

function yildizlar(menuId) {
  // CSS'te ters sırada dizildiği için 5'ten 1'e yazılıyor
  return [5, 4, 3, 2, 1].map((n) => `
    <input type="radio" id="p-${menuId}-${n}" name="puan" value="${n}">
    <label for="p-${menuId}-${n}" title="${n} puan">★</label>`).join('');
}

function bekleyenleriCiz(liste) {
  if (liste.length === 0) {
    bekleyenEl.innerHTML = '<div class="kart bos-durum">Değerlendirilecek menü yok. Yediğin menüler burada görünür.</div>';
    return;
  }
  bekleyenEl.innerHTML = liste.map((m) => `
    <form class="ogun-kart ${m.menu_id === secilenMenu ? 'secili' : ''}" id="menu-${m.menu_id}" data-menu="${m.menu_id}">
      <div class="ogun-ust"><span class="ogun-ad">${tarihYaz(m.tarih)} · ${esc(m.ogun)}</span></div>
      <p class="ogun-yemekler">${esc(m.yemekhane)} — ${esc(m.yemekler)}</p>
      <div class="yildizlar">${yildizlar(m.menu_id)}</div>
      <div class="alan">
        <textarea name="yorum" rows="2" maxlength="500" placeholder="Yorum (isteğe bağlı)"></textarea>
      </div>
      <button class="dugme dugme-kucuk" type="submit">Gönder</button>
    </form>`).join('');
}

function verilenleriCiz(liste) {
  verilenEl.innerHTML = liste.length === 0
    ? '<div class="kart bos-durum">Henüz puan vermedin.</div>'
    : liste.map((d) => `
      <article class="ogun-kart">
        <div class="ogun-ust">
          <span class="ogun-ad">${tarihYaz(d.tarih)} · ${esc(d.ogun)}</span>
          <span class="etiket etiket-sari">${'★'.repeat(d.puan)}</span>
        </div>
        <p class="ogun-yemekler">${esc(d.yemekhane)}${d.yorum ? ' — "' + esc(d.yorum) + '"' : ''}</p>
      </article>`).join('');
}

async function gonder(olay) {
  olay.preventDefault();
  const form = olay.target;
  const secili = form.querySelector('input[name=puan]:checked');
  if (!secili) {
    bildir(mesaj, 'Önce 1 ile 5 arasında bir puan seç.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  const dugme = form.querySelector('button');
  dugme.disabled = true;
  try {
    await api('/degerlendirmeler', {
      yontem: 'POST',
      govde: { menuId: Number(form.dataset.menu), puan: Number(secili.value), yorum: form.yorum.value },
    });
    bildir(mesaj, 'Teşekkürler, değerlendirmen kaydedildi.', 'basari');
    form.remove();
    setTimeout(() => yukle().catch((hata) => bildir(mesaj, hata.message)), 500); // listeler replikadan
  } catch (hata) {
    bildir(mesaj, hata.message);
    dugme.disabled = false;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

basla();
