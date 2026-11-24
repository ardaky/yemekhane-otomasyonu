// Haftalık menü ve rezervasyon ekranı
const secYemekhane = document.getElementById('yemekhane');
const alan = document.getElementById('hafta');
const mesaj = document.getElementById('mesaj');
const aralik = document.getElementById('aralik');

let baslangic;     // gösterilen haftanın ilk günü
let bugunTarihi;   // "BUGÜN" işareti için
let menuler = [];  // sunucudan gelen liste; rezervasyondan sonra yerinde güncellenir

async function basla() {
  await sayfaBaslat('Haftalık Menü', '/haftalik.html');
  const { yemekhaneler, bugun } = await api('/secenekler');
  secYemekhane.innerHTML = yemekhaneler
    .map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
  baslangic = bugun;
  bugunTarihi = bugun;

  secYemekhane.addEventListener('change', yukle);
  document.getElementById('onceki').addEventListener('click', () => { baslangic = gunEkle(baslangic, -7); yukle(); });
  document.getElementById('sonraki').addEventListener('click', () => { baslangic = gunEkle(baslangic, 7); yukle(); });
  alan.addEventListener('click', rezervasyonTiklandi);
  yukle();
}

async function yukle() {
  aralik.textContent = `${tarihYaz(baslangic, false)} – ${tarihYaz(gunEkle(baslangic, 6), false)}`;
  try {
    const p = new URLSearchParams({ yemekhane: secYemekhane.value, baslangic });
    menuler = (await api('/menuler/haftalik?' + p)).menuler;
    ciz();
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

// Menünün durumuna göre düğme: rezerve, kullanıldı, süresi doldu, dolu ya da "Rezerve et"
function dugme(m) {
  if (m.rezervasyonDurum === 'aktif') {
    return '<span class="etiket etiket-mor">✓ Rezerve edildi</span>';
  }
  if (m.rezervasyonDurum === 'kullanildi') {
    return '<span class="etiket">Kullanıldı</span>';
  }
  if (m.suresiDoldu) {
    return '<button class="dugme dugme-kucuk" disabled>Süre doldu</button>';
  }
  if (m.bosYer <= 0) {
    return '<button class="dugme dugme-kucuk" disabled>Dolu</button>';
  }
  return `<button class="dugme dugme-kucuk" data-menu="${m.menuId}">Rezerve et</button>`;
}

function ciz() {
  if (menuler.length === 0) {
    alan.innerHTML = '<div class="kart bos-durum">Bu hafta için menü yok.</div>';
    return;
  }
  // Menüleri güne göre grupla: her gün bir kart, öğünler kartın içinde satır
  const gunler = {};
  for (const m of menuler) (gunler[m.tarih] ??= []).push(m);

  alan.innerHTML = `
    <p class="kaydir-ipucu">Günler arasında geçmek için yana kaydır ›</p>
    <div class="hafta-izgara">
      ${Object.entries(gunler).map(([tarih, liste]) => `
        <article class="gun-kart">
          <h2>${tarihYaz(tarih)} ${tarih === bugunTarihi ? '<span class="bugun-isaret">BUGÜN</span>' : ''}</h2>
          ${liste.map((m) => `
            <div class="ogun-satir">
              <div class="ogun-ust">
                <span class="ogun-ad">${esc(m.ogun)}</span>
                <span class="etiket etiket-sari">${m.bosYer} boş</span>
              </div>
              <p class="ogun-yemekler soluk">${esc(m.yemekler)}</p>
              <div class="ogun-alt">
                <span class="ogun-bilgi"><span class="fiyat">${tl(m.fiyat)}</span>
                  <span class="soluk"> · son ${m.rezervasyonSon.slice(11, 16)}</span></span>
                ${dugme(m)}
              </div>
            </div>`).join('')}
        </article>`).join('')}
    </div>`;
}

async function rezervasyonTiklandi(olay) {
  const dugmeEl = olay.target.closest('button[data-menu]');
  if (!dugmeEl) return;
  const menuId = Number(dugmeEl.dataset.menu);
  dugmeEl.disabled = true;
  try {
    const sonuc = await api('/rezervasyonlar', { yontem: 'POST', govde: { menuId } });
    // Bakiye, yordamın kaynaktan döndürdüğü değerdir (replikasyon gecikmesinden etkilenmez).
    bildir(mesaj, `Rezervasyon yapıldı. ${tl(sonuc.ucret)} düşüldü, güncel bakiyen ${tl(sonuc.bakiye)}.`, 'basari');
    // Listeyi replikadan yeniden çekmek yerine yerinde güncelle: replika bu
    // rezervasyonu henüz almamış olabilir.
    const m = menuler.find((x) => x.menuId === menuId);
    m.rezervasyonDurum = 'aktif';
    m.bosYer -= 1;
    ciz();
  } catch (hata) {
    bildir(mesaj, hata.message);
    dugmeEl.disabled = false;
  }
  mesaj.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

basla();
