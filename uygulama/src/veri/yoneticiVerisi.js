const { yazma, okuma } = require('./baglanti');

// menü bazında doluluk ve ortalama puan
async function menuRaporu(baslangic, bitis) {
  const [satirlar] = await okuma.query(
    `SELECT d.menu_id, d.tarih, d.yemekhane, d.ogun,
            d.kapasite, d.rezerve, d.doluluk_yuzde,
            p.oy_sayisi, p.ortalama_puan
       FROM v_menu_doluluk d
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
       JOIN ogunler o     ON o.id = d.ogun_id
      WHERE d.tarih BETWEEN ? AND ?
      ORDER BY d.tarih, d.yemekhane_id, o.sira`,
    [baslangic, bitis]
  );
  return satirlar;
}

async function tumYemekler() {
  const [satirlar] = await okuma.query(
    `SELECT y.id, y.ad, k.ad AS kategori, y.kalori, y.vejetaryen
       FROM yemekler y
       JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.ad`
  );
  return satirlar;
}

// Düzenleme formu için. Yönetici kaydettikten hemen sonra düzenlemeye
// dönebildiği için kaynaktan okuyoruz.
async function menuGetir(menuId) {
  const [[menu]] = await yazma.query(
    `SELECT id, yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati
       FROM menuler WHERE id = ?`,
    [menuId]
  );
  if (!menu) return null;
  const [yemekler] = await yazma.query('SELECT yemek_id FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
  menu.yemekIdler = yemekler.map((y) => y.yemek_id);
  return menu;
}

// Menü ve yemekleri tek transaction'da kaydediliyor, yarım kayıt kalmasın.
// Aynı yemekhane/tarih/öğün için menü zaten varsa null döner.
async function menuOlustur(m) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [sonuc] = await baglanti.query(
      `INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyati, personel_fiyati)
       VALUES (?, ?, ?, ?, ?)`,
      [m.yemekhaneId, m.tarih, m.ogunId, m.ogrenciFiyati, m.personelFiyati]
    );
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      m.yemekIdler.map((yemekId) => [sonuc.insertId, yemekId]),
    ]);
    await baglanti.commit();
    return sonuc.insertId;
  } catch (err) {
    await baglanti.rollback();
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  } finally {
    baglanti.release();
  }
}

// Sadece fiyatlar ve yemekler değişebiliyor. Tarih/öğün değişirse o menüye
// yapılmış rezervasyonlar anlamsız hale gelir.
// Önbellek anahtarı için menünün yemekhane, tarih ve öğününü döndürür.
async function menuGuncelle(menuId, m) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const [[mevcut]] = await baglanti.query(
      'SELECT yemekhane_id, tarih, ogun_id FROM menuler WHERE id = ? FOR UPDATE',
      [menuId]
    );
    if (!mevcut) {
      await baglanti.rollback();
      return null;
    }
    await baglanti.query(
      'UPDATE menuler SET ogrenci_fiyati = ?, personel_fiyati = ? WHERE id = ?',
      [m.ogrenciFiyati, m.personelFiyati, menuId]
    );
    await baglanti.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
    await baglanti.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [
      m.yemekIdler.map((yemekId) => [menuId, yemekId]),
    ]);
    await baglanti.commit();
    return mevcut;
  } catch (err) {
    await baglanti.rollback();
    throw err;
  } finally {
    baglanti.release();
  }
}

module.exports = { menuRaporu, tumYemekler, menuGetir, menuOlustur, menuGuncelle };
