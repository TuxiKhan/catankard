# Catan 4 Kişilik Oyun - Ana Masa Görünümü (Main Desk)

**Kaynak Görsel:** `catan 4 player game main desk.png`  
**Oyun Tipi:** Catan Hızlı Kart Oyunu - 4 Oyunculu Düzen  
**Görünüm Modu:** Standart Oyun Tahtası / Ana Masa Görünümü (Default HUD & Table View)

---

## 1. Genel Tanım ve Arayüz Düzeni
Bu ekran görüntüsü, 4 oyunculu Catan kart oyununun varsayılan ana masa görünümünü (Main Desk) temsil eder. Herhangi bir modal pencere veya odaklanmış inceleme katmanı bulunmaz; oyunun genel tahta durumunu gösterir.

* **Arka Plan:** Koyu bordo / kırmızı zemin.
* **Bölümlendirme:** Ekran, dikey ve yatay eksenlerde uzanan **beyaz kesikli çizgilerle (grid)** 4 eşit çeyreğe ayrılmıştır.
* **Oyuncu Sayısı:** 4 oyuncu (Her biri tahtanın bir çeyreğinde yer alır).

---

## 2. Dört Çeyrekli Oyuncu Düzeni (4 Quadrants)

### 2.1. Sol Üst Çeyrek (Oyuncu 1)
* **El Destesi:** Sol üst köşede kapalı kart yelpazesi.
* **Binalar:**
  * 1x Köy Kartı (Maliyet: Tuğla + Odun + Yün + Buğday | 1 Zafer Puanı | `1x ◈`)
  * 1x Şehir Kartı (Köy üzerine yükseltilmiş | 3 Taş + 2 Buğday | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*)

### 2.2. Sağ Üst Çeyrek (Oyuncu 2)
* **Masa Başlığı:** İki üst bölgenin birleşiminde dikey çizginin sağında `masa` yazısı.
* **El Destesi:** Sağ üst köşede kapalı kart yelpazesi.
* **Binalar:**
  * 1x Şehir Kartı (Köy üzerine yükseltilmiş | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*)
  * 1x Köy Kartı (1 Zafer Puanı | `1x ◈`)

### 2.3. Sol Alt Çeyrek (Oyuncu 3)
* **El Destesi:** Sol alt köşede kapalı kart yelpazesi.
* **Binalar:**
  * 1x Köy Kartı (1 Zafer Puanı | `1x ◈`)
  * 1x Şehir Kartı (Köy üzerine yükseltilmiş | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*)

### 2.4. Sağ Alt Çeyrek (Oyuncu 4 / Aktif Oyuncu)
* **Binalar:**
  * 1x Şehir Kartı (Köy üzerine yükseltilmiş | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*)
  * 1x Köy Kartı (1 Zafer Puanı | `1x ◈`)
* **El Kartları:** Sağ alt köşede dinlenme konumunda duran 5 adet açık kaynak kartı (Taş, Tuğla, Buğday, Odun, Yün).

---

## 3. Ortak Alan: İnşa Pazar Sırası (`building row`) ve Desteler
Yatay orta eksen üzerine yerleştirilmiş inşa sırası ve desteler:
* **Sol Deste:** Kapalı hammadde çekme destesi (desenli açık kahverengi kart arkalığı).
* **`building row` (İnşa Sırası - 6 Kart Yuvası):**
  1. *Gelişim Destesi:* Yeşil zeminli, çekiç kabartmalı kapalı kart.
  2. *Şövalye (Knight):* Açık kart (Maliyet: 1 Yün, 1 Taş, 1 Buğday | Etki: `+1` kart çekme).
  3. *Yol (Road):* Açık kart (Maliyet: 1 Tuğla, 1 Odun | Etki: 4:1'den 1:1'e liman takası kademeleri).
  4. *Şehir (City):* Açık kart (Maliyet: 3 Taş, 2 Buğday | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*).
  5. *Köy (Settlement):* Açık kart (Maliyet: 1 Tuğla, 1 Odun, 1 Yün, 1 Buğday | 1 Zafer Puanı | `1x ◈`).
  6. *Şehir (City):* Açık kart (Maliyet: 3 Taş, 2 Buğday | 2 Zafer Puanı | *"Sıra sendeyken: +🃏"*).
* **Sağ Deste:** Kapalı gri/gümüş desenli özel kart destesi.

---

## 4. 3 Oyunculu ve 4 Oyunculu Masa Farkları Özeti
* **Masa Ayrımı:** 4 kişilik masada tahtayı 4 alana bölen beyaz kesikli grid çizgileri mevcuttur.
* **Oyuncu Konumlandırması:** 3 kişilik versiyonda aktif oyuncu alt ortada yer alırken, 4 kişilik versiyonda aktif oyuncu sağ alt çeyreğe, 3. rakip ise sol alt çeyreğe yerleştirilmiştir.
* **Simetri:** Her oyuncu bölgesinde eşit şekilde 2 bina yuvası (Köy/Şehir) ve köşe el destesi mevcuttur.
