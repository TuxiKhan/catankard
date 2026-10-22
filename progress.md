# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 4 – Entegrasyon Tamamlandı & E2E Hazırlığı
- **Repo:** https://github.com/TuxiKhan/catankard (public)
- **Supabase:** `catan game` · ref `oykohkhaptgyeeeyauon` · eu-west-1
- **Son güncelleme:** 2026-10-23

## Kaynak Materyal
| Kaynak | Konum | Not |
| :--- | :--- | :--- |
| Master prompt | `catan_ai_orchestrator_master_prompt.md` | Orkestrasyon kuralları |
| Kural kitabı (PDF) | `CN3143 CATAN – On the Road Rulebook.pdf` | Orijinal resmi kural kitapçığı |
| **Kural spesifikasyonu** | `docs/RULES_SPEC.md` | v1.0 Orijinal PDF ile %100 doğrulanmış nihai kural belgesi |
| **Mimari & API sözleşmesi** | `docs/ARCHITECTURE.md` + `packages/engine/src/types.ts` | Ajanlar arası ortak arayüz |
| Masa düzenleri | `masa-md/` (+ `masa/` PNG) | 3 ve 4 oyunculu masa düzenleri referansı |
| Kart tanımları (TR) | `catan_on_the_road_cards - Türkçe md/` (+ PNG) | UI'da kullanılan kart yüzü görselleri |

## Yol Haritası
- [x] Klasör incelemesi, `progress.md`, yerel Git
- [x] GitHub public repo oluşturuldu ve push edildi
- [x] Orijinal `CN3143 CATAN – On the Road Rulebook.pdf` incelendi ve `docs/RULES_SPEC.md` eksiksiz güncellendi (v1.0)
- [x] Sub-Agent 2: Oyun Motoru (`packages/engine`) — deterministik PRNG, tam kural seti, 15 vitest testi (%100 başarı)
- [x] Sub-Agent 1: Backend & DB (`supabase/`) — PostgreSQL şeması, RLS politikaları, Realtime yayını, `lobby`, `game-action`, `heartbeat` Edge Function'ları
- [x] Sub-Agent 3: Frontend UI (`apps/web`) — React + Vite + Tailwind CSS, 3 ve 4 oyunculu masa düzeni, kart inceleme, ticaret modalı, hırsız/sadaka modalları, production build doğrulandı
- [x] 3 dal (`feat/engine`, `feat/backend`, `feat/frontend`) `main` dalına entegre edildi ve GitHub'a push edildi
- [ ] Supabase Edge Function deploy & SQL migration uygulama
- [ ] 3 ve 4 oyunculu simülasyon / E2E doğrulama

## Tamamlanan Detaylar (PDF Doğrulaması)
1. **Oyuncu Yardım Kartları**: 4 adet çift yüzlü yardım kartı bileşenlere eklendi.
2. **Ticaret Bonusu**: Aktif oyuncuyla takas yapan diğer oyuncunun desteden 1 bonus kaynak kartı çekmesi kuralı motora ve UI'ya tam uygulandı.
3. **Hasat Fazı**: Aktif oyuncunun açık Şehir (+1) ve Büyükşehir (+2 A yüzü / +1 B yüzü) ek kaynak çekimleri eksiksiz uygulandı.
4. **Metropolis B Yetenekleri**: Şövalye/Yol başı kaynak çekme ve En Uzun Yol / En Güçlü Ordu beraberlik eşitlik kuralı (`tiebreaker`) eksiksiz uygulandı.
5. **Olay Kartları**: Hırsız (`7 + şövalye`), Solstice (tüm olayların deste+ıskarta yeniden karıştırılması), Abundance (bonussuzlara 2 kaynak), Subsidy (açık köy başına 1 kaynak) ve Charity (en çok ZP'linin az ZP'liye kart vermesi) başarıyla modellendi.
6. **Yol Takası**: 1 yol=4:1, 2 yol=3:1, 3 yol=2:1, 4+ yol=1:1 oranları uygulandı.

## Sonraki Adım
Uzak Supabase projesine migration uygulama ve Edge Function deploy'u.
