// Profil ekranı: kullanıcı bilgileri, diğer ekranlara bağlantılar, çıkış
const ROL_ADI = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };

async function basla() {
  const k = await sayfaBaslat('Profil', '/profil.html');

  document.getElementById('ad-soyad').textContent = `${k.ad} ${k.soyad}`;
  const satirlar = [
    ['Rol', ROL_ADI[k.rol]],
    ['E-posta', k.eposta],
    k.ogrenci_no ? ['Öğrenci no', k.ogrenci_no] : null,
    ['Bakiye', tl(k.bakiye)],
  ].filter(Boolean);
  document.getElementById('bilgiler').innerHTML = satirlar
    .map(([ad, deger]) => `<div><dt>${ad}</dt><dd>${esc(deger)}</dd></div>`).join('');

  if (k.rol === 'yonetici') {
    document.getElementById('yonetici-baglanti').classList.remove('gizli');
  }

  alerjenleriYukle();

  document.getElementById('cikis').addEventListener('click', async () => {
    await api('/cikis', { yontem: 'POST' });
    location.href = '/';
  });
}

// Aşama 4 · alerjen seçimi
const alerjenForm = document.getElementById('alerjen-formu');
const alerjenMesaj = document.getElementById('alerjen-mesaj');

async function alerjenleriYukle() {
  try {
    const { tumu, secili } = await api('/profil/alerjenler');
    document.getElementById('alerjenler').innerHTML = tumu.map((a) => `
      <label class="secim-hap">
        <input type="checkbox" name="alerjen" value="${a.id}" ${secili.includes(a.id) ? 'checked' : ''}>
        <span>${esc(a.ad)}</span>
      </label>`).join('');
  } catch (hata) {
    bildir(alerjenMesaj, hata.message);
  }
}

alerjenForm.addEventListener('submit', async (olay) => {
  olay.preventDefault();
  const alerjenIdler = [...alerjenForm.querySelectorAll('input:checked')].map((i) => Number(i.value));
  try {
    await api('/profil/alerjenler', { yontem: 'PUT', govde: { alerjenIdler } });
    bildir(alerjenMesaj, alerjenIdler.length
      ? `${alerjenIdler.length} alerjen kaydedildi. Menüde bu alerjenleri içeren yemekler uyarıyla gösterilecek.`
      : 'Alerjen seçimin temizlendi.', 'basari');
  } catch (hata) {
    bildir(alerjenMesaj, hata.message);
  }
});

basla();
