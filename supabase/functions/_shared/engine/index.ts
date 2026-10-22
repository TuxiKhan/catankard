import {
  checkAndReshuffleBuildingRow,
  getLegalBuilds,
  handleAction,
} from './actions.ts';
import {
  createInitialBuildingDeck,
  createInitialEventDeck,
  createInitialResourceDeck,
  createMetropolisStack,
} from './cards.ts';
import { giveResourcesToPlayer } from './events.ts';
import { executeHarvestPhase } from './harvest.ts';
import { createRng, shuffle, type RngState } from './random.ts';
import { handleTick } from './tick.ts';
import type {
  Action,
  ActionResult,
  BuildTarget,
  GameConfig,
  GameState,
  PlayerArea,
  PlayerId,
  PlayerView,
  ResourceCounts,
  SettlementStack,
} from './types.ts';
import { calculateVisibleVP, checkWinCondition } from './victory.ts';
import { createPlayerView } from './view.ts';

export * from './types.ts';
export { EngineIllegalMoveError } from './actions.ts';

/** Yeni bir CATAN – On the Road oyunu oluşturur. */
export function createGame(config: GameConfig, now: number): GameState {
  if (config.players.length < 3 || config.players.length > 4) {
    throw new Error('Oyuncu sayısı 3 veya 4 olmalıdır.');
  }

  const rng = createRng(config.seed);

  // 1. Desteleri oluştur ve karıştır
  let resourceDeck = shuffle(rng, createInitialResourceDeck());
  const resourceDiscard: any[] = [];
  let buildingDeck = shuffle(rng, createInitialBuildingDeck());
  const eventDeck = shuffle(rng, createInitialEventDeck());
  const eventDiscard: any[] = [];
  const metropolisStack = createMetropolisStack(config.metropolisSide);

  // 2. Başlangıç Köyleri: 3 oyuncuda 3 adet, 4 oyuncuda 4 adet
  // 1 tanesi kesinlikle "Oyuna sen başlarsın" kartı
  const startingSettlementCards: { isStartingPlayerCard: boolean }[] = [
    { isStartingPlayerCard: true },
    { isStartingPlayerCard: false },
    { isStartingPlayerCard: false },
  ];
  if (config.players.length === 4) {
    startingSettlementCards.push({ isStartingPlayerCard: false });
  }
  shuffle(rng, startingSettlementCards);

  // 3. Oyuncu alanları, elleri ve başlangıç oyuncusu tespiti
  const turnOrder: PlayerId[] = config.players.map((p) => p.id);
  const hands: Record<PlayerId, ResourceCounts> = {};
  const areas: Record<PlayerId, PlayerArea> = {};
  let startingPlayerIndex = 0;

  for (let i = 0; i < config.players.length; i++) {
    const pid = config.players[i]!.id;
    const settlementCard = startingSettlementCards[i]!;

    if (settlementCard.isStartingPlayerCard) {
      startingPlayerIndex = i;
    }

    hands[pid] = { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 };

    const initialStack: SettlementStack = {
      id: `stack-init-${pid}`,
      top: 'settlement',
      isStarting: true,
      isStartingPlayerCard: settlementCard.isStartingPlayerCard,
    };

    areas[pid] = {
      roads: 1, // 1 Başlangıç Yolu
      knights: 0,
      stacks: [initialStack], // 1 Başlangıç Köyü
    };
  }

  // 4. Building Row: Desteden 5 kart aç
  const buildingRow = [];
  for (let i = 0; i < 5; i++) {
    const card = buildingDeck.pop();
    if (card) buildingRow.push(card);
  }

  // 5. Durum nesnesi iskeleti
  const state: GameState = {
    config,
    rng: rng as any,
    turnOrder,
    activePlayerIndex: startingPlayerIndex,
    turnNumber: 1,
    turnDeadline: config.turnTimerSeconds ? now + config.turnTimerSeconds * 1000 : null,
    phase: 'action',
    hands,
    areas,
    resourceDeck,
    resourceDiscard,
    buildingDeck,
    buildingRow,
    metropolisStack,
    eventDeck,
    eventDiscard,
    longestRouteOwner: null,
    largestArmyOwner: null,
    turnFlags: { traded: false, roadSubstitutionUsed: false },
    tradeOffers: [],
    pendingDecisions: [],
    removedPlayers: [],
    winner: null,
    log: [],
  };

  // 5 aynı tip kart varsa yeniden karıştır
  checkAndReshuffleBuildingRow(state);

  // 6. Başlangıç elleri: Her oyuncuya 2 kaynak kartı ver
  for (const pid of turnOrder) {
    giveResourcesToPlayer(state, pid, 2);
  }

  // 7. İlk turun başlangıcı ve Hasat Fazı
  const firstPlayer = turnOrder[startingPlayerIndex]!;
  state.log.push({ t: 'turn_started', playerId: firstPlayer });
  executeHarvestPhase(state);
  checkWinCondition(state);

  return state;
}

/** Oyuncu hamlesini işler. Geçersiz hamlede IllegalMoveError fırlatır. */
export function applyAction(
  state: GameState,
  actor: PlayerId,
  action: Action,
  now: number
): ActionResult {
  return handleAction(state, actor, action, now);
}

/** Süresi dolan kararları veya tur süresini otomatik ilerletir. */
export function applyTick(state: GameState, now: number): ActionResult {
  return handleTick(state, now);
}

/** Oyuncuya özel gizli bilgisi filtrelenmiş görünümü döner. */
export function getPlayerView(state: GameState, playerId: PlayerId): PlayerView {
  return createPlayerView(state, playerId);
}

/** Oyuncunun görünür zafer puanını döner. */
export function visibleVP(state: GameState, playerId: PlayerId): number {
  return calculateVisibleVP(state, playerId);
}

/** Aktif oyuncunun yapabileceği geçerli inşaat hedeflerini döner. */
export function legalBuilds(state: GameState, playerId: PlayerId): BuildTarget[] {
  return getLegalBuilds(state, playerId);
}
