# CATAN – On the Road · Resmi Kural Spesifikasyonu (v1.0)

> **Kaynak:** Orijinal kural kitapçığı `CN3143 CATAN – On the Road Rulebook.pdf` tam metin analizi + `catan_on_the_road_cards - Türkçe/` kart materyalleri.  
> Bu spesifikasyon kural kitabındaki tüm orijinal kuralları ve dijital çok oyunculu platform için kesinleştirilen kararları içerir. Tüm alt ajanlar (Engine, Backend, Frontend) oyun kuralları için bu belgeyi nihai kaynak kabul eder.

---

## 1. Oyun Bileşenleri ve Kart Sayıları

Toplam 112 kart ve 4 oyuncu yardım kartı:

| Bileşen Grubu | Kart / Parça | Adet | Detay & Açıklama |
| :--- | :--- | :---: | :--- |
| **Kaynak Kartları** | Toplam | **61** | Tuğla (Brick): 11<br>Odun (Wood): 11<br>Yün (Wool): 14<br>Buğday (Wheat): 12<br>Demir / Cevher (Ore): 13 |
| **İnşaat Destesi** | Toplam | **34** | Yol (Road): 10<br>Köy (Settlement): 11<br>Şehir (City): 5<br>Şövalye (Knight): 8 |
| **Başlangıç Kartları** | Başlangıç Yolu | **4** | Her oyuncuya 1 adet açık verilir |
| | Başlangıç Köyü | **4** | 3 normal Köy + 1 "Oyuna sen başlarsın" (You are the starting player) yazılı Köy |
| **Büyükşehir Kartları** | Çift Yüzlü (A / B) | **4** | Ön yüz: **A Yüzü** (4 kartın hepsi aynı etkiye sahiptir: Kendi turunda +2 kaynak).<br>Arka yüz: **B Yüzü** (4 farklı özel yetenek + kendi turunda +1 kaynak). |
| **Bonus Kartları** | En Uzun Yol | **1** | 2 Zafer Puanı (İlk 3 yola ulaşan alır; daha fazlasına geçen kapar) |
| | En Güçlü Ordu | **1** | 2 Zafer Puanı (İlk 2 şövalyeye ulaşan alır; daha fazlasına geçen kapar) |
| **Olay Kartları** | Toplam | **7** | Hırsız (Robber): 3<br>Yeni Yıl / Gündönümü (Solstice): 1<br>Bolluk / Teşvik (Abundance): 1<br>Hasat Kutlaması / Sübvansiyon (Subsidy): 1<br>Sadaka (Charity): 1 |
| **Oyuncu Yardım Kartları** | Çift Yüzlü | **4** | Ön yüz: İnşa Maliyetleri & Yol Takas Oranları.<br>Arka yüz: Tur Fazları ve Özet. |

*Not:* Oyuncu yardım kartında belirtilen toplam sayılar (Yol: 14, Köy: 15), başlangıç kartlarını (4 yol, 4 köy) da içermektedir.

---

## 2. Maliyetler, Zafer Puanları ve Kart Özellikleri

