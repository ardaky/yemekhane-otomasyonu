// Haftalık menü ve rezervasyon
const secYemekhane = document.getElementById('yemekhane');
const alan = document.getElementById('hafta');
const mesaj = document.getElementById('mesaj');
const aralik = document.getElementById('aralik');

let baslangic;    // gösterilen haftanın ilk günü
let bugunTarihi;
let menuler = [];

async function basla() {
  try {
    await sayfaBaslat('Haftalık Menü', '/haftalik.html');
    const { yemekhaneler, bugun } = await api('/secenekler');
    secYemekhane.innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
    baslangic = bugun;
    bugunTarihi = bugun;
  } catch (hata) {
    bildir(mesaj, hata.message);
    return;
  }

  secYemekhane.addEventListener('change', yukle);
  document.getElementById('onceki').addEventListener('click', () => { baslangic = gunEkle(baslangic, -7); yukle(); });
  document.getElementById('sonraki').addEventListener('click', () => { baslangic = gunEkle(baslangic, 7); yukle(); });
  alan.addEventListener('click', rezervasyonYap);
  alan.addEventListener('change', porsiyonDegisti);
  yukle();
}

async function yukle() {
  mesaj.hidden = true;
  aralik.textContent = `${tarihYaz(baslangic, false)} – ${tarihYaz(gunEkle(baslangic, 6), false)}`;
  try {
    const p = new URLSearchParams({ yemekhane: secYemekhane.value, baslangic });
    menuler = (await api('/menuler/haftalik?' + p)).menuler;
    ciz();
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function dugme(m) {
  if (m.rezervasyonDurum === 'aktif') {
    return `<span class="etiket etiket-mor">✓ Rezerve${m.rezervasyonPorsiyon === 'yarim' ? ' · yarım' : ''}</span>`;
  }
  if (m.rezervasyonDurum === 'kullanildi') return '<span class="etiket">Kullanıldı</span>';
  if (m.suresiDoldu) return '<button class="dugme dugme-kucuk" disabled>Süre doldu</button>';
  if (m.bosYer <= 0) return '<button class="dugme dugme-kucuk" disabled>Dolu</button>';
  return `<button class="dugme dugme-kucuk" data-menu="${m.menuId}">Rezerve et</button>`;
}

function rezerveEdilebilir(m) {
  const yokYaDaIptal = !m.rezervasyonDurum || m.rezervasyonDurum === 'iptal';
  return yokYaDaIptal && !m.suresiDoldu && m.bosYer > 0;
}

// öğle ve akşamda tam / yarım seçimi (kahvaltıda yok)
function porsiyonSecimi(m) {
  if (!m.yarimPorsiyonVar || !rezerveEdilebilir(m)) return '';
  return `
    <div class="porsiyon-secim">
      <label><input type="radio" name="porsiyon-${m.menuId}" value="tam" checked><span>Tam</span></label>
      <label><input type="radio" name="porsiyon-${m.menuId}" value="yarim"><span>Yarım</span></label>
    </div>`;
}

// ekranda gösterilecek fiyat: rezervasyon varsa onun porsiyonuna, yoksa seçime göre
function gosterilenFiyat(m, secilen) {
  const rezervasyonVar = m.rezervasyonDurum === 'aktif' || m.rezervasyonDurum === 'kullanildi';
  const yarim = rezervasyonVar ? m.rezervasyonPorsiyon === 'yarim' : secilen === 'yarim';
  return tl(yarim ? m.yarimFiyat : m.fiyat);
}

function ciz() {
  if (menuler.length === 0) {
    alan.innerHTML = '<div class="kart bos-durum">Bu hafta için menü yok.</div>';
    return;
  }
  const gunler = {};
  for (const m of menuler) (gunler[m.tarih] ??= []).push(m);

  alan.innerHTML = `
    <p class="kaydir-ipucu">Diğer günler için yana kaydır ›</p>
    <div class="hafta-izgara">
      ${Object.entries(gunler).map(([tarih, liste]) => `
        <article class="gun-kart">
          <h2>${tarihYaz(tarih)} ${tarih === bugunTarihi ? '<span class="bugun-isaret">BUGÜN</span>' : ''}</h2>
          ${liste.map((m) => `
            <div class="ogun-satir">
              <div class="ogun-ust">
                <span class="ogun-ad">${esc(m.ogun)}
                  ${m.alerjenUyarisi ? '<span class="etiket etiket-uyari">⚠ alerjen</span>' : ''}</span>
                <span class="etiket etiket-sari">${m.bosYer} boş</span>
              </div>
              <p class="ogun-yemekler soluk">${esc(m.yemekler)}</p>
              ${porsiyonSecimi(m)}
              <div class="ogun-alt">
                <span class="ogun-bilgi"><span class="fiyat" id="fiyat-${m.menuId}">${gosterilenFiyat(m, 'tam')}</span>
                  <span class="soluk"> · son ${m.rezervasyonSon.slice(11, 16)}</span></span>
                ${dugme(m)}
              </div>
            </div>`).join('')}
        </article>`).join('')}
    </div>`;
}

function porsiyonDegisti(olay) {
  const radyo = olay.target.closest('input[type=radio]');
  if (!radyo) return;
  const menuId = Number(radyo.name.split('-')[1]);
  const m = menuler.find((x) => x.menuId === menuId);
  document.getElementById('fiyat-' + menuId).textContent = gosterilenFiyat(m, radyo.value);
}

async function rezervasyonYap(olay) {
  const dugmeEl = olay.target.closest('button[data-menu]');
  if (!dugmeEl) return;
  const menuId = Number(dugmeEl.dataset.menu);
  const secili = alan.querySelector(`input[name="porsiyon-${menuId}"]:checked`);
  const porsiyon = secili ? secili.value : 'tam';
  dugmeEl.disabled = true;

  try {
    const sonuc = await api('/rezervasyonlar', { yontem: 'POST', govde: { menuId, porsiyon } });
    // bakiye procedure'ün döndürdüğü değer, yani kaynaktaki güncel bakiye
    const ne = sonuc.porsiyon === 'yarim' ? 'Yarım porsiyon rezervasyon' : 'Rezervasyon';
    bildir(mesaj, `${ne} yapıldı. ${tl(sonuc.ucret)} düşüldü, bakiyen ${tl(sonuc.bakiye)}.`, 'basari');

    // Listeyi replikadan tekrar çekmiyoruz, replika bu rezervasyonu henüz
    // almamış olabilir. Onun yerine o menüyü burada güncelliyoruz.
    const m = menuler.find((x) => x.menuId === menuId);
    if (!m) return; // bu arada hafta ya da yemekhane değiştirildiyse liste zaten yeni
    m.rezervasyonDurum = 'aktif';
    m.rezervasyonPorsiyon = sonuc.porsiyon;
    m.bosYer -= 1;
    const izgara = alan.querySelector('.hafta-izgara');
    const kaydirma = izgara ? izgara.scrollLeft : 0;
    ciz();
    alan.querySelector('.hafta-izgara').scrollLeft = kaydirma; // telefonda aynı günde kal
  } catch (hata) {
    bildir(mesaj, hata.message);
    dugmeEl.disabled = false;
  }
  mesaj.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

basla();
