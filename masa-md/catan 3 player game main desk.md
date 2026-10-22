# Catan 3 Kişilik Oyun - Ana Masa Görünümü (Main Desk)

**Kaynak Görsel:** `catan 3 player game main desk.png`  
**Oyun Tipi:** Catan Hızlı Kart Oyunu - 3 Oyunculu Düzen  
**Görünüm Modu:** Standart Oyun Tahtası / Ana Masa Görünümü (Default HUD & Table View)

---

## 1. Genel Tanım ve Arayüz Düzeni
Bu ekran görüntüsü, 3 oyunculu Catan kart oyununun temel oyun tahtası görünümünü (Main Desk) göstermektedir. Herhangi bir modal pencere veya inceleme katmanı açık değildir; oyun akışındaki aktif tahta durumunu sunar.

* **Arka Plan:** Bordo / koyu kırmızı zemin.
* **Katılımcı Sayısı:** 3 Oyuncu (Sol üst, Sağ üst ve Alt aktif oyuncu).
* **Ortak Alanlar:** Üstte `masa` bölgesi, ortada `building row` (inşa sırası) ve yanlardaki çekme desteleri.

---

## 2. Oyun Alanı Bölgeleri

### 2.1. Üst Alan (Rakiplerin Bölgeleri)
* **Üst Başlık:** `masa` yazısı orta üstte konumlandırılmıştır.
* **Sol Üst Rakip (Oyuncu 2):**
  * Köşede kapalı kart yelpazesi (el destesi).
  * Masa üzerindeki yapıları:
    * 1x Köy Kartı (1 Zafer Puanı, `1x ◈`)
    * 1x Şehir Kartı (Köy üzerine yükseltilmiş, 2 Zafer Puanı, *"Sıra sendeyken: +🃏"*)
* **Sağ Üst Rakip (Oyuncu 3):**
  * Köşede kapalı kart yelpazesi (el destesi).
  * Masa üzerindeki yapıları:
    * 1x Şehir Kartı (Köy üzerine yükseltilmiş, 2 Zafer Puanı, *"Sıra sendeyken: +🃏"*)
    * 1x Köy Kartı (1 Zafer Puanı, `1x ◈`)

---

### 2.2. Orta Bölge: Pazar ve Ortak Çekme Desteleri (`building row`)
Merkezde yer alan dikdörtgen beyaz çerçeve içindeki inşa sırası (`building row`):
* **Sol Çekme Destesi:** Kapalı hammadde kaynak destesi (kahverengi altıgen desenli).
* **Building Row Kartları (Soldan Sağa):**
  1. *Gelişim Destesi:* Yeşil zeminli, çekiç armalı kapalı kart.
  2. *Şövalye:* Açık kart (Maliyet: 1 Yün, 1 Taş, 1 Buğday | Özellik: `+1` kart).
  3. *Yol:* Açık kart (Maliyet: 1 Tuğla, 1 Odun | Özellik: 4:1'den 1:1'e liman takas indirimi).
  4. *Şehir:* Açık kart (Maliyet: 3 Taş, 2 Buğday | 2 Puan).
  5. *Köy:* Açık kart (Maliyet: 1 Tuğla, 1 Odun, 1 Yün, 1 Buğday | 1 Puan).
  6. *Şehir:* Açık kart (Maliyet: 3 Taş, 2 Buğday | 2 Puan).
* **Sağ Çekme Destesi:** Kapalı gri/gümüş desenli özel deste.

---

### 2.3. Alt Bölge: Aktif Oyuncunun Alanı (Oyuncu 1)
* **İnşa Edilmiş Binalar:**
  * 1x Şehir (Köy kartı altında kalacak şekilde yükseltilmiş; 2 Zafer Puanı)
  * 1x Köy (1 Zafer Puanı)
* **El Kartları:**
  Alt merkezde yelpaze şeklinde dizilmiş 5 kaynak kartı:
  1. Taş / Maden (Ore)
  2. Tuğla (Brick)
  3. Buğday (Grain)
  4. Odun (Lumber)
  5. Yün (Wool)

---

## 3. UI/UX ve Tasarım Özellikleri
* **Kart Hiyerarşisi:** Şehirler, daha önce inşa edilmiş Köy kartlarının üzerine yerleştirilerek yükseltme (upgrade) mekaniği görselleştirilmiştir.
* **Kaynak ve Puan Takibi:** Kartların üzerindeki maliyet ikonları, zafer puanı mühürleri ve tur başı tetiklenen etkiler açık ve okunabilir şekilde yerleştirilmiştir.