| Kart | Maliyet | ZP | Özellik & Yerleşim Kuralı |
| :--- | :--- | :---: | :--- |
| **Yol (Road)** | 1 Tuğla + 1 Odun | **0** | Oyuncu alanına konur. Yol takas oranı sağlar (bkz. §4.3). En Uzun Yol bonusu için sayılır. Oyuncu 4'ten fazla yol yapabilir, ancak takas oranı 1:1'in ötesine geçmez. |
| **Şövalye (Knight)** | 1 Yün + 1 Buğday + 1 Demir | **0** | Oyuncu alanına konur. Hırsız el limitini şövalye başına +1 artırır (Limit = 7 + şövalye sayısı). En Güçlü Ordu bonusu için sayılır. |
| **Köy (Settlement)** | 1 Tuğla + 1 Odun + 1 Yün + 1 Buğday | **1** | Oyuncu alanına yan yana yerleştirilir. İnşa edildiğinde **anında 1 Olay kartı çekilir ve çözülür** (başlangıç köyü için olay çekilmez). Üzerine Şehir kurulabilir. |
| **Şehir (City)** | 3 Demir + 2 Buğday | **2** | Yalnızca oyuncunun önündeki **açık (üzeri kapatılmamış) bir Köyün üzerine** yerleştirilerek inşa edilir. Açık köy yoksa inşa edilemez. Alttaki köy artık puan vermez (net kazanç +1 ZP). Kendi turunda Hasat fazında açık her şehir için **+1 ek kaynak** kazandırır. |
| **Büyükşehir (Metropolis)** | 3 Yün + 1 Demir | **3** | Yalnızca oyuncunun önündeki **açık bir Şehrin üzerine** yerleştirilerek inşa edilir. Açık şehir yoksa inşa edilemez. Alttaki şehir artık puan vermez (net kazanç +1 ZP). Toplam 4 adet vardır; inşa eden oyuncu kalan boş büyükşehirlerden istediğini seçer. Biterse yenisi yapılamaz. |
| **En Uzun Yol (Longest Route)** | – | **2** | Önünde en az 3 yol olan ilk oyuncuya verilir. Başka bir oyuncu **daha fazla** yola ulaştığında anında o oyuncuya geçer. (Büyükşehir B yol eşitliği istisnası saklıdır). |
| **En Güçlü Ordu (Largest Army)** | – | **2** | Önünde en az 2 şövalye olan ilk oyuncuya verilir. Başka bir oyuncu **daha fazla** şövalye inşa ettiğinde anında o oyuncuya geçer. (Büyükşehir B ordu eşitliği istisnası saklıdır). |

---

## 3. Oyun Kurulumu (Setup)

1. **Oyuncu Sayısına Göre Başlangıç:**
   - **3 Oyuncu:** 3 Başlangıç Köyü (1 tanesi mutlaka "Oyuna sen başlarsın" kartı olmalıdır), 3 Başlangıç Yolu ve 3 Oyuncu Yardım kartı kullanılır. 4. set oyundan çıkarılır.
   - **4 Oyuncu:** 4 Başlangıç Köyü, 4 Başlangıç Yolu ve 4 Oyuncu Yardım kartının tümü kullanılır.
2. **Dağıtım:**
   - Başlangıç köyleri karıştırılıp her oyuncuya 1 adet kapalı dağıtılır; oyuncular kartı önlerine açık koyar.
   - Her oyuncuya 1 Başlangıç Yolu (açık olarak önüne) ve 1 Oyuncu Yardım kartı verilir.
   - Kaynak kartları karıştırılır. Her oyuncuya başlangıç eli olarak **2 kaynak kartı** dağıtılır.
3. **Masa Düzeni (Ortadaki Kartlar):**
   - **Kaynak Destesi:** Kalan kaynak kartları kapalı deste olarak ortaya konur.
   - **İnşaat Destesi & Sırası (Building Row):** 34 inşaat kartı karıştırılıp ortaya kapalı deste olarak konur. Desteden üstteki **5 kart** açık olarak sıraya dizilir (`Building Row`).
     - *Not:* İlk oyunda bu 5 kartın 4 farklı bina türünden (yol, köy, şehir, şövalye) birer karma içermesi tavsiye edilir.
     - *Kural:* Oyun sırasında building row'daki 5 kartın 5'i de aynı türe dönüşürse, hepsi desteye geri karıştırılır ve yeni 5 kart açılır.
   - **Büyükşehir Yığını (Metropolis Stack):** 4 Büyükşehir kartı, building row'un yanına yığın olarak konur. Lobi seçimine göre **A yüzü** veya **B yüzü** yukarı bakar.
   - **Olay Destesi:** 7 Olay kartı karıştırılıp kapalı deste olarak konur.
   - **Bonus Kartları:** En Uzun Yol ve En Güçlü Ordu kartları açık olarak ortaya konur.
4. **İlk Oyuncu:**
   - "Oyuna sen başlarsın" (You are the starting player) yazılı Başlangıç Köyü kartını alan oyuncu oyuna başlar.
   - Sıra saat yönünde ilerler.

---

## 4. Tur Yapısı ve Fazlar

