# CATAN – On the Road (Online) · İlerleme Takibi

> Master Orchestrator tarafından tutulur. Her adımda güncellenir.

## Durum Özeti
- **Aşama:** STEP 2 – Sub-Agent'lar başlatılıyor
- **Repo:** https://github.com/TuxiKhan/catankard (public)
- **Supabase:** `catan game` · ref `oykohkhaptgyeeeyauon` · eu-west-1
- **Son güncelleme:** 2026-10-23

## Kaynak Materyal
| Kaynak | Konum | Not |
| :--- | :--- | :--- |
| Master prompt | `catan_ai_orchestrator_master_prompt.md` | Orkestrasyon kuralları |
| Kural kitabı (ham) | `CN3143 CATAN - On the Road Rulebook.md` | ⚠️ PDF'ten bozuk çıkarılmış |
| **Kural spesifikasyonu** | `docs/RULES_SPEC.md` | Master tarafından derlendi — tüm ajanlar bunu esas alır |
| **Mimari & API sözleşmesi** | `docs/ARCHITECTURE.md` + `packages/engine/src/types.ts` | Ajanlar arası ortak arayüz |
| Masa düzenleri | `masa-md/` (+ `masa/` PNG) | Sadece yerleşim referansı |
| Kart tanımları (TR) | `catan_on_the_road_cards - Türkçe md/` (+ PNG) | PNG'ler kart yüzü olarak kullanılacak |

## Yol Haritası
- [x] Klasör incelemesi, `progress.md`, yerel Git
- [x] GitHub public repo oluşturuldu ve push edildi
- [x] Frontend: React + Vite + TS + Tailwind
- [x] Supabase: mevcut proje, eski tablolar silinecek
- [x] Kural spesifikasyonu ve mimari sözleşme yazıldı
- [x] Monorepo iskeleti (npm workspaces)
- [ ] Sub-Agent 2: Game Engine (`feat/engine`)
- [ ] Sub-Agent 1: Backend & DB (`feat/backend`)
- [ ] Sub-Agent 3: Frontend UI (`feat/frontend`)
- [ ] Entegrasyon (merge) + Edge Function deploy
- [ ] E2E testleri (3 ve 4 oyunculu tam oyun)

## Kullanıcı Kararları
Bkz. `docs/ARCHITECTURE.md` → "Kararlar".

## Master Varsayımları (⚠️ kullanıcı onayı bekleniyor — itiraz edilmezse geçerli)
1. Tur süresi dolunca açık takas teklifleri iptal edilir, tur geçer.
2. Atılan oyuncunun eli kaynak ıskartasına gider, önündeki kartlar oyundan çıkar; bonus kartlar yeniden hesaplanır.
3. Sadaka'da birden fazla verici varsa seçimler eşzamanlı istenir.
4. Kaynak destesi + ıskarta tamamen boşsa çekilemeyen kartlar atlanır.

## Darboğazlar / Açık Sorular
- ⚠️ Repo public ve CATAN'ın telifli kart görsellerini/kural kitabını içeriyor (kullanıcıya bildirildi).
- Supabase Anonymous Sign-in projede etkin olmalı (Backend ajanı kontrol edecek).
- Yerelde Docker/Deno yok → Edge Function testleri Node/Vitest ile motor üzerinden + uzak projede entegrasyon testi.

## Sonraki Adım
3 sub-agent'ı paralel başlat, raporları bekle.
