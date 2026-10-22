/**
 * CATAN – On the Road · Oyun Motoru SÖZLEŞMESİ (contract)
 *
 * Bu dosya Master Agent tarafından tanımlanmıştır ve 3 sub-agent'ın ortak arayüzüdür.
 * - Engine agent: bu tipleri uygular. Alan EKLEYEBİLİR, mevcut alanları KALDIRAMAZ / yeniden adlandıramaz
 *   (gerekirse Master Agent'a sorar).
 * - Backend agent: Edge Function'da `createGame`, `applyAction`, `applyTick`, `getPlayerView` kullanır.
 * - Frontend agent: `PlayerView` ve `Action` tiplerini kullanır.
 *
 * Kurallar: ../../../docs/RULES_SPEC.md
 * Motor saf (pure) ve deterministiktir: rastgelelik `state.rng` (seed'li PRNG) ile, zaman `now` (ms epoch) parametresiyle gelir.
 * Deno (Supabase Edge Functions) uyumu için: harici bağımlılık YOK, göreli importlar `.ts` uzantılı.
 */

export type Resource = 'brick' | 'wood' | 'wool' | 'wheat' | 'ore';
export const RESOURCES: readonly Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];
export type ResourceCounts = Record<Resource, number>;

export type BuildingType = 'road' | 'settlement' | 'city' | 'knight';
export type MetropolisSide = 'A' | 'B';
/** B yüzü türleri. A yüzünde hepsi aynıdır (kind yok). */
export type MetropolisBKind = 'knights' | 'roads' | 'longest_route' | 'largest_army';
export type EventKind = 'robber' | 'solstice' | 'abundance' | 'subsidy' | 'charity';
export type TurnTimerSeconds = null | 60 | 90 | 120;

/** Her fiziksel kartın benzersiz id'si vardır, ör. "bld-road-03", "metro-2", "evt-robber-1". */
export type CardId = string;
export type PlayerId = string;

export interface BuildingCard { id: CardId; type: BuildingType }
export interface MetropolisCard { id: CardId; side: MetropolisSide; kind?: MetropolisBKind }
export interface EventCard { id: CardId; kind: EventKind }

/** Oyuncunun önündeki Köy → Şehir → Büyükşehir yığını. Yalnızca `top` görünür ve puan verir. */
export interface SettlementStack {
  id: string;
  top: 'settlement' | 'city' | 'metropolis';
  isStarting: boolean;
  /** Başlangıç köyü "Oyuna sen başlarsın" kartı mı */
  isStartingPlayerCard?: boolean;
  metropolis?: MetropolisCard;
}

export interface PlayerArea {
  roads: number;      // İlk Yol dahil
  knights: number;
  stacks: SettlementStack[];
}

export interface GameConfig {
  players: { id: PlayerId; name: string }[]; // 3 veya 4; sıra = oturma düzeni (saat yönü)
  metropolisSide: MetropolisSide;             // A = "Oyuna yeni başladım", B = "Daha önce oynadım"
  turnTimerSeconds: TurnTimerSeconds;          // null = süresiz
  seed: string;
}

export type PendingDecision =
  | { id: string; kind: 'robber_discard'; playerId: PlayerId; count: number; deadline: number }
  | { id: string; kind: 'charity_give'; playerId: PlayerId; candidates: PlayerId[]; deadline: number };

/** Karar süresi (Hırsız atma, Sadaka): 15 sn, dolunca sistem rastgele seçer. */
export const DECISION_TIMEOUT_MS = 15_000;

export interface TradeOffer {
  id: string;
  fromPlayerId: PlayerId;
  /** null = aktif oyuncunun herkese açık teklifi */
  toPlayerId: PlayerId | null;
  give: ResourceCounts;   // teklifi yapanın vereceği
  want: ResourceCounts;   // teklifi yapanın alacağı
  status: 'open' | 'accepted' | 'cancelled';
}

export type GamePhase = 'action' | 'awaiting_decisions' | 'finished';

export type GameLogEntry =
  | { t: 'turn_started'; playerId: PlayerId }
  | { t: 'harvest'; draws: Record<PlayerId, number> }
  | { t: 'trade_done'; a: PlayerId; b: PlayerId; aGave: ResourceCounts; bGave: ResourceCounts }
  | { t: 'built'; playerId: PlayerId; card: BuildingType | 'metropolis'; cardId: CardId }
  | { t: 'event'; kind: EventKind }
  | { t: 'discarded'; playerId: PlayerId; count: number }
  | { t: 'charity'; from: PlayerId; to: PlayerId }
  | { t: 'bonus_moved'; bonus: 'longest_route' | 'largest_army'; to: PlayerId; from: PlayerId | null }
  | { t: 'row_reshuffled' }
  | { t: 'auto_choice'; playerId: PlayerId; decision: PendingDecision['kind'] }
  | { t: 'turn_timeout'; playerId: PlayerId }
  | { t: 'player_removed'; playerId: PlayerId }
  | { t: 'game_won'; playerId: PlayerId };