Her oyuncunun turu sırasıyla 2 ana fazdan oluşur:
1. **Hasat Fazı (Harvest Phase)**
2. **Aksiyon Fazı (Action Phase)**

### 4.1 Hasat Fazı (Harvest Phase)
- Sırası gelen aktif oyuncudan başlayarak saat yönünde **her oyuncu** kaynak destesinden **1 kaynak kartı** çeker.
- Ardından aktif oyuncu kendi sahip olduğu binalara göre ek kaynak kartları çeker:
  - Önündeki açık her **Şehir** için: **+1 ek kaynak**
  - Önündeki her **A Yüzü Büyükşehir** için: **+2 ek kaynak**
  - Önündeki her **B Yüzü Büyükşehir** için: **+1 ek kaynak**
- *Örnek:* Aktif oyuncunun önünde 1 açık şehir ve 1 A-büyükşehir varsa: 1 (temel) + 1 (şehir) + 2 (büyükşehir) = 4 kaynak çeker. Diğer tüm oyuncular 1'er kaynak çeker.
- *Deste Biterse:* Kaynak destesi bittiğinde, kaynak ıskartasındaki tüm kartlar karıştırılarak yeni bir kapalı kaynak destesi oluşturulur.

### 4.2 Aksiyon Fazı (Action Phase)
Aktif oyuncu bu fazda dilediği sırada ve kombinasyonda aşağıdaki eylemleri gerçekleştirir:

