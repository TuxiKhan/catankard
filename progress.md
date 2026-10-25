# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 20 – Mobil Dikey İsimliklerin Küçültülmesi & Kart Boyutlarının Dikeyde Büyütülmesi
- **Repo:** https://github.com/TuxiKhan/catankard (public)
- **Supabase:** `catan game` · ref `oykohkhaptgyeeeyauon` · eu-west-1 (Edge Functions v4 deployed)
- **Canlı Test:** `http://localhost:5173/` (Vite dev server aktif)
- **Son güncelleme:** 2026-10-25

## Mobil Dikey İsimliklerin Küçültülmesi & Kart Boyutlarının Dikeyde Büyütülmesi (STEP 20)
1. **Dikey Modda İsimliklerin Küçültülmesi ([PlayerNameplate.tsx](file:///C:/A/kode/catankard/apps/web/src/components/PlayerNameplate.tsx)):**
   - `compact?: boolean` prop'u eklendi; dikey modda (`isMobilePortrait`) isim plakaları kompakt mikro boyuta çekildi (`compact={isMobilePortrait}`).
   - İsim fontu `text-[10px]`, ZP rozeti `text-[9px]`, kart sayısı `🎴 text-[9px]` ve plaka padding'i `px-1.5 py-0.5` olarak dengelendi.
   - İsimlikler dikey ekranda devasa yer kaplamaktan kurtarılarak incecik, zarif ve okunaklı hale getirildi.
2. **Dikey Modda Kart Boyutlarının Büyütülmesi ([useResponsiveLayout.ts](file:///C:/A/kode/catankard/apps/web/src/lib/useResponsiveLayout.ts)):**
   - Dikey modda kartlar daha belirgin ve okunaklı olacak şekilde dengeli bir oranda büyütüldü:
     - Oyuncunun masa kartları: `0.38` -> `0.43`
     - Eldeki kaynak kartları: `0.38` -> `0.42`
     - Pazar/Market kartları: `0.35` -> `0.38`
     - Rakiplerin kartları & elleri: `0.35/0.34` -> `0.38/0.37`
   - Yatay mod ve PC moduna kesinlikle dokunulmadı; daha önce beğenilen yatay mod düzeni ve PC ekranı aynen korundu.
3. **Kapsamlı Test & Ekran Görüntüsü Doğrulaması:**
   - **Playwright Doğrulaması:**
     - Mobil Dikey: [scratch/mobile_portrait.png](file:///C:/A/kode/catankard/scratch/mobile_portrait.png) (İsimler kompakt, kartlar belirgin ve ferah).
     - Mobil Yatay: [scratch/mobile_landscape.png](file:///C:/A/kode/catankard/scratch/mobile_landscape.png) (Yatay mod korundu).
     - PC Masaüstü: [scratch/desktop_pc_verified.png](file:///C:/A/kode/catankard/scratch/desktop_pc_verified.png) (PC modundan hiçbir şey eksilmedi).
   - **Birim Testleri (`npm test`):** 33/33 test başarılı.
   - **Proje Derlemesi (`npm run build`):** TypeScript ve Vite sıfır hata ile tamamlandı.

## Mobilde Üst Tablo Barının Kaldırılması & İsimliklerin Zafer Puanıyla Masaya Yerleşimi (STEP 19)
1. **Mobilde Üst Tablo Barının Kaldırılması:**
   - [GameDesk4P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk4P.tsx) ve [GameDesk3P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk3P.tsx) içerisindeki büyük `<header>` tablo barı mobilde (`${isMobile ? 'hidden' : 'flex'}`) tamamen kaldırıldı.
   - **PC modunda kesinlikle hiçbir şey eksiltilmedi:** PC (masaüstü) modunda orijinal Catan 4P üst tablo barı, 4 oyuncunun skorları, sayaç ve butonlar birebir yerinde duruyor ([desktop_pc_verified.png](file:///C:/A/kode/catankard/scratch/desktop_pc_verified.png)).
   - Mobilde ekranı ve kartları kapatmayan minimalist mikro rozet (`Tur #1 • Sende • ⏱ 56s • ⛶ • 🚪`) eklendi; böylece oyun akışı, süre ve butonlar mobilde de eksiksiz erişilebilir kaldı.
2. **Mobilde (Öncelikli Yatay Modda) İsimlerin Yanına Zafer Puanı Eklenmesi:**
   - [PlayerNameplate.tsx](file:///C:/A/kode/catankard/apps/web/src/components/PlayerNameplate.tsx) bileşenlerini yatay modda gizleyen `{!isMobileLandscape && (` kısıtlamaları 4P ve 3P masalarında tüm oyuncular için kaldırıldı.
   - Mobilde (hem yatay hem dikey modda) masanın 4 köşesindeki tüm oyuncu isimlikleri PC'deki gibi estetik, mavi neon ışıklı, kart sayılı ve altın madalyonlu Zafer Puanı (`ZP`) rozetiyle birlikte görünür hale getirildi.
   - Üst barın kalkmasıyla `pt-1 sm:pt-10` düzenine geçilerek üstteki oyuncu isimlikleri ve kartları masanın en tepesine pürüzsüzce yerleşti, dikeyde masanın ortasındaki pazar alanına ferah alan açıldı ([mobile_landscape.png](file:///C:/A/kode/catankard/scratch/mobile_landscape.png)).
3. **Kapsamlı Test & Ekran Görüntüsü Doğrulaması:**
   - **Playwright Doğrulaması:**
     - Mobil Yatay: [scratch/mobile_landscape.png](file:///C:/A/kode/catankard/scratch/mobile_landscape.png) (Üst bar kalktı, isimler ve ZP rozetleri PC kalitesinde yerleşti).
     - Mobil Dikey: [scratch/mobile_portrait.png](file:///C:/A/kode/catankard/scratch/mobile_portrait.png)
     - PC Masaüstü: [scratch/desktop_pc_verified.png](file:///C:/A/kode/catankard/scratch/desktop_pc_verified.png) (PC modundan hiçbir şey eksilmediği doğrulandı).
   - **Birim Testleri (`npm test`):** 33/33 test başarılı.
   - **Proje Derlemesi (`npm run build`):** TypeScript ve Vite sıfır hata ile derlendi.

## Mobil UI Balans Ayarı, Kart Boyut Optimizasyonu & Chrome Tam Ekran Çözümü (STEP 18)
1. **Chrome Mobilde Üst URL Çubuğunu Kapatma & Gerçek Tam Ekran (Fullscreen):**
   - **PWA Desteği ([manifest.json](file:///C:/A/kode/catankard/apps/web/public/manifest.json)):** `display: "standalone"`, `#150103` tema rengi ve Catan ikonları tanımlandı. Ana ekrana eklendiğinde veya PWA olarak açıldığında tarayıcı URL barı tamamen ortadan kalkar.
   - **Meta & Viewport Yapılandırması ([index.html](file:///C:/A/kode/catankard/apps/web/index.html)):** `viewport-fit=cover`, `mobile-web-app-capable: yes`, `apple-mobile-web-app-status-bar-style: black-translucent` ve `theme-color: #150103` tanımlandı.
   - **Dinamik Viewport & Overscroll Engellemesi ([index.css](file:///C:/A/kode/catankard/apps/web/src/index.css)):** `height: 100dvh`, `min-height: 100dvh`, `overscroll-behavior: none` ve `touch-action: manipulation` kuralları eklenerek parmakla kaydırmada adres çubuğunun yeniden aşağı inmesi önlendi.
   - **Tam Ekran Hook'u ([useFullscreen.ts](file:///C:/A/kode/catankard/apps/web/src/lib/useFullscreen.ts)):** HTML5 Fullscreen API ile cross-browser (WebKit / iOS / Android) tam ekran kontrolü sağlandı.
   - **Tek Dokunuşla Tam Ekran Butonları ([GameDesk4P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk4P.tsx), [GameDesk3P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk3P.tsx), [App.tsx](file:///C:/A/kode/catankard/apps/web/src/App.tsx)):** Üst oyun header'ına `Maximize`/`Minimize` toggle butonu ve mobil oryantasyon ipucu bandına tek tıkla "⛶ Tam Ekran" yapma butonu eklendi. Dokunulduğu anda Chrome URL barı yukarı kayarak kaybolur.
2. **Mobilde Kart Boyutlarının Küçültülmesi & Balans Ayarı ([useResponsiveLayout.ts](file:///C:/A/kode/catankard/apps/web/src/lib/useResponsiveLayout.ts)):**
   - **Masaüstü (PC) Boyutlarına Kesinlikle Dokunulmadı:** Masaüstünde ve büyük ekranlarda kartların ölçekleri (%100 ve %78/0.95) aynen korundu.
   - **Mobil Dikey (Portrait):**
     - Oyuncunun masa kartları: `0.48 -> 0.38` (ferahlık sağlandı)
     - Eldeki kaynak kartları: `0.52 -> 0.38` (yükseklik ~110px'ten ~60px'e indi, butonların üstünü kapatması önlendi)
     - Pazar/Market kartları: `0.40 -> 0.35`
     - Rakip kartları & elleri: `0.44 -> 0.35 / 0.34`
   - **Mobil Yatay (Landscape):**
     - Masa ve el kartları: `0.46/0.48 -> 0.38`
     - Pazar ve rakip kartları: `0.44/0.40 -> 0.38 / 0.34`
3. **Mobilde Yere Kart Koymada Hareketlerin İptal Edilmesi ([TableCard.tsx](file:///C:/A/kode/catankard/apps/web/src/components/TableCard.tsx), [CardStack.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardStack.tsx)):**
   - Kendi masa kartlarına `isDraggable={!isMobile}` kuralı uygulandı.
   - Mobilde serbest sürükleme kapatılarak kartların parmak dokunuşunda kayması, ekran dışına kaçması ve karmaşa yaratması tamamen engellendi.
   - Mobilde kartlar kendi flex yuvalarında nizamî ve sabit kalır (`currentX = 0, currentY = 0`). Masaüstünde ise serbest sürükleme (`isDraggable: true`) aynen çalışmaya devam eder.
   - Mobilde kart detayını inceleme (tek dokunuş veya uzun basma) fonksiyonu pürüzsüzce çalışır.
4. **Mobil Yerleşim & Çakışma Düzeltmeleri:**
   - Yerdeki kart konteyneri mobilde `max-w-[190px]` yapılarak Köy ve Yol kartlarının alt alta değil, yan yana derli toplu durması sağlandı.
   - Aksiyon butonları `isMobilePortrait` modunda `left-[38%]` konumuna dengelenerek sağdaki `Sen (Sina)` isimliği ile aralarında ~30px temiz boşluk oluşturuldu.
5. **Kapsamlı Test & Ekran Görüntüsü Doğrulaması:**
   - **Playwright Mobil Emülasyonu ([scratch/test_browser_mobile.ts](file:///C:/A/kode/catankard/scratch/test_browser_mobile.ts)):** Hem Mobil Portre ([scratch/mobile_portrait.png](file:///C:/A/kode/catankard/scratch/mobile_portrait.png)) hem Mobil Yatay ([scratch/mobile_landscape.png](file:///C:/A/kode/catankard/scratch/mobile_landscape.png)) ekran görüntüleri çekildi ve görsel olarak doğrulandı.
   - **Birim Testleri (`npm test`):** 33/33 test başarıyla geçti.
   - **Proje Derlemesi (`npm run build`):** TypeScript ve Vite derlemesi sıfır hata ile tamamlandı.
1. **Mobilde Sağ Tık Olmaması Sorununun Çözülmesi & Çok Kanallı İnceleme:**
   - **Eldeki Kaynak Kartları ([FannedHand.tsx](file:///C:/A/kode/catankard/apps/web/src/components/FannedHand.tsx)):** Normal oyunda eldeki herhangi bir kaynak kartına dokunulduğunda doğrudan kart inceleme modalı ([CardModal.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardModal.tsx)) açılır. Ayrıca 450ms uzun basma haptik titreşim (`navigator.vibrate`) desteği ve dokunmatik `(i)` butonu eklendi.
   - **Masadaki Kartlar ([TableCard.tsx](file:///C:/A/kode/catankard/apps/web/src/components/TableCard.tsx) & [CardStack.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardStack.tsx)):** Masada sürükleme ve yığma eylemlerini bozmadan her kartın ve yığının sağ üst köşesine dokunmatik Detay `(i)` butonu eklendi. Karta 450ms basılı tutulduğunda titreşimle detay modalı açılır. Rakip kartlarına tek tık doğrudan detay açar.
   - **Pazar / Açık İnşaat Kartları ([BuildingRowMat.tsx](file:///C:/A/kode/catankard/apps/web/src/components/BuildingRowMat.tsx) & [CardAnimations.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardAnimations.tsx)):** Yetersiz kaynak durumunda karta tek dokunuş doğrudan kart detayını açar; yeterli kaynak varken kartı inşa etmeden önce incelemek için sağ üstteki `(i)` butonuna dokunulabilir veya 450ms basılı tutulabilir.
   - **Büyükşehir Yığını:** Yığının sol üst köşesine eklenen dokunmatik `(i)` butonu ile 5 büyükşehir kartının yer aldığı deste tarayıcısı ([DeckBrowserModal.tsx](file:///C:/A/kode/catankard/apps/web/src/components/DeckBrowserModal.tsx)) mobilde rahatça açılır.
2. **Takas Modalında Mobilde Dokunarak Adet Azaltma ([TradeModal.tsx](file:///C:/A/kode/catankard/apps/web/src/components/TradeModal.tsx)):**
   - Mobilde sağ tık olmadığı için eklenen kart adedinin azaltılamaması sorunu giderildi.
   - Seçilen her kartın sol üstüne belirgin dokunmatik kırmızı `[-]` butonu eklendi; karta dokunulduğunda +1, `[-]` butonuna dokunulduğunda -1 yapılır.
   - Bilgi metni "Dokun: +1 | (-) Butonu: -1" olarak güncellendi.
3. **Mobil Tarayıcı Sistem Menüsü Engellemesi ([index.css](file:///C:/A/kode/catankard/apps/web/src/index.css)):**
   - `-webkit-touch-callout: none` ve `user-select: none` kuralları eklenerek kartlara uzun basıldığında Safari ve Chrome'un sistem görsel menüsünü açması engellendi.
4. **Dokunmatik Kart Detay Modalı ([CardModal.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardModal.tsx)):**
   - Sağ üst köşeye belirgin dairesel kapatma butonu (`X`) ve alt tarafa kart başlık rozeti eklendi.
5. **Kapsamlı Test Doğrulaması:**
   - **Playwright Mobil E2E Testi ([test_mobile_interactions.ts](file:///C:/A/kode/catankard/scratch/test_mobile_interactions.ts)):** iPhone 14 dokunmatik emülasyonunda el kartı inceleme, masa kartı `(i)` butonu, market kartı inceleme ve takas modalında `[-]` butonuyla adet düşürme adımları %100 başarıyla geçti ([mobile_inspect_hand_card.png](file:///C:/A/kode/catankard/scratch/mobile_inspect_hand_card.png), [mobile_trade_modal_stepper.png](file:///C:/A/kode/catankard/scratch/mobile_trade_modal_stepper.png)).
   - **Masa Yığma & Z-Index Testi ([test_card_stacking.ts](file:///C:/A/kode/catankard/scratch/test_card_stacking.ts)):** Hem 3P hem 4P düzeninde %100 başarılı.
   - **Birim Testleri (`npm test`):** 33/33 test başarılı.
   - **Proje Derlemesi (`npm run build`):** Sıfır hata ile tamamlandı.

## Yere Kart Koyma Mekaniği, Serbest Yığma & Z-Index Katman Çözümü (STEP 16)
1. **Kartların Birbiri Üstüne Konabilmesi (Serbest Yığma / Stacking):**
   - Masadaki dar flexbox (`max-w-md`) ve dar koordinat kısıtlamaları (`-140..100 X`, `-75..45 Y`) kaldırıldı.
   - Konteyner genişliği `max-w-[140px] sm:max-w-xl lg:max-w-4xl flex-1` seviyesine çekildi.
   - Kartlar masa üzerinde onlarca kart birikse bile birbirinin üzerine istenilen koordinatta serbestçe yığılabilir, çakışabilir ve taşınabilir hale getirildi.
2. **En Son Tutulan Kart Üstte Kalsın (Dinamik Z-Index Yönetimi):**
   - [useRealtimeCardPositions.ts](file:///C:/A/kode/catankard/apps/web/src/lib/useRealtimeCardPositions.ts) içine artımlı `cardZIndices` state'i, localStorage `${storageKey}_z` kalıcılığı ve `bringToFront(cardId)` metodu eklendi.
   - [TableCard.tsx](file:///C:/A/kode/catankard/apps/web/src/components/TableCard.tsx) ve [CardStack.tsx](file:///C:/A/kode/catankard/apps/web/src/components/CardStack.tsx) bileşenlerine `zIndex` prop'u ve `handlePointerDown` anında tetiklenen `onBringToFront` bağlandı.
   - Kart sürüklenirken `zIndex: 100`, bırakıldığında `zIndex: cardZIndices[cardId]` korunur. Altta kalan bir karta tekrar dokunulduğunda hemen en ön plana çıkar.
3. **Geniş Kırmızı Dikdörtgen Alanı ve Görünmez Sınırlar:**
   - Kullanıcının ilettiği ekran görüntüsündeki kırmızı alana birebir uyumlu olarak [safePlacementBoundary.ts](file:///C:/A/kode/catankard/apps/web/src/lib/safePlacementBoundary.ts) güncellendi:
     - **Sol Sınır**: Merkez aksiyon butonlarının hemen sağı (`winW * 0.46`).
     - **Sağ Sınır**: Ekranın sağ kenarı (`winW - 12px`).
     - **Üst Sınır**: Market tepsisinin hemen altı (`winH * 0.50 + 15px`).
     - **Alt Sınır**: Ekranın alt kenarı (`winH - 12px`).
   - Sınırlar tamamen görünmezdir (hiçbir kesikli çizgi, etiket veya görsel çerçeve masaya çizilmez). Kartlar bu alanda sınıra ulaştığında yumuşakça durur (clamp).
4. **Çok Oyunculu Realtime Senkronizasyon:**
   - `CardMovePayload` içerisine `zIndex` eklendi; kart hareketleri ve katman sıralaması Supabase broadcast ile diğer oyuncuların ekranlarına da anında yansıtılır.
   - Hem [GameDesk4P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk4P.tsx) hem [GameDesk3P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk3P.tsx) üzerinde tüm rakiplerin masadaki kartlarına `zIndex={cardZIndices[cardId]}` bağlandı.
5. **Kapsamlı Test Doğrulaması:**
   - **Birim Testleri (`npm test`)**: `safePlacementBoundary.test.ts` (7/7) ve `useRealtimeCardPositions.test.ts` (9/9) ile toplam 16 web birim testi ve 17 engine testi (%100) başarıyla geçti.
   - **E2E Playwright Testi (`scratch/test_card_stacking.ts`)**: Hem 4P hem 3P modunda Yol kartı Köy kartının üzerine yığıldı, Yol kartının zIndex'i öne geçti, alttaki Köy kartına tıklandığında Köy kartının en üste çıktığı ve kartların geniş kırmızı sınırda kusursuzca clamp ettiği test edildi. Kanıt ekran görüntüleri kaydedildi (`scratch/card_stacking_verified_4p.png` ve `scratch/card_stacking_verified_3p.png`).
   - **TypeScript & Vite Build**: `npm run build` sıfır hatayla derlendi.

## Rastgelelik Motoru, Mobil UI İyileştirmeleri & E2E Testi (STEP 15)
1. **Rastgelelik Motorunun Doğrulanması & İstatistiksel Sağlamlık:**
   - [random.ts](file:///C:/A/kode/catankard/packages/engine/src/random.ts) Mulberry32 ve Fisher-Yates algoritmaları 1.000.000 float çekimi ve 120.000 permütasyon testiyle Chi-Kare analizine tabi tutuldu:
     - 1M float çekimi Chi-Kare değeri: `10.90` (Kritik p=0.01 değeri `21.67`'nin çok altında, kusursuz tekdüze dağılım).
     - 120K Fisher-Yates 3-kart permütasyon testi: `10.84` (Kritik p=0.01 değeri `15.09`'un çok altında, sıfır meyil / bias).
     - 100K Deste Karıştırma Testi: Tuğla (+%0.08), Odun (+%0.48), Yün (-%0.96), Buğday (+%0.24), Demir (+%0.34) ile teorik olasılıklarla <%1 sapma ile tam uyumlu.
2. **Mobilde Kartların Taşmasının & Patlamasının Giderilmesi:**
   - [useResponsiveLayout.ts](file:///C:/A/kode/catankard/apps/web/src/lib/useResponsiveLayout.ts) hem `width` hem `height` bazlı `isMobilePortrait` ve `isMobileLandscape` modlarını ayırt edecek şekilde güncellendi; mobil dikeyde masaüstü 1.0 tam ekran ölçeğinin mobilde ekranı patlatması engellendi.
   - [BuildingRowMat.tsx](file:///C:/A/kode/catankard/apps/web/src/components/BuildingRowMat.tsx) mobil dikeyde 2 katmanlı akıllı düzene geçirildi (üstte 4 kapalı deste + bonuslar, altta 5 açık kart yuvası); 628px'lik taşma 240px'e indirilerek telefon ekranına %100 sığdırıldı.
   - [FannedHand.tsx](file:///C:/A/kode/catankard/apps/web/src/components/FannedHand.tsx) eldeki kaynak kartı yelpazesine ekran genişliğine duyarlı dinamik sınırlandırma (`maxHandSpan`) getirildi; 15+ kart olsa bile kartlar sıkışarak ekran dışına (x:912px) taşması önlendi.
   - [GameDesk4P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk4P.tsx) ve [GameDesk3P.tsx](file:///C:/A/kode/catankard/apps/web/src/components/GameDesk3P.tsx) sağ alt kadranında yerdeki kartlar ile el kartları dikeyde üst üste dizilerek yatay taşma tamamen sıfırlandı (`cardsOffscreen: []`).
   - Mobil dikeyde kullanıcıya nazik, kapatılabilir "📱 Geniş masa deneyimi için cihazınızı yatay çevirebilirsiniz" ipucu rozeti eklendi.
3. **Gerçekçi Tarayıcı E2E Testi (`scratch/e2e_real_game_test.ts`):**
   - Playwright ile tarayıcıda canlı maç açıldı; 4 oyuncu (Sen, Ahmet, Zeynep, Can) ve Tur #1 doğru algılandı.
   - Marketteki uygun açık karta tıklanarak inşaat hamlesi başarıyla yapıldı.
   - "Turu Bitir" butonuna tıklanarak sıra #2'ye geçti, Hasat fazı ve sıra dönüşü doğrulandı.
   - Zafer koşulu ve 7 ZP "OYUN BİTTİ!" kupalı zafer ekranı test edildi; tarayıcı konsolunda 0 hata ile çalıştı.

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

## Mobil Dokunmatik Mekanikler ve Canlı Sürüm (v0.2.0)
- [x] Kartların üzerindeki tüm suni/yardımcı butonlar (`(i)` detay butonları) kaldırıldı; kartlar tamamen saf ve temiz kart görseline kavuşturuldu.
- [x] **Uzun Basma (Long-Press - 400ms):** Tüm kartlara (eldeliler, masadakiler, markettekiler, metropolis destesi) dokunmatik uzun basma ile detay inceleme modalı (`CardModal`) açılması sağlandı.
- [x] **Sürükleme & Dokunma Ayrıştırması:** Masadaki kartların sürüklenmesi (drag) ile uzun basma (inspect) eşik toleransına (8px) bağlandı; parmak hareketinde uzun basma iptal edilip pürüzsüz sürükleme sağlandı.
- [x] **Takas Menüsü (TradeModal) Sıfırlama:** Mobilde karta dokunulduğunda +1 ekleme, uzun basıldığında kaynağı 0'a sıfırlama mekanizması uygulandı. Kart üzerindeki butonlar kaldırıldı.
- [x] **İki Sıralı Basamaklı El Yelpazesi (FannedHand):** Elde 6 veya daha fazla kart olduğunda dikey modda kartların birbirini ezmemesi için otomatik 2 sıralı basamaklı düzene geçildi; dokunulan kartın anında en öne yükselmesi (`zIndex: 100`) sağlandı.
- [x] Masadaki kartların çift tıklama ile yuvalarına geri dönmesi korundu.

## Sonraki Adım
Uzak Supabase projesine migration uygulama ve Edge Function deploy'u.
