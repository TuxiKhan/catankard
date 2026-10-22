# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 1 – Başlatma & Repo Kurulumu
- **Son güncelleme:** 2026-10-22

## Kaynak Materyal Envanteri
| Kaynak | Konum | Not |
| :--- | :--- | :--- |
| Master prompt | `catan_ai_orchestrator_master_prompt.md` | Orkestrasyon kuralları |
| Kural kitabı | `CN3143 CATAN - On the Road Rulebook.md` | ⚠️ PDF'ten çıkarılmış, metin yer yer bozuk (tablo/sütun karışması) |
| Masa düzenleri (3/4 oyuncu) | `masa-md/` (+ görseller `masa/`) | Ana masa, el destesi, kart detay modalı |
| Kart tanımları (TR) | `catan_on_the_road_cards - Türkçe md/` (+ görseller) | bonus, building, event, metropolis, player_aid, resource, starting |

## Yol Haritası
- [x] Klasör incelemesi
- [x] `progress.md` oluşturuldu
- [x] Yerel Git deposu başlatıldı
- [ ] GitHub uzak deposu oluştur & bağla (kullanıcı onayı bekleniyor)
- [ ] Frontend framework seçimi (kullanıcı cevabı bekleniyor)
- [ ] Supabase bağlantı bilgileri & `.env` kurulumu (kullanıcı cevabı bekleniyor)
- [ ] Sub-Agent 1: Backend & Database Architect (Supabase şema, RLS, Realtime)
- [ ] Sub-Agent 2: Game Engine & Logic (Hasat/Aksiyon fazları, 7 ZP, En Uzun Yol, En Büyük Ordu, durum makinesi)
- [ ] Sub-Agent 3: Frontend UI/UX (3 & 4 oyunculu masa, building row, kart modalları)
- [ ] Entegrasyon, E2E testleri (3 ve 4 oyunculu tam oyun)

## Darboğazlar / Açık Sorular
1. Frontend framework tercihi (React / Vue / diğer)?
2. Supabase: mevcut proje mi, yeni proje mi? (URL + anon/publishable key)
3. GitHub repo adı ve görünürlüğü (public/private)?
4. Masa `.md` dosyaları "Catan Hızlı Kart Oyunu" terminolojisi ve belirsiz ikonlar (`+??`, `1x ?`) içeriyor; oyun mantığında **kart md dosyaları + kural kitabı** esas alınacak, masa md'leri yalnızca yerleşim referansı olarak kullanılacak (onay bekleniyor).

## Sonraki Adım
Kullanıcıdan yukarıdaki cevaplar gelince → Sub-Agent 1 (Supabase) başlatılacak.
