# Mimari & Arayüz Sözleşmesi (v0.1)

> Master Agent tarafından belirlenmiştir. Değişiklik gerekiyorsa sub-agent Master Agent'a sorar.

## Kararlar (kullanıcı onaylı)
| Konu | Karar |
| :--- | :--- |
| Frontend | React + Vite + TypeScript + Tailwind CSS (`apps/web`) |
| Oyun motoru | Saf TypeScript paketi, bağımlılıksız, Deno uyumlu (`packages/engine`) |
| Yetki | **Sunucu yetkili**: tüm hamleler Supabase Edge Function'da motorla doğrulanır. Tam durum istemciye gitmez |
| Supabase | Mevcut proje `catan game` (ref `oykohkhaptgyeeeyauon`, eu-west-1). Eski tablolar silinip şema sıfırdan |
| Giriş | Kullanıcı yalnızca **isim** girer (Gartic Phone gibi). Arkada `supabase.auth.signInAnonymously()` → JWT/uid; isim oyuncu kaydında |
| Büyükşehir | Oda kurucusu seçer: "Oyuna yeni başladım" = A yüzü, "Daha önce oynadım" = B yüzü |
| Tur süresi | Kurucu seçer: Süresiz / 60 / 90 / 120 sn. Süre dolunca tur otomatik geçer |
| Kopma | Kopan oyuncu geri dönebilir. Kurucu, 1 dk'dan uzun kopuk oyuncuyu atabilir veya oyunu bitirebilir |
| Oyuncu kararları | Hırsız atma / Sadaka: 15 sn içinde oyuncu seçer, süre dolarsa sistem rastgele seçer |
| Olay destesi biterse | Iskartadaki olaylar karıştırılıp yeni deste yapılır |
| Dil | Türkçe arayüz |
| Kart görselleri | `catan_on_the_road_cards - Türkçe/` PNG'leri kart yüzü olarak kullanılır |
| Monorepo | npm workspaces: `apps/web`, `packages/engine`, `supabase/` |

## Dizin Yapısı
```
/apps/web            React UI (Sub-Agent 3)
/packages/engine     Oyun motoru (Sub-Agent 2) — sözleşme: src/types.ts
/supabase/migrations SQL migration'lar (Sub-Agent 1)
/supabase/functions  Edge Functions (Sub-Agent 1)
/docs                RULES_SPEC.md, ARCHITECTURE.md
```

## Sunucu API'si (Edge Functions) — Backend uygular, Frontend kullanır
Tüm çağrılar `supabase.functions.invoke(name, { body })` ile, kullanıcının JWT'si ile yapılır.
Hata yanıtı: `{ ok: false, code: string, message: string }` (HTTP 4xx).

### `lobby`
| `op` | Girdi | Çıktı |
| :--- | :--- | :--- |
| `create_room` | `{ name, maxPlayers: 3\|4, metropolisSide: 'A'\|'B', turnTimerSeconds: null\|60\|90\|120 }` | `{ ok, roomId, code }` (6 haneli kod) |
| `join_room` | `{ code, name }` | `{ ok, roomId }` (geri dönen oyuncu aynı uid ile yeniden bağlanır) |
| `leave_room` | `{ roomId }` | `{ ok }` (yalnızca lobi aşamasında) |
| `start_game` | `{ roomId }` | `{ ok }` — sadece kurucu, oyuncu sayısı 3 veya 4 olmalı |
| `end_game` | `{ roomId }` | `{ ok }` — sadece kurucu |

### `game-action`
| Girdi | Açıklama |
| :--- | :--- |
| `{ roomId, action: Action }` | Motor `applyAction` ile uygular (`packages/engine/src/types.ts`) |
| `{ roomId, tick: true }` | Herhangi bir oyuncu çağırabilir; sunucu `applyTick(now)` ile süresi dolan karar/turu işler |
Çıktı: `{ ok: true, view: PlayerView }`. `remove_player` aksiyonunda backend ayrıca hedefin `last_seen_at`'inin 60 sn'den eski olduğunu doğrular.

### `heartbeat` (RPC veya Edge Function — backend seçer)
İstemci her 15 sn'de çağırır → `room_players.last_seen_at = now()`.

## Realtime
- Her oyuncu kendi `player_views` satırını dinler (RLS: sadece kendi satırı). Satır içeriği `PlayerView` JSON'udur ve her hamleden sonra sunucu tarafından tüm oyuncular için yeniden yazılır.
- Lobi: `rooms` ve `room_players` değişiklikleri (oda üyeleri okuyabilir).
- Çevrimiçi göstergesi: Realtime Presence kanalı `room:{roomId}` (sadece UI; yetki kararları `last_seen_at` ile).
- Tam `GameState` yalnızca istemcinin erişemediği bir tabloda tutulur (RLS ile tüm erişim kapalı, sadece service role).

## Eşzamanlılık
`game-action` durum satırını `version` sütunu ile iyimser kilitleme (optimistic locking) yaparak günceller; çakışmada yeniden dener.
