// Profil: kullanıcı bilgileri, alerjen seçimi, diğer sayfalara bağlantılar
const ROLLER = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };
const mesaj = document.getElementById('mesaj');
const alerjenForm = document.getElementById('alerjen-formu');
const alerjenMesaj = document.getElementById('alerjen-mesaj');

async function basla() {
  try {
    const k = await sayfaBaslat('Profil', '/profil.html');
    document.getElementById('ad-soyad').textContent = `${k.ad} ${k.soyad}`;
    const satirlar = [['Rol', ROLLER[k.rol]], ['E-posta', k.eposta]];
    if (k.ogrenci_no) satirlar.push(['Öğrenci no', k.ogrenci_no]);
    satirlar.push(['Bakiye', tl(k.bakiye)]);
    document.getElementById('bilgiler').innerHTML = satirlar
      .map(([ad, deger]) => `<div><dt>${ad}</dt><dd>${esc(deger)}</dd></div>`).join('');

    if (k.rol === 'yonetici') {
      document.getElementById('yonetici-baglanti').classList.remove('gizli');
    }
    await alerjenleriYukle();
  } catch (hata) {
    bildir(mesaj, hata.message);
  }

  document.getElementById('cikis').addEventListener('click', async () => {
    try {
      await api('/cikis', { yontem: 'POST' });
    } finally {
      location.href = '/';
    }
  });
  alerjenForm.addEventListener('submit', alerjenleriKaydet);
}

async function alerjenleriYukle() {
  const { tumu, secili } = await api('/profil/alerjenler');
  document.getElementById('alerjenler').innerHTML = tumu.map((a) => `
    <label class="secim-hap">
      <input type="checkbox" value="${a.id}" ${secili.includes(a.id) ? 'checked' : ''}>
      <span>${esc(a.ad)}</span>
    </label>`).join('');
}

async function alerjenleriKaydet(olay) {
  olay.preventDefault();
  const alerjenIdler = [...alerjenForm.querySelectorAll('input:checked')].map((i) => Number(i.value));
  try {
    await api('/profil/alerjenler', { yontem: 'PUT', govde: { alerjenIdler } });
    bildir(alerjenMesaj, alerjenIdler.length
      ? 'Kaydedildi. Menüde bu alerjenleri içeren yemekler uyarıyla gösterilecek.'
      : 'Alerjen seçimin temizlendi.', 'basari');
  } catch (hata) {
    bildir(alerjenMesaj, hata.message);
  }
}

basla();
