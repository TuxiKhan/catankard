# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 14 – GitHub Pages Otomatik Dağıtım (GitHub Actions Workflow & Asset Path Uyumluluğu)
- **Repo:** https://github.com/TuxiKhan/catankard (public)
- **Supabase:** `catan game` · ref `oykohkhaptgyeeeyauon` · eu-west-1 (Edge Functions v4 deployed)
- **Canlı Test:** `http://localhost:5173/` (Vite dev server aktif)
- **Son güncelleme:** 2026-10-24

## GitHub Pages Dağıtımı & Asset Yolu Uyumluluğu (STEP 14)
1. **GitHub Actions Workflow Eklendi (`.github/workflows/deploy.yml`):**
   - Repo `main` branch'ine push yapıldığında veya GitHub arayüzünden manuel tetiklendiğinde çalışan tam otomatik workflow oluşturuldu.
   - Bağımlılıkları kurar (`npm ci`), `VITE_BASE_PATH: /catankard/` ile web projesini derler (`apps/web/dist`) ve resmi `actions/deploy-pages@v4` ile GitHub Pages'e canlıya alır.
2. **Base Path & Asset Yolları Düzeltildi:**
   - [vite.config.ts](file:///C:/A/kode/catankard/apps/web/vite.config.ts) içine `base: process.env.VITE_BASE_PATH || './'` eklendi.
   - [assetUrl.ts](file:///C:/A/kode/catankard/apps/web/src/lib/assetUrl.ts) yardımcı fonksiyonu oluşturularak tüm kart, deste ve ikon görselleri subpath (`/catankard/assets/...`) uyumlu hale getirildi; 404 resim kırılmaları engellendi.

## Kırmızı Sınır Boyunca Serbest Sürükleme & Çizgilerin Gizlenmesi (STEP 13.1)
1. Kullanıcının işaretlediği kırmızı alan sınırları (`-140..100 X`, `-75..45 Y`) tam olarak uygulandı.
2. Kesikli çerçeve, gölge ve etiket tamamen kaldırıldı; masa pürüzsüz çuha haline getirildi.
3. Diğer oyuncuların bu alandaki hareketleri canlı izlemesi sağlandı.

## Yerdeki Kartların Sürükleme Ekranı İyileştirmesi (STEP 13)
1. **Sürükleme Ekranının Kaynak Kartlarının Soluna Alınması:**
   - Hem 4P (`GameDesk4P.tsx`) hem 3P (`GameDesk3P.tsx`) düzenlerinde, oyuncunun yerdeki tutulup sürüklenebilen kartları (`CardStack`, `TableCard`, yol, şövalye, yerleşim/şehir ve bonus kartlar) eldeki kaynak kartlarının (`FannedHand`) dikey üstünden alınarak yatayda tam soluna taşındı.
2. **Ekranın Tam Ortasından Biraz Sağa Konumlandırma:**
   - Sayfa ortasındaki aksiyon butonlarının sağından itibaren (`pl-6 sm:pl-10 lg:pl-14`) başlayacak şekilde yerleştirildi; butonlarla çakışmadan sayfanın orta-sağ bölgesine oturtuldu.
3. **Kartların Etrafında 50px Sürükleme Boşluğu (Sürükleme Alanı):**
   - Kartların etrafına tam 50px boşluk (`p-[50px]`) içeren, zarif altın kesikli çerçeveye sahip (`border-2 border-dashed border-amber-400/30 bg-black/30 backdrop-blur-xs`) bir sürükleme ekranı oluşturuldu.
   - `safePlacementBoundary.ts` içerisindeki koordinat sınırlaması tam bu 50px boşluğa eşitlendi (`minX: -50, maxX: 50, minY: -50, maxY: 50`). Kartlar bu 50px'lik sınır içinde serbestçe hareket edebilir ancak bu alanı aşamaz.

## 5 Paralel Subagent İyileştirmeleri (STEP 12)
1. **Marketten Kart Alındığında Tam Yerine Yenisinin Açılması (In-Place Replenish):**
   - `packages/engine/src/actions.ts`, `supabase/functions/_shared/engine/actions.ts` ve `game-action/bundled.ts` üzerinde inşaat hamlesi (`case 'build'`) refactor edildi:
   - Alınan kartın slot indeksi doğrudan desteden çekilen yeni kartla (`state.buildingRow[cardIndex] = state.buildingDeck.pop()!`) yerinde dolduruluyor. Diğer 4 kartın gereksiz yere sola kayması ve sırasının bozulması engellendi. Deste bittiğinde zarifçe `splice` uygulanıyor.
   - `apps/web/src/components/BuildingRowMat.tsx` içindeki yuva anahtarı `key={building-slot-${index}}` olarak sabitlendi; React bileşeni unmount olmadan `useReplenishDetector` ile pürüzsüz 3D kart flip/kayma animasyonu tetikleniyor.
2. **Kart Konulduğunda Diğer Oyuncularda Absürt Kaçmasının Düzeltilmesi:**
   - `TableCard.tsx` ve `CardStack.tsx` bileşenlerinde rakip masalar (`!isDraggable`) için gelen koordinatlar güvenli kadrana (`currentX: [-50, 50]`, `currentY: [-35, 35]`) sınırlandı.
   - `useRealtimeCardPositions.ts` içine `sanitizeCardPosition` eklendi; hem gelen broadcast verileri hem giden yayınlar `[-120, 120] X` ve `[-100, 50] Y` sınırlarında sanitize ediliyor.
3. **Süre Sonu Uyarısının Sakinleştirilmesi & Saniyede 1 Kere Nabız (1s Cadence):**
   - `@keyframes time-warning-badge-beat` içindeki çoklu sıçrama adımları kaldırıldı; saniyede 1 kez yumuşakça atan (`scale(1)` -> `scale(1.06)` -> `scale(1)`) tek nabza dönüştürüldü.
   - `animate-time-badge-beat` ve `animate-time-badge-critical` animasyon süreleri tam `1s ease-in-out infinite` yapılarak tur sayacının saniyesiyle birebir senkronize edildi.
   - Kırmızı rozet içindeki radar titremesine yol açan kontrolsüz `animate-ping` kaldırıldı.
4. **Kartların Tarayıcı Ekranından Dışarı Taşmasının Engellenmesi:**
   - `apps/web/src/lib/safePlacementBoundary.ts` içindeki `createSafeZoneClamper` daraltıldı: 4P için `[-140, 40] X`, 3P için `[-120, 120] X` ve `[-100, 30] Y` limitleri getirildi.
   - `clampPositionToViewport` fonksiyonu ve DOM bounding rect entegrasyonu ile sürüklenen kartların hiçbir koşulda tarayıcının sağ kenarından (`window.innerWidth - 12`), solundan (`12px`), altından (`window.innerHeight - 12`) veya üstünden (`50px`) dışarı taşamayacağı garanti altına alındı.
5. **El Kartları Arasında Gezinirken Akıcı & Homojen Hover Deneyimi:**
   - `FannedHand.tsx` içindeki komşu kartları itip imlecin boşluğa düşmesine ve titremeye neden olan `neighborShiftX` kaldırıldı.
   - Hover efekti pürüzsüz ve homojen bir kaldırmaya dönüştürüldü: `translateY: -26px`, nazik `scale(1.08)`, `zIndex: 50`.
   - `bottom-center` (3P) ve `bottom-right` (4P) el yerleşimleri eşitlendi; her kartın ~36px genişliğinde temiz üst şeridi korunarak fareyle sağa/sola akıcı şekilde taranabilir ve rahatça tıklanabilir hale getirildi.

## Kullanıcı Geri Bildirimi İyileştirmeleri (STEP 11)
1. **Kart Sürükleme Sapıtmasının Giderilmesi:** `dx/dy` hesaplamasında `initialPosRef` dondurularak canlı re-render'larda koordinatların katlanarak uçması ve `safePlacementBoundary` içindeki ani zıplamalar tamamen düzeltildi; kartlar fare imlecini 1:1 akıcı ve takılmasız takip ediyor.
2. **Masadaki Çizgilerin Yok Edilmesi:** Çuha üzerindeki dikey/yatay eksen kesikli beyaz çizgileri ve dış dikiş sınır şeritleri (`GameMat.tsx`) tamamen kaldırıldı; zemin kusursuz, temiz kadife çuhaya dönüştürüldü.
3. **Market ve Yerdeki Kartların Birebir Aynı Boyutta Olması (125x194 px):** Kullanıcı talebi doğrultusunda market kartları (açık kartlar ve kapalı desteler) ile yerdeki tüm oyuncuların kartları (senin ve tüm rakiplerin köyleri, yolları, şövalyeleri) birebir aynı boyuta (125x194 px) ve orijinal 840:1302 en-boy oranına kilitlendi. Bonus kartlar 186x120 px yatay formatında eşitlendi.
4. **Marketin Masanın Tam Merkezine Yerleştirilmesi:** `BuildingRowMat`'ın asimetrik kadran yüksekliklerinden dolayı yukarı kayması sorunu giderildi; `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` ile masanın tam fiziksel ve görsel merkezine kilitlendi.
5. **Takas ve Tur Butonlarının Tam Sayfa Ortasına Hizalanması:** İki butonun tam ortası (simetri ekseni) sayfanın yatay merkez çizgisine (%50) oturtuldu (`fixed bottom-3.5 left-1/2 -translate-x-1/2`). Sıra başkasındayken çıkan bilgi rozeti butonların üstünde yüzdürüldü, böylece butonların tam merkez konumu hiçbir zaman kaymıyor.

## 7 Paralel Subagent ile Tamamlanan Yeni Görevler (STEP 10)
1. **Son 10 Saniye Kırmızı Uyarı Genişletmesi (`TimeWarningOverlay.tsx`):**
   - Sönük kalan uyarı büyütüldü; 12-16px kalınlığında kırmızı neon çerçeve, 150px'e varan çok katmanlı inset radial gölge ve 4 köşe radial ışık patlaması eklendi.
   - Son 5 saniyede kritik mod (0.6s hızlı nabız, 200px beyaz-kırmızı parlama, hafif kırmızı flaş katmanı ve kalp atışı "SON {x} SANİYE" rozeti) devreye alındı.
2. **Masada Kart Sürükleme Canlı Senkronizasyonu (`useRealtimeCardPositions.ts`):**
   - Supabase Realtime broadcast kanalı (`room:${roomId}`) üzerinden `card_move` olayları yayınlanıyor; aktif oyuncu kartı sürüklediğinde (~60ms throttle ve bırakma anında) tüm oyuncuların ekranlarında kartlar canlı olarak hareket ediyor (`positionsByPlayer`).
   - Rakiplerin kadranlarındaki kartlar artık sabit değil; yumuşak CSS geçişiyle (`transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1)`) hedefe süzülüyor.
3. **Sıra Göstergesi & Mavi Yanıp Sönen İsimler (`PlayerNameplate.tsx`):**
   - Kadranlar etrafındaki kaba, yapay kutu/çerçeve çizgileri (`ring-2 ring-sky-400/80...`) tamamen kaldırıldı.
   - İsimler büyütüldü (`text-base sm:text-lg font-black`); sırası gelen oyuncunun ismi elektrikli mavi neonla yanıp sönüyor (`animate-blue-pulse-glow text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.95)]`), isim plakasının altında mavi akıcı aura ve yanıp sönen radar sinyal rozeti yer alıyor.
4. **Alt Barın Kaldırılması & Sağ Alt Yuvarlak Butonlar (`TableActionButtons.tsx`):**
   - Ekranın altını boydan boya kaplayan hantal footer çubuğu tamamen kaldırıldı.
   - Sağ alt köşeye (`fixed bottom-4 right-4 z-40`) Catan temasına uygun 2 adet yuvarlak orta boy (56-64px) buton yerleştirildi:
     - **Ticaret / Takas**: Kehribar/ahşap gradyanlı, altın çerçeveli, açık teklif varsa mini kırmızı bildirim rozetli dairesel buton.
     - **Turu Bitir**: Zümrüt yeşili mühür temalı, sıra oyuncudayken parıldayan/nabız atan, sıra başkasındayken zarif koyu madalyon buton.
5. **Oyun Masasının Tam Ekran Olması & Siyahlıkların Yok Edilmesi (`GameMat.tsx`):**
   - `max-w-[1600px]`, `h-[96vh]`, `rounded-3xl border-4` sınırlamaları kaldırıldı.
   - Masa çuhası ve radyal dokusu tarayıcı ekranının tamamını (%100 genişlik ve %100 yükseklik) kenardan kenara (edge-to-edge) kaplayarak bilgisayardaki tüm siyah yan boşlukları yok etti.
6. **Gerçek Zamanlı Kart & Oyun Açılış Animasyonları (`CardAnimations.tsx`, `animationHooks.ts`):**
   - **Kart Karılma**: Masanın ortasındaki kapalı destenin 3D uzayda ikiye ayrılıp riffle cascade ile birbirinin içine girmesi.
   - **Dağıtılma**: Oyun başında merkezden her oyuncunun eline 140ms aralıkla süzülen 3D yay kavisli (`flyToHand`) kartlar.
   - **Kart Çekme**: Desteden oyuncunun eline akıcı süzülme (`DrawCardFlight`).
   - **Yere Kart Koyma**: Satın alınan/yükseltilen kartın masaya tok darbe ve şok dalgasıyla oturması (`snapToTable`).
   - **Mağazanın Yenilenmesi**: Boşalan yuvalara desteden yeni kartın gelip 180° 3D flip ile ön yüzünü açması (`ReplenishCardSlot`).
   - Sıfır dış dosya yüküyle çalışan Web Audio API gerçek zamanlı sentetik kart sesleri (hışırtı, whoosh, masa darbesi).
7. **Rakiplerin El Kartlarının Yay/Kavis (Arc Fan) Şeklinde Dizilmesi (`FannedHand.tsx`):**
   - Referans görseldeki (Legends of Runeterra el dizilimi) kavis geometrisi modellendi.
   - `top-left`, `top-right` ve `bottom-left` köşelerindeki rakip kartları köşeden başlayarak masaya doğru üstel yay açısıyla (0°, 6°, 13°, 21°, 30°, 39°, 48°) katmanlı olarak fannedildi; fiziksel gölge ve altın/derinlik kenarlıkları eklendi.

## 7 Paralel Ajan ile Tamamlanan İyileştirmeler
1. **Tüm Kartların Orijinal Kart Görseline Dönüştürülmesi:** Masada duran tüm yol kartları (başlangıç yolu dahil) ve köy kartları üzerindeki yapay metinler temizlendi; doğrudan tam maliyet bantlı ve takas oranlı orijinal kart görselleri (`building_road.png`, `building_settlement.png`) kullanıldı.
2. **Ponytail Kod Temizliği & Fazlalıkların Ayıklanması:** Kullanılmayan ölü bileşenler (`PlayerDesk.tsx`, `BuildingRow.tsx`, `BuildModal.tsx`, `DraggableStack.tsx`, `SafePlacementZone.tsx`) ve gereksiz wrapper'lar silindi; kod tabanı minimal ve yalın hale getirildi.
3. **Yatay Bonus Kartları & Masada Üst Üste İstif:** En Uzun Yol ve En Güçlü Ordu kartları orijinal landscape formatına (160x108 px) uyarlandı; masada kazanılmayı beklerken sağ tarafta derli toplu katmanlı (stacked) durması ve hover ile incelenebilmesi sağlandı.
4. **Metropolis A/B Deste Detayı & Lobi Açıklamaları:** Kapalı büyükşehir destesi modalında (`DeckBrowserModal`) A modunda sadece A kartı, B modunda sadece 4 B kartı filtrelendi; Lobi oda kurma ekranında "Oyuna yeni başladım (A Yüzü - Basit Mod)" ve "Deneyimliyim (B Yüzü - Özel Yetenekli Mod)" dostane etiketleri eklendi.
5. **Masa Renk Temaları & Fotoğraf Butonunun Kaldırılması:** Sağ üstteki "Masa Fotoğrafı" butonu kaldırıldı; yerine 4 farklı çuha teması (Bordo Klasik, Zümrüt Yeşili, Gece Mavisi, Kömür Antrasit) eklenip `localStorage` ile kalıcı hale getirildi.
6. **Canlı Süre Sayacı & Son 10 Sn Kırmızı Uyarı:** `turnDeadline` bazlı saniyelik çalışan canlı sayaç state'i kuruldu; aktif oyuncunun süresi <= 10 saniye kaldığında ekranın etrafında dikkat çekici kırmızı nabız atan vinyet uyarı çerçevesi gösterildi.
7. **Kurucu Düşünce Odanın Kapanmaması & Kuruculuğun Devri:** Kurucu ayrıldığında veya 60 sn offline kaldığında odanın kapanmaması, kuruculuğun sıradaki aktif oyuncuya devredilmesi ve düşen oyuncunun/kurucunun koltuğunu koruyarak geri dönebilmesi (`join_room` reconnect) backend Edge Function'larında uygulandı ve Supabase'e deploy edildi.

## Tamamlanan 12 Maddelik UI/UX & Motor İyileştirmeleri
1. **Büyük & Serbest Sürüklenebilir Masa Kartları:** Masadaki kartlar büyütüldü (~125x186px), her oyuncu kendi alanında kartları serbestçe sürükleyip bırakabilir (`kart yerde kalcak`).
2. **Sıfır Yapay Metin & Saf Kart Görseli:** Kartların üstündeki, altındaki ve masadaki tüm açıklamalar, rozetler, yapay çerçeveler ve tarayıcı `title` tooltip balonları tamamen kaldırıldı; yapay "İlk Köy" metin katmanı silinerek masadaki köylerde doğrudan detay modalındaki orijinal tam kart görseli (`building_settlement.png`) kullanıldı.
3. **Doğal Oyuncu Kart Yelpazeleri:** Oyuncu kart yelpazeleri masaya ve oyuncuya bakacak şekilde (`bottom center` ekseni, hafif doğal kavis) dik ve doğal konumlandırıldı.
4. **El Kartı Yasak Bölgesi (Görünmez Sınır):** Eldeki kartların masadaki kartları örtmemesi için görünmez akıllı sınırlandırma (`createSafeZoneClamper`) uygulandı; çirkin yapay kutular kaldırıldı.
5. **Mavi Parlama & Doğrudan Satın Alma:** Oynanabilir / satın alınabilir kartların etrafına ince mavi parlama uygulandı; önkoşulsuz mavi yanma (açık köy yokken şehir, açık şehir yokken büyükşehir) düzeltildi; mavi parlayan karta tıklandığında popup/buton olmadan doğrudan inşa edilir.
6. **Fiziksel Yol & Şövalye Masa Kartları:** Yol ve Şövalye sayaç panelleri kaldırıldı; masada 1 Başlangıç Yolu + 1 Başlangıç Köyü ile başlanıp inşa edilen her yol, şövalye ve kupa masada fiziksel kart olarak yer alıyor.
7. **Kapalı Desteler Yatay Karusel Modalı:** Kapalı kaynak, olay, inşaat ve büyükşehir destelerine tıklandığında yatay kaydırmalı karusel modalı (`DeckBrowserModal.tsx`) açılıyor; tüm kart varyasyonları fareyle kaydırılarak incelenebiliyor.
8. **Sakin Tıklama (İnceleme Modalı Fırlamaması):** Kartlara sol tıklandığında inceleme modalı fırlamıyor; inceleme sadece sağ tık (context menu) ve çift tıkla açılıyor.
9. **Kural & Motor Denetimi (Başlangıç Eli Düzeltildi):** `createGame` içindeki hatalı erken hasat fazı çağrısı kaldırıldı; oyuncular kural kitapçığına uygun olarak tam 2 kaynak kartı, 1 başlangıç köyü ve 1 başlangıç yoluyla oyuna başlıyor.
10. **Masada Sıfır Yazı & Köşe İsim/ZP:** Masadaki tüm butonlar ve yazılar ("Düzeni Sıfırla", "building row" vb.) kaldırıldı; sırası gelen oyuncunun alanı hafif mavi efektle parlıyor; ellerin altında sadece `[İsim] [ZP]` yer alıyor.
11. **Saf Kart İnceleme Modalı:** `CardModal.tsx` içindeki tüm altın çerçeveler, metin kutuları ve açıklamalar yok edildi; yalnızca saf büyük kart ve hafif arka plan blur'u (`backdrop-blur-sm bg-black/50`) bırakıldı.
12. **Hata & İstisna Düzeltmeleri:** Supabase Edge Function 400/401 kimlik hataları, concurrency uyuşmazlıkları ve frontend kilitlenmeleri çözüldü, testler 15/15 yeşil.

## Kaynak Materyal
| Kaynak | Konum | Not |
| :--- | :--- | :--- |
| Master prompt | `catan_ai_orchestrator_master_prompt.md` | Orkestrasyon kuralları |
| Kural kitabı (PDF) | `CN3143 CATAN – On the Road Rulebook.pdf` | Orijinal resmi kural kitapçığı |
| **Kural spesifikasyonu** | `docs/RULES_SPEC.md` | v1.0 Orijinal PDF ile %100 doğrulanmış nihai kural belgesi |
| **Mimari & API sözleşmesi** | `docs/ARCHITECTURE.md` + `packages/engine/src/types.ts` | Ajanlar arası ortak arayüz |
| Masa düzenleri & Hedef Renderlar | `masa/` + `catan 4 player game main desk.png` vb. | Bordo çuha masa, yelpaze el, bina tepsisi referansları |
| Kart tanımları (TR) | `catan_on_the_road_cards - Türkçe md/` (+ PNG) | UI'da kullanılan kart yüzü görselleri |

## Yol Haritası
- [x] Klasör incelemesi, `progress.md`, yerel Git
- [x] GitHub public repo oluşturuldu ve push edildi
- [x] Orijinal `CN3143 CATAN – On the Road Rulebook.pdf` incelendi ve `docs/RULES_SPEC.md` eksiksiz güncellendi (v1.0)
- [x] Sub-Agent 2: Oyun Motoru (`packages/engine`) — deterministik PRNG, tam kural seti, 15 vitest testi (%100 başarı)
- [x] Sub-Agent 1: Backend & DB (`supabase/`) — PostgreSQL şeması, RLS & anon izinleri, `lobby`, `game-action`, `heartbeat` Edge Function'ları deploy edildi (ACTIVE)
- [x] Sub-Agent 3: Frontend UI (`apps/web`) — Sade, modern Catan lobisi, modern PIN oda kodu girişi, parti modu misafir UUID kimlik doğrulaması
- [x] Fiziksel Oyun Masası & Çuha Mat Redesign (`apps/web`):
  - Bordo radial çuha dokusu (`#700913`), beyaz kesik çizgili kadranlar ve retro "masa" orta damgası (`GameMat.tsx`)
  - Beyaz çerçeveli orta bina dizisi tepsisi (`BuildingRowMat.tsx`), 5 açık bina yuvası, kapalı bina, kaynak ve olay desteleri, metropol ve kupa kartları
  - Gerçekçi açılı yelpaze el dizilimi (`FannedHand.tsx`), hover yükselmesi, rakiplerin kapalı arkalık yelpazeleri
  - Dikey ofsetli kart istifleme: Köy -> Şehir -> Büyükşehir dikey 28px kaydırma (`CardStack.tsx`)
  - Çift altın çerçeveli parşömen kart inceleme modalı (`CardModal.tsx`)
- [x] 3 ve 4 oyunculu masa düzenleri (`GameDesk3P.tsx`, `GameDesk4P.tsx`)
- [x] Masaüstü & Kart İyileştirmeleri (4 Paralel Sub-Agent):
  - [x] Masadaki kartların büyütülmesi (BuildingRowMat taban ~96x140 px, CardStack taban ~110x160 px, katman kayması 34 px).
  - [x] Masaya konan kartların kullanıcının kendi alanında serbestçe sürüklenip bırakılabilmesi (`useDraggablePlacement`, `CardStack.tsx` pointer events, koordinat kalıcılığı).
  - [x] Mağaza kartlarında hover parlaması (`canAfford.ts`, kaynaklar veya yol ikamesi yetiyorsa altın sarısı ışıltı).
  - [x] Kartların üzerindeki tüm butonların ("İnşa Et", "İncele", "Yükselt", "Göz" ikonları) tamamen kaldırılması; doğrudan kart tıklaması ve sağ/çift tık inceleme.
  - [x] Oyuncu kart destelerinin/yelpazelerinin (FannedHand) yuvarlanma merkezlerinin ilgili köşelere (`top-left`, `top-right`, `bottom-left`, `bottom-right`) bağlanması ve masanın içine doğal açılı yayılımı.
  - [x] Eldeki kartların masa kartlarını örtmesini engellemek için alt boşluğun `pb-[230px]` / `pb-[224px]` düzenlenmesi, el kartları bölgesinin yasak bölge olarak sınırlandırılması (`safePlacementBoundary.ts`) ve otomatik sınır yaslama.
- [x] Vite prodüksiyon derlemesi (0 hata) ve 15 vitest motor testi (%100 başarı)
- [ ] 3 ve 4 oyunculu çoklu sekme canlı maç testi ve kullanıcı kabulü

## Tamamlanan Detaylar (PDF Doğrulaması)
1. **Oyuncu Yardım Kartları**: 4 adet çift yüzlü yardım kartı bileşenlere eklendi.
2. **Ticaret Bonusu**: Aktif oyuncuyla takas yapan diğer oyuncunun desteden 1 bonus kaynak kartı çekmesi kuralı motora ve UI'ya tam uygulandı.
3. **Hasat Fazı**: Aktif oyuncunun açık Şehir (+1) ve Büyükşehir (+2 A yüzü / +1 B yüzü) ek kaynak çekimleri eksiksiz uygulandı.
4. **Metropolis B Yetenekleri**: Şövalye/Yol başı kaynak çekme ve En Uzun Yol / En Güçlü Ordu beraberlik eşitlik kuralı (`tiebreaker`) eksiksiz uygulandı.
5. **Olay Kartları**: Hırsız (`7 + şövalye`), Solstice (tüm olayların deste+ıskarta yeniden karıştırılması), Abundance (bonussuzlara 2 kaynak), Subsidy (açık köy başına 1 kaynak) ve Charity (en çok ZP'linin az ZP'liye kart vermesi) başarıyla modellendi.
6. **Yol Takası**: 1 yol=4:1, 2 yol=3:1, 3 yol=2:1, 4+ yol=1:1 oranları uygulandı.

## Sonraki Adım
Uzak Supabase projesine migration uygulama ve Edge Function deploy'u.
