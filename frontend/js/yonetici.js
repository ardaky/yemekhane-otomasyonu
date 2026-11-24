// Yönetici paneli: menü bazında doluluk/puan raporu, menü oluşturma ve düzenleme
const mesaj = document.getElementById('mesaj');
const raporForm = document.getElementById('rapor-formu');
const raporEl = document.getElementById('rapor');
const form = document.getElementById('menu-formu');
const yemeklerEl = document.getElementById('yemekler');

let duzenlenenId = null;   // null ise yeni menü oluşturuluyor

async function basla() {
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
  form.yemekhaneId.innerHTML = yemekhaneler.map((y) => `<option value="${y.id}">${esc(y.ad)}</option>`).join('');
  form.ogunId.innerHTML = ogunler.map((o) => `<option value="${o.id}">${esc(o.ad)}</option>`).join('');
  form.tarih.value = gunEkle(bugun, 7);
  yemekListesiCiz(yemekler);

  // Varsayılan aralık: son 3 gün (puanlar) + önümüzdeki 3 gün (doluluk)
  raporForm['r-baslangic'].value = gunEkle(bugun, -3);
  raporForm['r-bitis'].value = gunEkle(bugun, 3);
  raporForm.addEventListener('change', raporYukle);
  raporEl.addEventListener('click', duzenleTiklandi);
  form.addEventListener('submit', kaydet);
  document.getElementById('vazgec').addEventListener('click', formuSifirla);
  document.getElementById('m-ara').addEventListener('input', yemekAra);
  yemeklerEl.addEventListener('change', seciliSay);
  raporYukle();
}

// ---------- Rapor ----------
async function raporYukle() {
  try {
    const p = new URLSearchParams({
      baslangic: raporForm['r-baslangic'].value,
      bitis: raporForm['r-bitis'].value,
    });
    const satirlar = await api('/yonetici/rapor?' + p);
    raporEl.innerHTML = satirlar.length === 0
      ? '<tr><td colspan="5" class="soluk">Bu aralıkta menü yok.</td></tr>'
      : satirlar.map((s) => `
        <tr>
          <td>${tarihYaz(s.tarih, false)}</td>
          <td>${esc(s.yemekhane.replace(' Yemekhanesi', '').replace(' Yemekhane', ''))} · ${esc(s.ogun)}</td>
          <td>${s.rezerve}/${s.kapasite} <span class="soluk">(%${s.doluluk_yuzde})</span>
            <div class="doluluk-cubuk"><span style="width:${Math.min(100, s.doluluk_yuzde)}%"></span></div></td>
          <td>${s.ortalama_puan === null ? '<span class="soluk">–</span>'
              : `★ ${Number(s.ortalama_puan).toFixed(1)} <span class="soluk">(${s.oy_sayisi})</span>`}</td>
          <td><button class="dugme dugme-ikincil dugme-kucuk" data-duzenle="${s.menu_id}" aria-label="Menüyü düzenle" title="Düzenle">✎</button></td>
        </tr>`).join('');
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

// ---------- Yemek seçimi ----------
function yemekListesiCiz(yemekler) {
  const kategoriler = {};
  for (const y of yemekler) (kategoriler[y.kategori] ??= []).push(y);
  yemeklerEl.innerHTML = Object.entries(kategoriler).map(([kategori, liste]) => `
    <fieldset>
      <legend>${esc(kategori)}</legend>
      ${liste.map((y) => `
        <label data-ad="${esc(y.ad.toLocaleLowerCase('tr'))}">
          <input type="checkbox" name="yemek" value="${y.id}">
          ${esc(y.ad)} <span class="soluk">${y.kalori} kcal${y.vejetaryen ? ' · V' : ''}</span>
        </label>`).join('')}
    </fieldset>`).join('');
  seciliSay();
}

function yemekAra(olay) {
  const aranan = olay.target.value.toLocaleLowerCase('tr');
  yemeklerEl.querySelectorAll('label').forEach((l) => {
    l.classList.toggle('gizli', !l.dataset.ad.includes(aranan));
  });
}

function seciliSay() {
  const n = yemeklerEl.querySelectorAll('input:checked').length;
  document.getElementById('secili-sayi').textContent = `(${n} seçili)`;
}

// ---------- Oluşturma ve düzenleme ----------
async function duzenleTiklandi(olay) {
  const dugme = olay.target.closest('[data-duzenle]');
  if (!dugme) return;
  try {
    const m = await api('/yonetici/menuler/' + dugme.dataset.duzenle);
    duzenlenenId = m.id;
    form.yemekhaneId.value = m.yemekhane_id;
    form.tarih.value = m.tarih;
    form.ogunId.value = m.ogun_id;
    form.ogrenciFiyati.value = m.ogrenci_fiyati;
    form.personelFiyati.value = m.personel_fiyati;
    yemeklerEl.querySelectorAll('input').forEach((i) => { i.checked = m.yemekIdler.includes(Number(i.value)); });
    // Rezervasyonlar o güne ve öğüne yapıldığı için bu üç alan değiştirilemez
    [form.yemekhaneId, form.tarih, form.ogunId].forEach((a) => { a.disabled = true; });
    document.getElementById('form-baslik').textContent = `Menüyü düzenle · ${tarihYaz(m.tarih, false)}`;
    document.getElementById('kaydet').textContent = 'Değişiklikleri kaydet';
    document.getElementById('vazgec').classList.remove('gizli');
    seciliSay();
    document.getElementById('form-kart').scrollIntoView({ behavior: 'smooth' });
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
}

function formuSifirla() {
  duzenlenenId = null;
  form.ogrenciFiyati.value = '';
  form.personelFiyati.value = '';
  yemeklerEl.querySelectorAll('input').forEach((i) => { i.checked = false; });
  [form.yemekhaneId, form.tarih, form.ogunId].forEach((a) => { a.disabled = false; });
  document.getElementById('form-baslik').textContent = 'Yeni menü';
  document.getElementById('kaydet').textContent = 'Menüyü oluştur';
  document.getElementById('vazgec').classList.add('gizli');
  seciliSay();
}

async function kaydet(olay) {
  olay.preventDefault();
  const govde = {
    yemekhaneId: Number(form.yemekhaneId.value),
    tarih: form.tarih.value,
    ogunId: Number(form.ogunId.value),
    ogrenciFiyati: form.ogrenciFiyati.value,
    personelFiyati: form.personelFiyati.value,
    yemekIdler: [...yemeklerEl.querySelectorAll('input:checked')].map((i) => Number(i.value)),
  };
  try {
    if (duzenlenenId) {
      await api('/yonetici/menuler/' + duzenlenenId, { yontem: 'PUT', govde });
      bildir(mesaj, 'Menü güncellendi.', 'basari');
    } else {
      await api('/yonetici/menuler', { yontem: 'POST', govde });
      bildir(mesaj, 'Menü oluşturuldu.', 'basari');
    }
    formuSifirla();
    setTimeout(raporYukle, 500);   // rapor replikadan okunur
  } catch (hata) {
    bildir(mesaj, hata.message);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

basla();