#### A. Ticaret (Trade)
- **Turda sadece 1 kez** ve **yalnızca tek bir diğer oyuncuyla** yapılabilir.
- Aktif oyuncu almak istediği kaynakları ve vermeye razı olduğu kaynakları duyurur/teklif eder. Diğer oyuncular kabul edebilir, karşı teklif verebilir ya da yeni teklif sunabilir.
- Kaç kart değiş tokuş edilirse edilsin (ör. 1'e 1, 2'ye 1, 3'e 2), aktif oyuncu bir turda sadece tek bir oyuncuyla tek bir takas onaylayabilir.
- **Karşılıksız kart vermek (hediye / 0 karta karşı kart) yasaktır.**
- **Aynı tür kaynakların birbiriyle takası yasaktır** (örneğin tuğla verip tuğla almak kural dışıdır).
- **ÖNEMLİ KURAL:** Aktif oyuncu ile takas yapan **diğer oyuncu**, takas işlemi biter bitmez kaynak destesinin en üstünden **1 bonus kaynak kartı çeker**. (Aktif oyuncu bu bonus kartı çekmez).

#### B. İnşaat (Build)
- Aktif oyuncu maliyetini ödeyerek Building Row'daki herhangi bir kartı veya Büyükşehir yığınından bir kartı satın alıp (inşa edip) önüne yerleştirebilir.
- Bir turda kaynakları yettiği sürece birden fazla bina inşa edebilir.
- Harcanan kaynak kartları kaynak ıskartasına gider.
- Bir kart satın alındığında, Building Row inşaat destesinden çekilen yeni kartla **anında 5 karta tamamlanır**.
- **Köy İnşa Edilirse:** Köy satın alındığında building row hemen doldurulmadan önce **anında 1 Olay kartı çekilir ve derhal çözülür**. Olay çözüldükten sonra building row 5 karta tamamlanır.
- **5 Aynı Kart Kuralı:** Eğer Building Row'da herhangi bir anda 5 kartın tamamı aynı türe sahip olursa, bu 5 kart inşaat destesine geri karıştırılır ve yeni 5 kart açılır.
- **İnşa Önkoşulları:**
  - Şehir: Yalnızca açık bir Köyün üzerine inşa edilebilir.
  - Büyükşehir: Yalnızca açık bir Şehrin üzerine inşa edilebilir.

#### C. Yol Takası (Road Substitution Ratio)
- Aktif oyuncu turunda inşaat yaparken **yalnızca 1 kez**, eksik olan 1 kaynak kartı yerine sahip olduğu yol sayısına göre elindeki aynı türden N adet kaynağı ikame edebilir:
  - **1 Yol:** 4'e 1 (Aynı türden 4 kart = istenen 1 kaynak)
  - **2 Yol:** 3'e 1 (Aynı türden 3 kart = istenen 1 kaynak)
  - **3 Yol:** 2'ye 1 (Aynı türden 2 kart = istenen 1 kaynak)
  - **4 veya daha fazla Yol:** 1'e 1 (Herhangi 1 kart = istenen 1 kaynak)
- *Örnek:* Oyuncunun 3 yolu var. Köy yapmak istiyor ancak buğdayı yok. 2 adet yünü buğday yerine ikame ederek 1 tuğla, 1 odun ve 3 yün ödeyerek köyü inşa edebilir.
- 4'ten fazla yola sahip olmak 1:1 oranını daha avantajlı hale getirmez.

---

## 5. Olay Kartları (Event Cards - 7 Kart)

Bir oyuncu Köy inşa ettiğinde olay destesinin en üstündeki kart açılır, çözülür ve olay ıskartasına atılır.

| Olay Kartı | Adet | Etki ve Çözümleme Mantığı |
| :--- | :---: | :--- |
| **Hırsız (Robber)** | **3** | Elindeki kaynak kartı sayısı `(7 + şövalye sayısı)` değerinden **fazla** olan her oyuncu (aktif veya pasif), elindeki kartların yarısını (aşağı yuvarlanır: `Math.floor(n / 2)`) kendi seçerek ıskartaya atar.<br>*Örnek:* 2 şövalyesi olan oyuncunun limiti 9'dur. 9 kartı varsa ceza almaz; 10 kartı varsa 5 kart atar. |
| **Yeni Yıl / Gündönümü (Solstice)** | **1** | Aktif oyuncudan başlayarak saat yönünde her oyuncu kaynak destesinden 1 kaynak çeker. Ardından bu Solstice kartı ve ıskartadaki tüm olay kartları, varsa olay destesindeki kalan kartlarla birlikte karıştırılarak **tamamen yeni bir Olay Destesi** oluşturulur. |
| **Bolluk / Teşvik (Abundance)** | **1** | **En Uzun Yol veya En Güçlü Ordu kartlarından herhangi birine sahip olan oyuncular HARİÇ**, diğer her oyuncu kaynak destesinden **2 kaynak kartı** çeker. (İki bonustan birini veya ikisini tutan oyuncu hiçbir şey çekemez). |
| **Hasat Kutlaması / Sübvansiyon (Subsidy)** | **1** | Her oyuncu, önündeki açık (üzerine Şehir kurulmamış) her Köyü için kaynak destesinden **1 kaynak kartı** çeker. Şehre dönüştürülmüş köyler sayılmaz. |
| **Sadaka (Charity)** | **1** | O anda **en çok Zafer Puanına (ZP) sahip oyuncu**, kendisinden daha az ZP'si olan bir oyuncuya elinden 1 kaynak kartı verir.<br>- Eğer birden fazla oyuncu en yüksek ZP'de berabereyse, bu oyuncuların **her biri** kendisinden az ZP'si olan birer oyuncuya 1 kaynak verir.<br>- Eğer tüm oyuncuların ZP'si eşitse hiçbir şey gerçekleşmez.<br>- En çok ZP'li oyuncunun elinde hiç kaynak yoksa (0 kart), kaynak veremez. |

---

## 6. Büyükşehir Kartları (Metropolis Cards - 4 Kart)

Oda açılırken seçilen moda göre tüm büyükşehirler A yüzü veya B yüzü olarak oynanır.

### A Yüzü ("Oyuna yeni başladım" modu)
- 4 kartın 4'ü de aynıdır.
- **Etki:** Kendi turunun Hasat fazında fazladan **+2 kaynak kartı** çektirir.

### B Yüzü ("Daha önce oynadım" modu)
- 4 kartın hepsinin ortak özelliği: Kendi turunun Hasat fazında fazladan **+1 kaynak kartı** çektirir.
- Ayrıca her birinin kendine özgü bir yeteneği vardır:
  1. **Şövalyeler (Metropolis B - Knights):** İnşa edildiği anda (Upon building), o ana kadar inşa etmiş olduğun toplam her Şövalye kartı için desteden 1 kaynak kartı çek.
  2. **Yollar (Metropolis B - Roads):** İnşa edildiği anda (Upon building), o ana kadar inşa etmiş olduğun toplam her Yol kartı (başlangıç yolu dahil) için desteden 1 kaynak kartı çek.
  3. **En Uzun Yol Eşitliği (Metropolis B - Longest Route Tiebreaker):** En Uzun Yol bonus kartı için başka bir oyuncuyla eşit sayıda yola sahip olduğunda (beraberlik anında), kart sana geçer / sende kalır.
  4. **En Güçlü Ordu Eşitliği (Metropolis B - Largest Army Tiebreaker):** En Güçlü Ordu bonus kartı için başka bir oyuncuyla eşit sayıda şövalyeye sahip olduğunda (beraberlik anında), kart sana geçer / sende kalır.

---

## 7. Bonus Zafer Puanı Kartları

- **En Uzun Yol (2 ZP):**
  - 3 yola ilk ulaşan oyuncu alır.
  - Başka bir oyuncu mevcut sahibinden daha fazla yol inşa ederse kart el değiştirir.
  - Eşitlik durumunda normalde kart el değiştirmez; ancak eşitliği yakalayan oyuncuda "En Uzun Yol Eşitliği" Büyükşehri varsa kart eşitlikte el değiştirir.
- **En Güçlü Ordu (2 ZP):**
  - 2 şövalyeye ilk ulaşan oyuncu alır.
  - Başka bir oyuncu mevcut sahibinden daha fazla şövalye inşa ederse kart el değiştirir.
  - Eşitlik durumunda normalde kart el değiştirmez; ancak eşitliği yakalayan oyuncuda "En Güçlü Ordu Eşitliği" Büyükşehri varsa kart eşitlikte el değiştirir.

---

## 8. Oyunu Kazanma Koşulu (Winning the Game)

- Bir oyuncu **kendi turu sırasında** herhangi bir anda **7 veya daha fazla görünür Zafer Puanına (ZP)** ulaştığında oyun derhal sona erer ve o oyuncu kazanır.
- Başka bir oyuncunun turunda (örneğin rakip oyuncunun inşa ettiği köyden çıkan Olay kartı sonucu veya Sadaka ile) 7 ZP'ye ulaşılsa dahi oyun o anda bitmez; zafer kontrolü yalnızca aktif oyuncunun kendi turunda yapılır.

---

## 9. Dijital ve Çok Oyunculu Platform Kuralları (Kesinleşen Kararlar)

1. **Oyuncu Karar Süreleri (Timeout):**
   - Hırsız kart atma ve Sadaka verme seçimlerinde oyunculara 15 saniye süre tanınır (`DECISION_TIMEOUT_MS = 15000`).
   - Süre dolduğunda motor deterministik olarak rastgele seçim yapar ve oyunu ilerletir.
2. **Eşzamanlı Sadaka:**
   - En yüksek ZP'ye sahip birden fazla oyuncu varsa, kararlar sırayla değil eşzamanlı olarak toplanır; her verici yalnızca kendisinden az ZP'si olan oyunculardan birini seçebilir.
3. **Tur Süresi:**
   - Lobi kurucusu tarafından belirlenir (Süresiz / 60 sn / 90 sn / 120 sn).
   - Süre dolduğunda aktif takas teklifleri iptal edilir ve tur sıradaki oyuncuya geçer.
4. **Oyuncu Ayrılması / Atılması:**
   - Bir oyuncu bağlantısı kesilip atıldığında (`remove_player`):
     - Elindeki kaynaklar doğrudan kaynak ıskartasına gider.
     - Önündeki binalar oyundan kaldırılır.
     - En Uzun Yol ve En Güçlü Ordu bonusları kalan oyuncular arasında yeniden değerlendirilir.
5. **Deste Boşalması Uç Durumları:**
   - Kaynak destesi bittiğinde ıskarta karıştırılır. Hem deste hem ıskarta tamamen boşsa çekilemeyen kartlar atlanır.
   - Olay destesi Solstice haricinde tükenirse, olay ıskartası karıştırılarak yeni olay destesi yapılır.
