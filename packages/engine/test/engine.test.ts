import { describe, expect, it } from 'vitest';
import {
  applyAction,
  applyTick,
  createGame,
  getPlayerView,
  legalBuilds,
  visibleVP,
  type GameConfig,
} from '../src/index.ts';

const BASE_CONFIG_3P: GameConfig = {
  players: [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ],
  metropolisSide: 'A',
  turnTimerSeconds: 60,
  seed: 'test-seed-12345',
};

describe('Game Engine - Setup & Initialization', () => {
  it('creates a 3-player game correctly', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);

    expect(state.turnOrder).toEqual(['p1', 'p2', 'p3']);
    expect(state.phase).toBe('action');
    expect(state.turnNumber).toBe(1);
    expect(state.turnDeadline).toBe(now + 60000);
    expect(state.buildingRow.length).toBe(5);
    expect(state.metropolisStack.length).toBe(4);

    // Her oyuncunun 1 yolu ve 1 başlangıç köyü olmalı
    for (const pid of ['p1', 'p2', 'p3']) {
      expect(state.areas[pid]!.roads).toBe(1);
      expect(state.areas[pid]!.knights).toBe(0);
      expect(state.areas[pid]!.stacks.length).toBe(1);
      expect(state.areas[pid]!.stacks[0]!.top).toBe('settlement');
      expect(state.areas[pid]!.stacks[0]!.isStarting).toBe(true);

      // Başlangıç eli: Her oyuncuda tam olarak 2 kaynak olmalı (ilk oyuncu doğrudan aksiyon fazıyla başlar)
      const totalRes = Object.values(state.hands[pid]!).reduce((a, b) => a + b, 0);
      expect(totalRes).toBe(2);
    }

    // Başlangıç oyuncusu tespit edilmiş olmalı
    const activePid = state.turnOrder[state.activePlayerIndex]!;
    expect(['p1', 'p2', 'p3']).toContain(activePid);
    expect(visibleVP(state, activePid)).toBe(1);
  });

  it('generates correct PlayerView with masked information', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const view = getPlayerView(state, 'p1');

    expect(view.you).toBe('p1');
    expect(view.yourHand).toEqual(state.hands['p1']);
    expect(view.players['p2']!.handCount).toBe(2);
    // @ts-expect-error - other players hand cards are masked
    expect(view.players['p2']!.hands).toBeUndefined();
    expect(view.buildingRow.length).toBe(5);
  });
});

describe('Game Engine - Trading Mechanics', () => {
  it('allows trade and gives 1 bonus resource card to the trading partner', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;
    const partnerPid = state.turnOrder.find((p) => p !== activePid)!;

    state.hands[activePid] = { brick: 1, wood: 0, wool: 0, wheat: 0, ore: 0 };
    state.hands[partnerPid] = { brick: 0, wood: 1, wool: 0, wheat: 0, ore: 0 };

    // 1. Aktif oyuncu teklif sunar
    applyAction(
      state,
      activePid,
      {
        type: 'propose_trade',
        toPlayerId: partnerPid,
        give: { brick: 1, wood: 0, wool: 0, wheat: 0, ore: 0 },
        want: { brick: 0, wood: 1, wool: 0, wheat: 0, ore: 0 },
      },
      now + 100
    );

    expect(state.tradeOffers.length).toBe(1);
    const offerId = state.tradeOffers[0]!.id;

    // 2. Partner kabul eder
    applyAction(
      state,
      partnerPid,
      { type: 'accept_trade', offerId },
      now + 200
    );

    // Aktif oyuncu: tuğla verdi, odun aldı -> 1 kart
    expect(state.hands[activePid]!.brick).toBe(0);
    expect(state.hands[activePid]!.wood).toBe(1);

    // Partner: odun verdi, tuğla aldı + RESMİ KURAL GEREĞİ DEFTEDEN 1 BONUS KART ÇEKTİ -> 2 kart
    expect(state.hands[partnerPid]!.wood).toBe(0);
    expect(state.hands[partnerPid]!.brick).toBeGreaterThanOrEqual(1);
    const partnerTotal = Object.values(state.hands[partnerPid]!).reduce((a, b) => a + b, 0);
    expect(partnerTotal).toBe(2);

    expect(state.turnFlags.traded).toBe(true);
  });

  it('rejects gifts and same-resource trades', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.hands[activePid] = { brick: 2, wood: 1, wool: 0, wheat: 0, ore: 0 };

    // Hediye takası yasak
    expect(() => {
      applyAction(
        state,
        activePid,
        {
          type: 'propose_trade',
          toPlayerId: null,
          give: { brick: 1, wood: 0, wool: 0, wheat: 0, ore: 0 },
          want: { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 },
        },
        now
      );
    }).toThrow(/Karşılıksız/);

    // Aynı kaynak takası yasak
    expect(() => {
      applyAction(
        state,
        activePid,
        {
          type: 'propose_trade',
          toPlayerId: null,
          give: { brick: 1, wood: 0, wool: 0, wheat: 0, ore: 0 },
          want: { brick: 1, wood: 0, wool: 0, wheat: 0, ore: 0 },
        },
        now
      );
    }).toThrow(/Aynı kaynak türü/);
  });
});

