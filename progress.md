# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 8 – Kullanıcı Geri Bildirimiyle 12 Maddelik UI/UX & Kural İyileştirmeleri Eksiksiz Tamamlandı
- **Repo:** https://github.com/TuxiKhan/catankard (public)
- **Supabase:** `catan game` · ref `oykohkhaptgyeeeyauon` · eu-west-1 (Edge Functions v3 deployed)
- **Canlı Test:** `http://localhost:5173/` (Vite dev server aktif)
- **Son güncelleme:** 2026-10-24

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