/** TAM durum: yalnızca sunucuda tutulur, istemciye ASLA gönderilmez. */
export interface GameState {
  config: GameConfig;
  rng: { state: number[] | number | string };      // PRNG iç durumu (engine belirler)
  turnOrder: PlayerId[];
  activePlayerIndex: number;
  turnNumber: number;
  turnDeadline: number | null;                     // ms epoch, süresiz ise null
  phase: GamePhase;
  hands: Record<PlayerId, ResourceCounts>;
  areas: Record<PlayerId, PlayerArea>;
  resourceDeck: Resource[];
  resourceDiscard: Resource[];
  buildingDeck: BuildingCard[];
  buildingRow: BuildingCard[];                     // her zaman 5 (deste yetersizse daha az)
  metropolisStack: MetropolisCard[];
  eventDeck: EventCard[];
  eventDiscard: EventCard[];
  longestRouteOwner: PlayerId | null;
  largestArmyOwner: PlayerId | null;
  turnFlags: { traded: boolean; roadSubstitutionUsed: boolean };
  tradeOffers: TradeOffer[];
  pendingDecisions: PendingDecision[];
  removedPlayers: PlayerId[];
  winner: PlayerId | null;
  log: GameLogEntry[];                             // tüm oyun boyunca eklenir
}

export type BuildTarget =
  | { source: 'row'; cardId: CardId; onStackId?: string }        // city için onStackId zorunlu (görünür köy)
  | { source: 'metropolis'; cardId: CardId; onStackId: string }; // görünür şehir

export type Action =
  | { type: 'propose_trade'; toPlayerId: PlayerId | null; give: ResourceCounts; want: ResourceCounts }
  | { type: 'accept_trade'; offerId: string }
  | { type: 'cancel_trade'; offerId: string }
  | {
      type: 'build';
      target: BuildTarget;
      /** Turda 1 kez Yol ikamesi: `replace` kaynağı yerine yol oranı kadar `pay` öde */
      substitution?: { pay: Resource; replace: Resource };
    }
  | { type: 'discard'; decisionId: string; cards: ResourceCounts }
  | { type: 'charity_give'; decisionId: string; toPlayerId: PlayerId; resource: Resource }
  | { type: 'end_turn' }
  /** Oda kurucusu, 1 dk'dan uzun süredir kopuk oyuncuyu atar (bağlantı kontrolü backend'de) */
  | { type: 'remove_player'; playerId: PlayerId };

export class IllegalMoveError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export interface ActionResult { state: GameState; newLog: GameLogEntry[] }

/** İstemciye giden, oyuncuya özel, gizli bilgisi ayıklanmış görünüm. */
export interface PlayerView {
  you: PlayerId;
  config: Omit<GameConfig, 'seed'>;
  turnOrder: PlayerId[];
  activePlayerId: PlayerId;
  turnNumber: number;
  turnDeadline: number | null;
  phase: GamePhase;
  yourHand: ResourceCounts;
  players: Record<PlayerId, {
    name: string;
    handCount: number;
    area: PlayerArea;
    visibleVP: number;
    removed: boolean;
  }>;
  resourceDeckCount: number;
  resourceDiscardCount: number;
  buildingDeckCount: number;
  buildingRow: BuildingCard[];
  metropolisStack: MetropolisCard[];
  eventDeckCount: number;
  lastEvent: EventKind | null;
  longestRouteOwner: PlayerId | null;
  largestArmyOwner: PlayerId | null;
  turnFlags: { traded: boolean; roadSubstitutionUsed: boolean };
  tradeOffers: TradeOffer[];
  /** Herkes görür (kim bekleniyor), ama detay sadece ilgili oyuncu için anlamlıdır */
  pendingDecisions: PendingDecision[];
  winner: PlayerId | null;
  recentLog: GameLogEntry[];  // son 30 kayıt
}

/* ---- Motorun dışa açtığı fonksiyonlar (engine agent `index.ts`'de uygular) ----
export function createGame(config: GameConfig, now: number): GameState;
export function applyAction(state: GameState, actor: PlayerId, action: Action, now: number): ActionResult; // geçersizse IllegalMoveError
export function applyTick(state: GameState, now: number): ActionResult;  // süresi dolan kararlar → rastgele; tur süresi dolduysa → tur geçer
export function getPlayerView(state: GameState, playerId: PlayerId): PlayerView;
export function visibleVP(state: GameState, playerId: PlayerId): number;
export function legalBuilds(state: GameState, playerId: PlayerId): BuildTarget[]; // UI için
*/