describe('Game Engine - Building & Upgrades', () => {
  it('builds a road and awards Longest Route at 3 roads', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.buildingRow[0] = { id: 'bld-road-test-1', type: 'road' };
    state.buildingRow[1] = { id: 'bld-road-test-2', type: 'road' };

    state.hands[activePid] = { brick: 2, wood: 2, wool: 0, wheat: 0, ore: 0 };

    // 1. Yol
    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-road-test-1' } },
      now
    );
    expect(state.areas[activePid]!.roads).toBe(2);
    expect(state.longestRouteOwner).toBeNull();

    // 2. Yol
    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-road-test-2' } },
      now
    );
    expect(state.areas[activePid]!.roads).toBe(3);
    expect(state.longestRouteOwner).toBe(activePid);
    expect(visibleVP(state, activePid)).toBe(3);
  });

  it('builds a knight and awards Largest Army at 2 knights', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.buildingRow[0] = { id: 'bld-knight-1', type: 'knight' };
    state.buildingRow[1] = { id: 'bld-knight-2', type: 'knight' };
    state.hands[activePid] = { brick: 0, wood: 0, wool: 2, wheat: 2, ore: 2 };

    // 1. Şövalye
    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-knight-1' } },
      now
    );
    expect(state.areas[activePid]!.knights).toBe(1);
    expect(state.largestArmyOwner).toBeNull();

    // 2. Şövalye
    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-knight-2' } },
      now
    );
    expect(state.areas[activePid]!.knights).toBe(2);
    expect(state.largestArmyOwner).toBe(activePid);
    expect(visibleVP(state, activePid)).toBe(3);
  });

  it('builds a city on top of a settlement, increasing VP and Harvest yield', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;
    const stackId = state.areas[activePid]!.stacks[0]!.id;

    state.buildingRow[0] = { id: 'bld-city-test', type: 'city' };
    state.hands[activePid] = { brick: 0, wood: 0, wool: 0, wheat: 2, ore: 3 };

    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-city-test', onStackId: stackId } },
      now
    );

    expect(state.areas[activePid]!.stacks[0]!.top).toBe('city');
    expect(visibleVP(state, activePid)).toBe(2);
  });

  it('supports road substitution ratio (3 roads -> 2:1)', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.areas[activePid]!.roads = 3;
    state.buildingRow[0] = { id: 'bld-city-test', type: 'city' };
    state.hands[activePid] = { brick: 0, wood: 0, wool: 2, wheat: 1, ore: 3 };
    const stackId = state.areas[activePid]!.stacks[0]!.id;

    applyAction(
      state,
      activePid,
      {
        type: 'build',
        target: { source: 'row', cardId: 'bld-city-test', onStackId: stackId },
        substitution: { pay: 'wool', replace: 'wheat' },
      },
      now
    );

    expect(state.areas[activePid]!.stacks[0]!.top).toBe('city');
    expect(state.hands[activePid]!.wool).toBe(0);
    expect(state.hands[activePid]!.wheat).toBe(0);
    expect(state.hands[activePid]!.ore).toBe(0);
  });

  it('replaces card in building row in-place at the exact slot when built', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    const c0 = { id: 'slot-0', type: 'road' as const };
    const c1 = { id: 'slot-1', type: 'road' as const };
    const c2 = { id: 'slot-2', type: 'road' as const };
    const c3 = { id: 'slot-3', type: 'road' as const };
    const c4 = { id: 'slot-4', type: 'road' as const };
    state.buildingRow = [c0, c1, c2, c3, c4];

    const nextDeckCard = { id: 'new-deck-card', type: 'knight' as const };
    state.buildingDeck.push(nextDeckCard);

    state.hands[activePid] = { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 };

    // Slot 2 deki karti insa et
    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'slot-2' } },
      now
    );

    // Slot 0, 1, 3, 4 yerini korumali; Slot 2 yeni deste karti ile doldurulmali
    expect(state.buildingRow.length).toBe(5);
    expect(state.buildingRow[0]!.id).toBe('slot-0');
    expect(state.buildingRow[1]!.id).toBe('slot-1');
    expect(state.buildingRow[2]!.id).toBe('new-deck-card');
    expect(state.buildingRow[3]!.id).toBe('slot-3');
    expect(state.buildingRow[4]!.id).toBe('slot-4');
  });

  it('splices card when building row card is built and deck is empty', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.buildingRow = [
      { id: 's-0', type: 'road' },
      { id: 's-1', type: 'road' },
      { id: 's-2', type: 'knight' },
    ];
    state.buildingDeck = [];
    state.hands[activePid] = { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 };

    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 's-1' } },
      now
    );

    expect(state.buildingRow.length).toBe(2);
    expect(state.buildingRow[0]!.id).toBe('s-0');
    expect(state.buildingRow[1]!.id).toBe('s-2');
  });

  it('handles Metropolis B tiebreakers and triggers', () => {
    const now = 1000;
    const configB: GameConfig = { ...BASE_CONFIG_3P, metropolisSide: 'B' };
    const state = createGame(configB, now);
    const p1 = 'p1';
    const p2 = 'p2';

    // p2 has 3 roads and Longest Route
    state.areas[p2]!.roads = 3;
    state.longestRouteOwner = p2;

    // p1 has 3 roads and builds Metropolis B (longest_route tiebreaker)
    state.areas[p1]!.roads = 3;
    state.areas[p1]!.stacks[0]!.top = 'city';
    state.hands[p1] = { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 };
    state.activePlayerIndex = 0; // p1 active

    const metroCard = state.metropolisStack.find((m) => m.kind === 'longest_route')!;

    applyAction(
      state,
      p1,
      {
        type: 'build',
        target: { source: 'metropolis', cardId: metroCard.id, onStackId: state.areas[p1]!.stacks[0]!.id },
      },
      now
    );

    // Eşitlik durumunda Longest Route tiebreaker sayesinde p1 kartı devralır!
    expect(state.longestRouteOwner).toBe(p1);
  });
});

