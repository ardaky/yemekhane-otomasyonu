// Bakiye: güncel bakiye, hareketler, bakiye yükleme
const form = document.getElementById('yukle-formu');
const mesaj = document.getElementById('mesaj');
const bakiyeEl = document.getElementById('bakiye');
const listeEl = document.getElementById('hareketler');

async function basla() {
  try {
    await sayfaBaslat('Bakiye', '/bakiye.html');
    const { bakiye, hareketler } = await api('/bakiye');
    bakiyeEl.textContent = tl(bakiye);
    hareketleriCiz(hareketler);
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  form.addEventListener('click', (olay) => {
    const hizli = olay.target.closest('[data-tutar]');
    if (hizli) form.tutar.value = hizli.dataset.tutar;
  });
  form.addEventListener('submit', yukle);
}

function hareketleriCiz(hareketler) {
  listeEl.innerHTML = hareketler.length === 0
    ? '<li class="soluk">Henüz hareket yok.</li>'
    : hareketler.map((h) => `
      <li>
        <span>${esc(h.aciklama)}<br><span class="soluk">${zamanYaz(h.olusturma)}</span></span>
        <span class="${h.tutar > 0 ? 'tutar-arti' : 'tutar-eksi'}">${h.tutar > 0 ? '+' : ''}${tl(h.tutar)}</span>
      </li>`).join('');
}

async function yukle(olay) {
  olay.preventDefault();
  const dugme = form.querySelector('button[type=submit]');
  dugme.disabled = true;
  try {
    const sonuc = await api('/bakiye/yukle', { yontem: 'POST', govde: { tutar: form.tutar.value } });
    // bakiyeyi procedure'ün döndürdüğü değerden gösteriyoruz (kaynaktan)
    bakiyeEl.textContent = tl(sonuc.bakiye);
    bildir(mesaj, `Yükleme yapıldı. Bakiyen ${tl(sonuc.bakiye)}.`, 'basari');
    form.reset();
    // hareket listesi replikadan geliyor, birazdan yenile; bakiyeye dokunma
    setTimeout(async () => {
      const { hareketler } = await api('/bakiye');
      hareketleriCiz(hareketler);
    }, 500);
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  dugme.disabled = false;
}

basla();
