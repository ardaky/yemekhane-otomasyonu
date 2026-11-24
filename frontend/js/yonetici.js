// Yönetici paneli: doluluk ve puan raporu, menü ekleme ve düzenleme
const mesaj = document.getElementById('mesaj');
const raporForm = document.getElementById('rapor-formu');
const raporEl = document.getElementById('rapor');
const form = document.getElementById('menu-formu');
const yemeklerEl = document.getElementById('yemekler');
const aramaKutusu = document.getElementById('m-ara');

let duzenlenenId = null; // null ise yeni menü ekleniyor
let bugunTarihi;

async function basla() {
  try {
    const k = await sayfaBaslat('Yönetici Paneli', '/profil.html');
    if (k.rol !== 'yonetici') {
      bildir(mesaj, 'Bu sayfa yalnızca yöneticiler içindir.');
      document.querySelectorAll('section').forEach((s) => s.remove());
      return;
    }
    const [{ yemekhaneler, ogunler, bugun }, yemekler] = await Promise.all([
      api('/secenekler'),
      api('/yonetici/yemekler'),
    ]);
    bugunTarihi = bugun;
    form.yemekhaneId.innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
    form.ogunId.innerHTML = ogunler.map((o) => `<option value="${o.id}">${esc(o.ad)}</option>`).join('');
    form.tarih.value = gunEkle(bugun, 7);
    form.tarih.min = bugun;
    yemekListesiCiz(yemekler);

    // son 3 gün puanlar için, sonraki 3 gün doluluk için
    raporForm['r-baslangic'].value = gunEkle(bugun, -3);
    raporForm['r-bitis'].value = gunEkle(bugun, 3);
    raporYukle();
  } catch (hata) {
    bildir(mesaj, hata.message);
    return;
  }

  raporForm.addEventListener('change', raporYukle);
  raporEl.addEventListener('click', duzenle);
  form.addEventListener('submit', kaydet);
  document.getElementById('vazgec').addEventListener('click', formuTemizle);
  aramaKutusu.addEventListener('input', yemekAra);
  yemeklerEl.addEventListener('change', seciliSayisi);
}

async function raporYukle() {
  try {
    const p = new URLSearchParams({ baslangic: raporForm['r-baslangic'].value, bitis: raporForm['r-bitis'].value });
    const satirlar = await api('/yonetici/rapor?' + p);
    raporEl.innerHTML = satirlar.length === 0
      ? '<tr><td colspan="4" class="soluk">Bu aralıkta menü yok.</td></tr>'
      : satirlar.map((s) => `
        <tr>
          <td>${tarihYaz(s.tarih, false)}<br><span class="soluk">${esc(s.yemekhane.split(' ')[0])} · ${esc(s.ogun)}</span></td>
          <td>${s.rezerve}/${s.kapasite}
            <div class="doluluk-cubuk"><span style="width:${Math.min(100, s.doluluk_yuzde)}%"></span></div></td>
          <td>${s.ortalama_puan === null ? '<span class="soluk">–</span>'
              : `★ ${Number(s.ortalama_puan).toFixed(1)}<br><span class="soluk">${s.oy_sayisi} oy</span>`}</td>
          <td>${s.tarih < bugunTarihi ? ''
              : `<button class="dugme dugme-ikincil dugme-kucuk" data-duzenle="${s.menu_id}" title="Düzenle">✎</button>`}</td>
        </tr>`).join('');
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function yemekListesiCiz(yemekler) {
  const kategoriler = {};
  for (const y of yemekler) (kategoriler[y.kategori] ??= []).push(y);
  yemeklerEl.innerHTML = Object.entries(kategoriler).map(([kategori, liste]) => `
    <fieldset>
      <legend>${esc(kategori)}</legend>
      ${liste.map((y) => `
        <label data-ad="${esc(y.ad.toLocaleLowerCase('tr'))}">
          <input type="checkbox" value="${y.id}">
          ${esc(y.ad)} <span class="soluk">${y.kalori} kcal${y.vejetaryen ? ' · V' : ''}</span>
        </label>`).join('')}
    </fieldset>`).join('');
  seciliSayisi();
}

function yemekAra() {
  const aranan = aramaKutusu.value.toLocaleLowerCase('tr');
  yemeklerEl.querySelectorAll('label').forEach((l) => l.classList.toggle('gizli', !l.dataset.ad.includes(aranan)));
}

function seciliSayisi() {
  const n = yemeklerEl.querySelectorAll('input:checked').length;
  document.getElementById('secili-sayi').textContent = `(${n} seçili)`;
}

async function duzenle(olay) {
  const dugme = olay.target.closest('[data-duzenle]');
  if (!dugme) return;
  try {
    const m = await api('/yonetici/menuler/' + dugme.dataset.duzenle);
    duzenlenenId = m.id;
    aramaKutusu.value = '';
    yemekAra();
    form.yemekhaneId.value = m.yemekhane_id;
    form.tarih.value = m.tarih;
    form.ogunId.value = m.ogun_id;
    form.ogrenciFiyati.value = m.ogrenci_fiyati;
    form.personelFiyati.value = m.personel_fiyati;
    yemeklerEl.querySelectorAll('input').forEach((i) => { i.checked = m.yemekIdler.includes(Number(i.value)); });
    // rezervasyonlar bu tarih ve öğüne yapıldığı için bunlar değiştirilemiyor
    form.tarih.min = '';
    [form.yemekhaneId, form.tarih, form.ogunId].forEach((a) => { a.disabled = true; });
    document.getElementById('form-baslik').textContent = `Menüyü düzenle · ${tarihYaz(m.tarih, false)}`;
    document.getElementById('kaydet').textContent = 'Kaydet';
    document.getElementById('vazgec').classList.remove('gizli');
    seciliSayisi();
    document.getElementById('form-kart').scrollIntoView({ behavior: 'smooth' });
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function formuTemizle() {
  duzenlenenId = null;
  form.ogrenciFiyati.value = '';
  form.personelFiyati.value = '';
  form.tarih.min = bugunTarihi;
  aramaKutusu.value = '';
  yemekAra();
  yemeklerEl.querySelectorAll('input').forEach((i) => { i.checked = false; });
  [form.yemekhaneId, form.tarih, form.ogunId].forEach((a) => { a.disabled = false; });
  document.getElementById('form-baslik').textContent = 'Yeni menü';
  document.getElementById('kaydet').textContent = 'Menüyü oluştur';
  document.getElementById('vazgec').classList.add('gizli');
  seciliSayisi();
}

async function kaydet(olay) {
  olay.preventDefault();
  const dugme = document.getElementById('kaydet');
  const govde = {
    yemekhaneId: Number(form.yemekhaneId.value),
    tarih: form.tarih.value,
    ogunId: Number(form.ogunId.value),
    ogrenciFiyati: form.ogrenciFiyati.value,
    personelFiyati: form.personelFiyati.value,
    yemekIdler: [...yemeklerEl.querySelectorAll('input:checked')].map((i) => Number(i.value)),
  };
  dugme.disabled = true;
  try {
    if (duzenlenenId) {
      await api('/yonetici/menuler/' + duzenlenenId, { yontem: 'PUT', govde });
      bildir(mesaj, 'Menü güncellendi.', 'basari');
    } else {
      await api('/yonetici/menuler', { yontem: 'POST', govde });
      bildir(mesaj, 'Menü oluşturuldu.', 'basari');
    }
    formuTemizle();
    setTimeout(raporYukle, 500); // rapor replikadan
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  dugme.disabled = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

basla();
