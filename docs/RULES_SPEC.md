# CATAN – On the Road · Konsolide Kural Spesifikasyonu (v0.1)

> Kaynak: `CN3143 CATAN - On the Road Rulebook.md` (PDF'ten bozuk çıkarılmış metin, Master Agent tarafından yeniden kurgulandı) + `catan_on_the_road_cards - Türkçe md/`.
> Tüm Sub-Agent'lar oyun mantığı için **bu dosyayı** esas alır. `❓` işaretli maddeler kullanıcı onayı bekler; sub-agent bunlar için varsayım yapmaz.

## 1. Bileşenler
| Grup | İçerik | Adet |
| :--- | :--- | :--- |
| Kaynak (61) | Tuğla 11, Odun 11, Yün 14, Buğday 12, Demir 13 | 61 |
| İnşaat destesi (34) | Yol 10, Köy 11, Şehir 5, Şövalye 8 | 34 |
| Büyükşehir (4) | Çift yüzlü: A yüzü (4× aynı) / B yüzü (Şövalyeler, Yollar, En Uzun Yol eşitliği, En Güçlü Ordu eşitliği) | 4 |
| Olay (7) | Hırsız 3, Yeni Yıl (Solstice) 1, Teşvik (Abundance) 1, Hasat Kutlaması (Subsidy) 1, Sadaka (Charity) 1 | 7 |
| Başlangıç | İlk Yol 4, İlk Köy 4 (1 tanesi "Oyuna sen başlarsın") | 8 |
| Bonus | En Uzun Yol (2 ZP), En Güçlü Ordu (2 ZP) | 2 |

Not: Oyuncu yardım kartındaki toplam sayılar (Yol 14, Köy 15) başlangıç kartları dahildir.

## 2. Maliyetler & Değerler
| Kart | Maliyet | ZP | Yerleşim / Etki |
| :--- | :--- | :---: | :--- |
| Yol | 1 Tuğla + 1 Odun | 0 | Yol sayısına göre takas oranı (bkz. §5.3) |
| Şövalye | 1 Yün + 1 Buğday + 1 Demir | 0 | Hırsız el limitini +1 artırır |
| Köy | 1 Tuğla + 1 Odun + 1 Yün + 1 Buğday | 1 | İnşa edilince hemen 1 Olay kartı açılır ve çözülür |
| Şehir | 3 Demir + 2 Buğday | 2 | Görünür (üstü kapanmamış) bir Köyün üstüne. Altta kalan Köy puan vermez |
| Büyükşehir | 3 Yün + 1 Demir | 3 | Görünür bir Şehrin üstüne. Altta kalan Şehir puan vermez |
| En Uzun Yol | – | 2 | 3 yola ilk ulaşan alır; başkası **daha fazla** yola ulaşınca hemen ona geçer |
| En Güçlü Ordu | – | 2 | 2 şövalyeye ilk ulaşan alır; başkası **daha fazla** şövalyeye ulaşınca hemen ona geçer |

## 3. Kurulum
1. İnşaat kartları karıştırılır, kapalı deste olarak ortaya konur.
2. Üstten 5 kart açılarak **building row** (inşa sırası) oluşturulur. (İlk oyunda 4 bina tipinin karışık olması önerilir.)
3. Büyükşehir kartları building row'un sonunda yığın olarak durur (varsayılan **A yüzü**; ❓ B yüzü seçeneği).
4. Kaynak kartları karıştırılıp kapalı deste yapılır.
5. Başlangıç Köyleri karıştırılır (3 oyuncuda 3 adet; "Oyuna sen başlarsın" kartı mutlaka dahil). Her oyuncuya 1 İlk Köy + 1 İlk Yol + 1 oyuncu yardım kartı verilir, açık olarak önüne konur.
6. Her oyuncuya başlangıç eli olarak 2 kaynak kartı dağıtılır.
7. Olay kartları karıştırılıp kapalı deste yapılır.
8. En Uzun Yol ve En Güçlü Ordu kartları ortaya konur.
9. "Oyuna sen başlarsın" kartını alan oyuncu başlar; sıra saat yönünde ilerler.

## 4. Tur Yapısı
### 4.1 Hasat Fazı
- Aktif oyuncudan başlayarak saat yönünde **her oyuncu** desteden 1 kaynak çeker.
- Aktif oyuncu ek olarak: her görünür Şehir için +1, her A-Büyükşehir için +2, her B-Büyükşehir için +1 kart çeker.
- Kaynak destesi biterse ıskartadaki tüm kaynaklar karıştırılıp yeni deste yapılır.

### 4.2 Aksiyon Fazı (sırası serbest, istenen sırada)
**Ticaret (turda 1 kez, tek bir oyuncuyla):**
- Aktif oyuncu istediği ve vermeye razı olduğu kaynakları ilan eder; diğerleri kabul / karşı teklif / kendi teklifini yapabilir.
- Kaç kart değişirse değişsin tek bir oyuncuyla yalnızca 1 takas yapılır.
- Takastan sonra **takas yapan diğer oyuncu** desteden 1 kaynak çeker.
- Kart hediye etmek yasaktır (karşılıksız verme yok; aynı türden kart takası da yasak).

**İnşaat (sınırsız):**
- Building row'daki herhangi bir kartı veya Büyükşehir yığınından birini maliyetini ödeyerek alır; harcanan kaynaklar ıskartaya.
- Alınan kartın yerine building row hemen desteden doldurulur (her zaman 5 kart).
- Building row'da 5 kartın 5'i de aynı tipteyse: hepsi desteye geri karıştırılır ve yeni 5 kart açılır.
- Köy inşa edilince: önce Olay çözülür, sonra building row doldurulur.
- Büyükşehir inşa ederken (B yüzünde) oyuncu kalan büyükşehirlerden hangisini istediğini seçer.

### 4.3 Yol Takası (Yol ikamesi)
- Turda 1 kez, inşa ederken: eksik 1 kaynak yerine aynı türden N kart ödenebilir.
- N = oyuncunun yol sayısına göre: 1 yol → 4, 2 yol → 3, 3 yol → 2, 4+ yol → 1 (İlk Yol dahil).
- Örnek: 3 yol, Köy için Buğday yok → 2 Yün öder; toplam 1 Tuğla + 1 Odun + 3 Yün.

## 5. Olay Kartları (Köy inşa edilince açılır, çözülür, ıskartaya gider)
| Olay | Etki |
| :--- | :--- |
| Hırsız (3×) | Elinde (7 + şövalye sayısı)'ndan **fazla** kart olan her oyuncu kartlarının yarısını (aşağı yuvarlanır) kendi seçerek atar |
| Yeni Yıl | Her oyuncu 1 kaynak çeker. Sonra tüm Olay kartları (deste + ıskarta) karıştırılıp yeni deste yapılır |
| Teşvik | En Uzun Yol ve En Güçlü Ordu sahipleri hariç her oyuncu 2 kaynak çeker |
| Hasat Kutlaması | Her oyuncu görünür (üstüne Şehir kurulmamış) her Köyü için 1 kaynak çeker |
| Sadaka | En çok ZP'li oyuncu, daha az ZP'li bir oyuncuya 1 kaynak verir. Birden fazla oyuncu en çoksa her biri 1 verir. Herkes eşitse hiçbir şey olmaz |

## 6. Büyükşehir B Yüzleri (tümü ortak: Hasatta +1 kaynak)
| Kart | Özel yetenek |
| :--- | :--- |
| Şövalyeler | İnşa edince, sahip olduğun her şövalye için 1 kaynak çek |
| Yollar | İnşa edince, sahip olduğun her yol için 1 kaynak çek |
| En Uzun Yol eşitliği | En Uzun Yol'da berabere kalırsan kart senin olur |
| En Güçlü Ordu eşitliği | En Güçlü Ordu'da berabere kalırsan kart senin olur |

## 7. Kazanma
- Kendi turunda herhangi bir anda **7 veya daha fazla görünür ZP**'ye ulaşan oyuncu anında kazanır.

## 8. Dijital Sürüm Kararları (kullanıcı onaylı)
- Büyükşehir yüzü lobide seçilir: "Oyuna yeni başladım" = A, "Daha önce oynadım" = B (§3.3'teki ❓ çözüldü).
- Hırsız atma ve Sadaka seçimleri: oyuncunun 15 sn süresi var; dolarsa sistem rastgele seçer. Bu sırada oyun bekler (`awaiting_decisions`).
- Sadaka birden fazla vericiyse kararlar sırayla değil eşzamanlı istenir; her verici yalnızca kendisinden az ZP'li oyunculardan birini seçebilir.
- Olay destesi biterse ıskartadaki olaylar karıştırılıp yeni deste yapılır.
- Tur süresi (süresiz/60/90/120 sn) dolarsa: açık takas teklifleri iptal, tur sıradakine geçer.
- Atılan (removed) oyuncu sıradan çıkar; eli ve önündeki kartlar oyundan kalkar (eli kaynak ıskartasına). Bonus kartı varsa yeniden hesaplanır.
- Kaynak destesi ve ıskarta ikisi de boşsa çekilemeyen kartlar atlanır.

## 9. Açık Sorular
Bkz. `progress.md` → "Darboğazlar / Açık Sorular".