describe('Game Engine - Events & Decision Timing', () => {
  it('triggers Robber event and requires players with > 7 cards to discard half', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;
    const otherPid = state.turnOrder.find((p) => p !== activePid)!;

    state.hands[otherPid] = { brick: 8, wood: 0, wool: 0, wheat: 0, ore: 0 };
    state.buildingRow[0] = { id: 'bld-settlement-test', type: 'settlement' };
    state.hands[activePid] = { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 };
    state.eventDeck.push({ id: 'evt-robber-test', kind: 'robber' });

    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-settlement-test' } },
      now
    );

    expect(state.phase).toBe('awaiting_decisions');
    expect(state.pendingDecisions.length).toBe(1);
    const dec = state.pendingDecisions[0]!;
    expect(dec.kind).toBe('robber_discard');
    expect(dec.playerId).toBe(otherPid);
    expect((dec as any).count).toBe(4);

    applyAction(
      state,
      otherPid,
      {
        type: 'discard',
        decisionId: dec.id,
        cards: { brick: 4, wood: 0, wool: 0, wheat: 0, ore: 0 },
      },
      now + 100
    );

    expect(state.hands[otherPid]!.brick).toBe(4);
    expect(state.phase).toBe('action');
    expect(state.pendingDecisions.length).toBe(0);
  });

  it('triggers Solstice event and reshuffles all event cards', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.buildingRow[0] = { id: 'bld-settlement-test-solstice', type: 'settlement' };
    state.hands[activePid] = { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 };
    state.eventDiscard = [{ id: 'evt-discarded-1', kind: 'robber' }];
    state.eventDeck.push({ id: 'evt-solstice-test', kind: 'solstice' });

    applyAction(
      state,
      activePid,
      { type: 'build', target: { source: 'row', cardId: 'bld-settlement-test-solstice' } },
      now
    );

    // Solstice sonrasında olay ıskartası boşalır ve tüm olaylar desteye döner
    expect(state.eventDiscard.length).toBe(0);
    expect(state.eventDeck.length).toBeGreaterThan(0);
  });

  it('triggers Charity event correctly', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const p1 = 'p1';
    const p2 = 'p2';
    const p3 = 'p3';

    // p1 has 2 VP (city), p2 has 1 VP, p3 has 1 VP
    state.areas[p1]!.stacks[0]!.top = 'city';
    state.hands[p1] = { brick: 2, wood: 1, wool: 1, wheat: 1, ore: 1 };
    state.activePlayerIndex = 0; // p1 active

    state.buildingRow[0] = { id: 'bld-settlement-charity', type: 'settlement' };
    state.eventDeck.push({ id: 'evt-charity-test', kind: 'charity' });

    applyAction(
      state,
      p1,
      { type: 'build', target: { source: 'row', cardId: 'bld-settlement-charity' } },
      now
    );

    expect(state.phase).toBe('awaiting_decisions');
    const charityDec = state.pendingDecisions.find((d) => d.kind === 'charity_give')!;
    expect(charityDec.playerId).toBe(p1);
    expect(charityDec.candidates).toContain('p2');
    expect(charityDec.candidates).toContain('p3');

    // p1 gives 1 brick to p2
    const p2InitialBrick = state.hands[p2]!.brick;
    applyAction(
      state,
      p1,
      {
        type: 'charity_give',
        decisionId: charityDec.id,
        toPlayerId: p2,
        resource: 'brick',
      },
      now + 200
    );

    expect(state.hands[p2]!.brick).toBe(p2InitialBrick + 1);
    expect(state.phase).toBe('action');
  });

  it('auto-resolves expired decisions on tick', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.hands[activePid] = { brick: 10, wood: 0, wool: 0, wheat: 0, ore: 0 };
    state.pendingDecisions.push({
      id: 'dec-auto-test',
      kind: 'robber_discard',
      playerId: activePid,
      count: 5,
      deadline: now + 15000,
    });
    state.phase = 'awaiting_decisions';

    applyTick(state, now + 16000);

    expect(state.phase).toBe('action');
    expect(state.pendingDecisions.length).toBe(0);
    expect(state.hands[activePid]!.brick).toBe(5);
  });
});

