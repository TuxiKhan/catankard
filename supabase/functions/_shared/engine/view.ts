import { totalResourceCount } from './cards.ts';
import type { EventKind, GameState, PlayerId, PlayerView } from './types.ts';
import { calculateVisibleVP } from './victory.ts';

export function createPlayerView(state: GameState, playerId: PlayerId): PlayerView {
  const activePlayerId = state.turnOrder[state.activePlayerIndex] ?? '';

  // Oyuncuların genel görünümü (diğer oyuncuların ellerindeki kart sayıları, alanları, puanları)
  const playersSummary: PlayerView['players'] = {};
  for (const p of state.config.players) {
    const hand = state.hands[p.id];
    const area = state.areas[p.id] ?? { roads: 0, knights: 0, stacks: [] };
    const vp = calculateVisibleVP(state, p.id);
    const removed = state.removedPlayers.includes(p.id);

    playersSummary[p.id] = {
      name: p.name,
      handCount: hand ? totalResourceCount(hand) : 0,
      area,
      visibleVP: vp,
      removed,
    };
  }

  // Son çözülen olay
  let lastEvent: EventKind | null = null;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i];
    if (entry && entry.t === 'event') {
      lastEvent = entry.kind;
      break;
    }
  }

  const { seed: _, ...configWithoutSeed } = state.config;

  return {
    you: playerId,
    config: configWithoutSeed,
    turnOrder: [...state.turnOrder],
    activePlayerId,
    turnNumber: state.turnNumber,
    turnDeadline: state.turnDeadline,
    phase: state.phase,
    yourHand: state.hands[playerId] ? { ...state.hands[playerId] } : { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 },
    players: playersSummary,
    resourceDeckCount: state.resourceDeck.length,
    resourceDiscardCount: state.resourceDiscard.length,
    buildingDeckCount: state.buildingDeck.length,
    buildingRow: state.buildingRow.map((c) => ({ ...c })),
    metropolisStack: state.metropolisStack.map((m) => ({ ...m })),
    eventDeckCount: state.eventDeck.length,
    lastEvent,
    longestRouteOwner: state.longestRouteOwner,
    largestArmyOwner: state.largestArmyOwner,
    turnFlags: { ...state.turnFlags },
    tradeOffers: state.tradeOffers.map((o) => ({ ...o })),
    pendingDecisions: state.pendingDecisions.map((d) => ({ ...d })),
    winner: state.winner,
    recentLog: state.log.slice(-30),
  };
}
