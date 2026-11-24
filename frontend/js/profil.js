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

  document.getElementById('cikis').addEventListener('click', async () => {
    await api('/cikis', { yontem: 'POST' });
    location.href = '/';
  });
}

basla();