describe('Game Engine - Victory Conditions & Game Over', () => {
  it('ends game immediately when active player reaches 7 VPs on their turn', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    // Aktif oyuncuya 2 şehir (4 ZP) + En Uzun Yol (2 ZP) verelim = 6 ZP
    state.areas[activePid]!.stacks[0]!.top = 'city';
    state.areas[activePid]!.stacks.push({ id: 's2', top: 'city', isStarting: false });
    state.areas[activePid]!.roads = 3;
    state.longestRouteOwner = activePid;

    expect(visibleVP(state, activePid)).toBe(6);

    state.metropolisStack = [{ id: 'metro-test', side: 'A' }];
    state.hands[activePid] = { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 };

    applyAction(
      state,
      activePid,
      {
        type: 'build',
        target: { source: 'metropolis', cardId: 'metro-test', onStackId: 's2' },
      },
      now
    );

    expect(visibleVP(state, activePid)).toBe(7);
    expect(state.winner).toBe(activePid);
    expect(state.phase).toBe('finished');
  });

  it('calculates legalBuilds correctly for UI', () => {
    const now = 1000;
    const state = createGame(BASE_CONFIG_3P, now);
    const activePid = state.turnOrder[state.activePlayerIndex]!;

    state.buildingRow[0] = { id: 'r1', type: 'road' };
    state.hands[activePid] = { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 };

    const builds = legalBuilds(state, activePid);
    expect(builds.length).toBeGreaterThan(0);
    expect(builds.some((b) => b.cardId === 'r1')).toBe(true);
  });
});
