// Bakiye ekranı: güncel bakiye, hareket geçmişi, bakiye yükleme
const form = document.getElementById('yukle-formu');
const mesaj = document.getElementById('mesaj');
const bakiyeEl = document.getElementById('bakiye');
const listeEl = document.getElementById('hareketler');

const TUR_ADI = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };

async function basla() {
  await sayfaBaslat('Bakiye', '/bakiye.html');
  form.addEventListener('click', (olay) => {
    const hizli = olay.target.closest('[data-tutar]');
    if (hizli) form.tutar.value = hizli.dataset.tutar;
  });
  form.addEventListener('submit', yukleTiklandi);
  yenile();
}

async function yenile() {
  try {
    const { bakiye, hareketler } = await api('/bakiye');
    bakiyeEl.textContent = tl(bakiye);
    listeEl.innerHTML = hareketler.length === 0
      ? '<li class="soluk">Henüz hareket yok.</li>'
      : hareketler.map((h) => `
        <li>
          <span>${esc(TUR_ADI[h.tur])}<br><span class="soluk">${zamanYaz(h.olusturma)}</span></span>
          <span class="${h.tutar > 0 ? 'tutar-arti' : 'tutar-eksi'}">${h.tutar > 0 ? '+' : ''}${tl(h.tutar)}</span>
        </li>`).join('');
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

async function yukleTiklandi(olay) {
  olay.preventDefault();
  const dugme = form.querySelector('button[type=submit]');
  dugme.disabled = true;
  try {
    const sonuc = await api('/bakiye/yukle', { yontem: 'POST', govde: { tutar: form.tutar.value } });
    // Yordamın kaynaktan döndürdüğü bakiye hemen gösterilir
    bakiyeEl.textContent = tl(sonuc.bakiye);
    bildir(mesaj, `${tl(form.tutar.value)} yüklendi.`, 'basari');
    form.reset();
    // Hareket listesini kısa bir gecikmeyle replikadan yenile
    setTimeout(yenile, 500);
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  dugme.disabled = false;
}

basla();
