import {
  BUILDING_COSTS,
  createEmptyResources,
  totalResourceCount,
} from './cards.ts';
import { drawAndResolveEvent, giveResourcesToPlayer } from './events.ts';
import { executeHarvestPhase } from './harvest.ts';
import { nextInt, shuffle, type RngState } from './random.ts';
import type {
  Action,
  ActionResult,
  BuildTarget,
  GameState,
  IllegalMoveError,
  PlayerId,
  Resource,
  ResourceCounts,
  TradeOffer,
} from './types.ts';
import { checkWinCondition, updateBonusCards } from './victory.ts';

export class EngineIllegalMoveError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'IllegalMoveError';
  }
}

/** Oyuncunun sahip olduğu yol sayısına göre ikame takas oranını verir (1 road->4, 2->3, 3->2, 4+->1) */
export function getRoadSubstitutionRatio(roads: number): number {
  if (roads <= 1) return 4;
  if (roads === 2) return 3;
  if (roads === 3) return 2;
  return 1;
}

/** Oyuncunun inşaat için geçerli tüm hamlelerini hesaplar. */
export function getLegalBuilds(state: GameState, playerId: PlayerId): BuildTarget[] {
  if (state.phase !== 'action') return [];
  const activePid = state.turnOrder[state.activePlayerIndex];
  if (activePid !== playerId) return [];

  const area = state.areas[playerId];
  if (!area) return [];

  const targets: BuildTarget[] = [];
  const hand = state.hands[playerId]!;
  const roads = area.roads;
  const ratio = getRoadSubstitutionRatio(roads);
  const subUsed = state.turnFlags.roadSubstitutionUsed;

  // 1. Building row kartları
  for (const card of state.buildingRow) {
    if (card.type === 'city') {
      // Şehir için açık bir köy şart
      const openSettlementStacks = area.stacks.filter((s) => s.top === 'settlement');
      for (const stack of openSettlementStacks) {
        if (canAffordBuild(hand, 'city', ratio, subUsed)) {
          targets.push({ source: 'row', cardId: card.id, onStackId: stack.id });
        }
      }
    } else {
      if (canAffordBuild(hand, card.type, ratio, subUsed)) {
        targets.push({ source: 'row', cardId: card.id });
      }
    }
  }

  // 2. Büyükşehir kartları
  if (state.metropolisStack.length > 0) {
    const openCityStacks = area.stacks.filter((s) => s.top === 'city');
    for (const stack of openCityStacks) {
      if (canAffordBuild(hand, 'metropolis', ratio, subUsed)) {
        for (const metro of state.metropolisStack) {
          targets.push({ source: 'metropolis', cardId: metro.id, onStackId: stack.id });
        }
        break; // İlk uygun şehir yığını ve mevcut metropoller yeterli
      }
    }
  }

  return targets;
}

/** Bir kartın maliyetinin normal veya yol ikamesiyle ödenip ödenemeyeceğini kontrol eder. */
function canAffordBuild(
  hand: ResourceCounts,
  type: keyof typeof BUILDING_COSTS,
  ratio: number,
  subUsed: boolean
): boolean {
  const baseCost = BUILDING_COSTS[type];
  const missing: Resource[] = [];
  let directAfford = true;

  for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
    if (hand[r] < baseCost[r]) {
      directAfford = false;
      for (let i = 0; i < baseCost[r] - hand[r]; i++) {
        missing.push(r);
      }
    }
  }

  if (directAfford) return true;
  if (subUsed) return false;

  // Sadece 1 eksik kaynak yol ikamesiyle kapatılabilir
  if (missing.length !== 1) return false;

  const needed = missing[0]!;
  // Hand'de baseCost ödendikten sonra kalan kaynaklardan herhangi biri >= ratio mu?
  for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
    if (r === needed) continue;
    const surplus = hand[r] - baseCost[r];
    if (surplus >= ratio) {
      return true;
    }
  }

  return false;
}

/** Building row'daki 5 kart da aynıysa desteye geri karıştırıp yenilerini açar. */
export function checkAndReshuffleBuildingRow(state: GameState): boolean {
  if (state.buildingRow.length < 5) return false;

  const firstType = state.buildingRow[0]!.type;
  const allSame = state.buildingRow.every((c) => c.type === firstType);
  if (!allSame) return false;

  const rng = state.rng as unknown as RngState;
  state.buildingDeck.push(...state.buildingRow);
  state.buildingRow = [];
  state.buildingDeck = shuffle(rng, state.buildingDeck);

  while (state.buildingRow.length < 5 && state.buildingDeck.length > 0) {
    state.buildingRow.push(state.buildingDeck.pop()!);
  }

  state.log.push({ t: 'row_reshuffled' });
  return true;
}

export function handleAction(
  state: GameState,
  actor: PlayerId,
  action: Action,
  now: number
): ActionResult {
  const newLogStart = state.log.length;

  if (state.phase === 'finished' || state.winner) {
    throw new EngineIllegalMoveError('GAME_FINISHED', 'Oyun sona ermiştir.');
  }

  if (state.removedPlayers.includes(actor)) {
    throw new EngineIllegalMoveError('PLAYER_REMOVED', 'Oyundan çıkarılmış bir oyuncu hamle yapamaz.');
  }

  const activePid = state.turnOrder[state.activePlayerIndex]!;

  switch (action.type) {
    case 'propose_trade': {
      if (state.phase !== 'action') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Yalnızca aksiyon fazında takas teklif edilebilir.');
      }
      if (state.turnFlags.traded) {
        throw new EngineIllegalMoveError('ALREADY_TRADED', 'Bu tur zaten bir takas gerçekleştirildi.');
      }

      const giveTotal = totalResourceCount(action.give);
      const wantTotal = totalResourceCount(action.want);
      if (giveTotal === 0 || wantTotal === 0) {
        throw new EngineIllegalMoveError('ZERO_TRADE', 'Karşılıksız kart takası (hediye) yasaktır.');
      }

      // Aynı tür kaynakların birbirine takası yasak
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        if (action.give[r] > 0 && action.want[r] > 0) {
          throw new EngineIllegalMoveError('SAME_RESOURCE_TRADE', 'Aynı kaynak türü birbiriyle takas edilemez.');
        }
      }

      // Teklifi yapanın elinde yeterli kaynak var mı?
      const hand = state.hands[actor]!;
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        if (hand[r] < action.give[r]) {
          throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', `Elinizde teklif ettiğiniz kadar ${r} yok.`);
        }
      }

      // Teklif ya aktif oyuncu tarafından herkese/birine yapılır ya da pasif oyuncu tarafından aktif oyuncuya yapılır
      if (actor !== activePid && (action.toPlayerId ?? activePid) !== activePid) {
        throw new EngineIllegalMoveError('INVALID_TARGET', 'Pasif oyuncular yalnızca aktif oyuncuya teklif verebilir.');
      }

      const offer: TradeOffer = {
        id: `offer-${actor}-${now}-${state.tradeOffers.length}`,
        fromPlayerId: actor,
        toPlayerId: actor !== activePid ? (action.toPlayerId ?? activePid) : action.toPlayerId,
        give: { ...action.give },
        want: { ...action.want },
        status: 'open',
      };
      state.tradeOffers.push(offer);
      break;
    }

    case 'accept_trade': {
      if (state.phase !== 'action') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Yalnızca aksiyon fazında takas kabul edilebilir.');
      }
      if (state.turnFlags.traded) {
        throw new EngineIllegalMoveError('ALREADY_TRADED', 'Bu tur zaten bir takas gerçekleştirildi.');
      }

      const offer = state.tradeOffers.find((o) => o.id === action.offerId && o.status === 'open');
      if (!offer) {
        throw new EngineIllegalMoveError('OFFER_NOT_FOUND', 'Açık takas teklifi bulunamadı.');
      }

      // Kabul eden oyuncu geçerli mi?
      if (offer.toPlayerId && offer.toPlayerId !== actor) {
        throw new EngineIllegalMoveError('UNAUTHORIZED', 'Bu teklif size yapılmadı.');
      }
      if (offer.fromPlayerId === actor) {
        throw new EngineIllegalMoveError('SELF_TRADE', 'Kendi teklifinizi kabul edemezsiniz.');
      }

      // İki taraftan en az biri aktif oyuncu olmalı
      if (offer.fromPlayerId !== activePid && actor !== activePid) {
        throw new EngineIllegalMoveError('ACTIVE_PLAYER_REQUIRED', 'Takas taraflarından biri aktif oyuncu olmalıdır.');
      }

      // Kaynak kontrolleri
      const fromHand = state.hands[offer.fromPlayerId]!;
      const toHand = state.hands[actor]!;

      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        if (fromHand[r] < offer.give[r]) {
          throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', 'Teklifi yapanın elinde artık yeterli kaynak yok.');
        }
        if (toHand[r] < offer.want[r]) {
          throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', 'Elinizde teklifi karşılayacak kadar kaynak yok.');
        }
      }

      // Transferi gerçekleştir
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        fromHand[r] -= offer.give[r];
        toHand[r] += offer.give[r];

        toHand[r] -= offer.want[r];
        fromHand[r] += offer.want[r];
      }

      // RESMİ KURAL: Aktif oyuncuyla takas yapan diğer oyuncu (pasif partner) desteden 1 bonus kaynak çeker!
      const tradingPartner = offer.fromPlayerId === activePid ? actor : offer.fromPlayerId;
      giveResourcesToPlayer(state, tradingPartner, 1);

      offer.status = 'accepted';
      state.turnFlags.traded = true;

      // Diğer tüm açık teklifleri iptal et
      for (const o of state.tradeOffers) {
        if (o.status === 'open') o.status = 'cancelled';
      }

      state.log.push({
        t: 'trade_done',
        a: offer.fromPlayerId,
        b: actor,
        aGave: offer.give,
        bGave: offer.want,
      });
      break;
    }

    case 'cancel_trade': {
      const offer = state.tradeOffers.find((o) => o.id === action.offerId && o.status === 'open');
      if (!offer) {
        throw new EngineIllegalMoveError('OFFER_NOT_FOUND', 'Açık teklif bulunamadı.');
      }
      if (offer.fromPlayerId !== actor && actor !== activePid) {
        throw new EngineIllegalMoveError('UNAUTHORIZED', 'Yalnızca teklif sahibi veya aktif oyuncu iptal edebilir.');
      }
      offer.status = 'cancelled';
      break;
    }

    case 'build': {
      if (state.phase !== 'action') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Yalnızca aksiyon fazında inşaat yapılabilir.');
      }
      if (actor !== activePid) {
        throw new EngineIllegalMoveError('NOT_YOUR_TURN', 'Yalnızca aktif oyuncu inşaat yapabilir.');
      }

      const area = state.areas[actor]!;
      const hand = state.hands[actor]!;
      const { target, substitution } = action;

      let cardType: keyof typeof BUILDING_COSTS;
      let cardToBuild: any;

      if (target.source === 'row') {
        const cardIndex = state.buildingRow.findIndex((c) => c.id === target.cardId);
        if (cardIndex === -1) {
          throw new EngineIllegalMoveError('CARD_NOT_IN_ROW', 'Kart inşa sırasından bulunamadı.');
        }
        cardToBuild = state.buildingRow[cardIndex]!;
        cardType = cardToBuild.type;
      } else {
        const metroIndex = state.metropolisStack.findIndex((m) => m.id === target.cardId);
        if (metroIndex === -1) {
          throw new EngineIllegalMoveError('METROPOLIS_NOT_AVAILABLE', 'Büyükşehir destesinde kart kalmadı.');
        }
        cardToBuild = state.metropolisStack[metroIndex]!;
        cardType = 'metropolis';
      }

      // Önkoşul kontrolleri
      if (cardType === 'city') {
        if (!target.onStackId) {
          throw new EngineIllegalMoveError('STACK_REQUIRED', 'Şehir inşa etmek için hedef köy belirtilmelidir.');
        }
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        if (!stack || stack.top !== 'settlement') {
          throw new EngineIllegalMoveError('INVALID_STACK', 'Şehir yalnızca açık bir köyün üzerine kurulabilir.');
        }
      } else if (cardType === 'metropolis') {
        if (!target.onStackId) {
          throw new EngineIllegalMoveError('STACK_REQUIRED', 'Büyükşehir için hedef şehir belirtilmelidir.');
        }
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        if (!stack || stack.top !== 'city') {
          throw new EngineIllegalMoveError('INVALID_STACK', 'Büyükşehir yalnızca açık bir şehrin üzerine kurulabilir.');
        }
      }

      // Maliyet hesaplama ve ödeme
      const cost = { ...BUILDING_COSTS[cardType] };

      if (substitution) {
        if (state.turnFlags.roadSubstitutionUsed) {
          throw new EngineIllegalMoveError('SUBSTITUTION_ALREADY_USED', 'Yol ikamesi turda yalnızca 1 kez kullanılabilir.');
        }
        const ratio = getRoadSubstitutionRatio(area.roads);
        if (substitution.pay === substitution.replace) {
          throw new EngineIllegalMoveError('INVALID_SUBSTITUTION', 'Aynı kaynak ikame edilemez.');
        }
        if (cost[substitution.replace] <= 0) {
          throw new EngineIllegalMoveError('INVALID_SUBSTITUTION', 'İkame edilen kaynak kartın maliyetinde yok.');
        }

        cost[substitution.replace] -= 1;
        cost[substitution.pay] += ratio;
        state.turnFlags.roadSubstitutionUsed = true;
      }

      // Kaynak yeterlilik kontrolü
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        if (hand[r] < cost[r]) {
          throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', `İnşaat için yeterli ${r} yok.`);
        }
      }

      // Kaynakları düş ve ıskartaya at
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        hand[r] -= cost[r];
        for (let i = 0; i < cost[r]; i++) {
          state.resourceDiscard.push(r);
        }
      }

      // Kartı yerleştir
      if (cardType === 'road') {
        area.roads++;
      } else if (cardType === 'knight') {
        area.knights++;
      } else if (cardType === 'settlement') {
        area.stacks.push({
          id: `stack-${actor}-${Date.now()}-${area.stacks.length}`,
          top: 'settlement',
          isStarting: false,
        });
      } else if (cardType === 'city') {
        const stack = area.stacks.find((s) => s.id === target.onStackId)!;
        stack.top = 'city';
      } else if (cardType === 'metropolis') {
        const stack = area.stacks.find((s) => s.id === target.onStackId)!;
        stack.top = 'metropolis';
        stack.metropolis = cardToBuild;
      }

      // Kaynaktan çıkar veya yerine yenisini aç (in-place replacement)
      if (target.source === 'row') {
        const cardIndex = state.buildingRow.findIndex((c) => c.id === target.cardId);
        if (state.buildingDeck.length > 0) {
          state.buildingRow[cardIndex] = state.buildingDeck.pop()!;
        } else {
          state.buildingRow.splice(cardIndex, 1);
        }
      } else {
        const metroIndex = state.metropolisStack.findIndex((m) => m.id === target.cardId);
        state.metropolisStack.splice(metroIndex, 1);
      }

      state.log.push({
        t: 'built',
        playerId: actor,
        card: cardType,
        cardId: target.cardId,
      });

      // Metropolis B tetiklemeleri
      if (cardType === 'metropolis' && cardToBuild.side === 'B') {
        if (cardToBuild.kind === 'knights') {
          giveResourcesToPlayer(state, actor, area.knights);
        } else if (cardToBuild.kind === 'roads') {
          giveResourcesToPlayer(state, actor, area.roads);
        }
      }

      // KÖY İNŞA EDİLİRSE: Anında olay kartı çek ve çöz
      if (cardType === 'settlement') {
        drawAndResolveEvent(state, now);
      }

      // Building row kontrolü
      if (target.source === 'row') {
        checkAndReshuffleBuildingRow(state);
      }

      // Bonus kartları ve zafer kontrolü
      updateBonusCards(state);
      checkWinCondition(state);
      break;
    }

    case 'discard': {
      if (state.phase !== 'awaiting_decisions') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Şu an karar bekleme fazında değilsiniz.');
      }

      const decIndex = state.pendingDecisions.findIndex(
        (d) => d.id === action.decisionId && d.playerId === actor && d.kind === 'robber_discard'
      );
      if (decIndex === -1) {
        throw new EngineIllegalMoveError('DECISION_NOT_FOUND', 'Geçerli hırsız kart atma kararı bulunamadı.');
      }

      const decision = state.pendingDecisions[decIndex]! as { id: string; kind: 'robber_discard'; playerId: PlayerId; count: number };
      const discardTotal = totalResourceCount(action.cards);
      if (discardTotal !== decision.count) {
        throw new EngineIllegalMoveError('INVALID_DISCARD_COUNT', `Tam olarak ${decision.count} kart atmalısınız.`);
      }

      const hand = state.hands[actor]!;
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        if (hand[r] < action.cards[r]) {
          throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', `Elinizde bu kadar ${r} yok.`);
        }
      }

      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        hand[r] -= action.cards[r];
        for (let i = 0; i < action.cards[r]; i++) {
          state.resourceDiscard.push(r);
        }
      }

      state.pendingDecisions.splice(decIndex, 1);
      state.log.push({ t: 'discarded', playerId: actor, count: decision.count });

      if (state.pendingDecisions.length === 0) {
        state.phase = 'action';
      }
      checkWinCondition(state);
      break;
    }

    case 'charity_give': {
      if (state.phase !== 'awaiting_decisions') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Şu an karar bekleme fazında değilsiniz.');
      }

      const decIndex = state.pendingDecisions.findIndex(
        (d) => d.id === action.decisionId && d.playerId === actor && d.kind === 'charity_give'
      );
      if (decIndex === -1) {
        throw new EngineIllegalMoveError('DECISION_NOT_FOUND', 'Geçerli sadaka kararı bulunamadı.');
      }

      const decision = state.pendingDecisions[decIndex]! as { id: string; kind: 'charity_give'; playerId: PlayerId; candidates: PlayerId[] };
      if (!decision.candidates.includes(action.toPlayerId)) {
        throw new EngineIllegalMoveError('INVALID_RECIPIENT', 'Bu oyuncu sadaka alabilecek adaylar arasında değil.');
      }

      const hand = state.hands[actor]!;
      if (hand[action.resource] <= 0) {
        throw new EngineIllegalMoveError('INSUFFICIENT_RESOURCES', `Elinizde verilecek ${action.resource} yok.`);
      }

      hand[action.resource]--;
      state.hands[action.toPlayerId]![action.resource]++;

      state.pendingDecisions.splice(decIndex, 1);
      state.log.push({ t: 'charity', from: actor, to: action.toPlayerId });

      if (state.pendingDecisions.length === 0) {
        state.phase = 'action';
      }
      checkWinCondition(state);
      break;
    }

    case 'end_turn': {
      if (state.phase !== 'action') {
        throw new EngineIllegalMoveError('INVALID_PHASE', 'Bekleyen kararlar varken tur bitirilemez.');
      }
      if (actor !== activePid) {
        throw new EngineIllegalMoveError('NOT_YOUR_TURN', 'Yalnızca aktif oyuncu turunu bitirebilir.');
      }

      // Açık teklifleri iptal et
      for (const o of state.tradeOffers) {
        if (o.status === 'open') o.status = 'cancelled';
      }

      // Sıradaki aktif oyuncuya geç
      advanceTurn(state, now);
      break;
    }

    case 'remove_player': {
      const target = action.playerId;
      if (!state.turnOrder.includes(target) || state.removedPlayers.includes(target)) {
        throw new EngineIllegalMoveError('PLAYER_NOT_ACTIVE', 'Geçersiz veya zaten çıkarılmış oyuncu.');
      }

      state.removedPlayers.push(target);
      // Elindeki kaynakları ıskartaya at
      const hand = state.hands[target]!;
      for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
        for (let i = 0; i < hand[r]; i++) {
          state.resourceDiscard.push(r);
        }
        hand[r] = 0;
      }

      // Önündeki alan temizlenir
      state.areas[target] = { roads: 0, knights: 0, stacks: [] };

      // Bekleyen kararlarından çıkar
      state.pendingDecisions = state.pendingDecisions.filter((d) => d.playerId !== target);
      if (state.pendingDecisions.length === 0 && state.phase === 'awaiting_decisions') {
        state.phase = 'action';
      }

      state.log.push({ t: 'player_removed', playerId: target });
      updateBonusCards(state);

      // Kalan oyuncu sayısı kontrolü
      const remaining = state.turnOrder.filter((pid) => !state.removedPlayers.includes(pid));
      if (remaining.length <= 1) {
        state.winner = remaining[0] ?? null;
        state.phase = 'finished';
        if (state.winner) {
          state.log.push({ t: 'game_won', playerId: state.winner });
        }
        break;
      }

      // Eğer çıkarılan oyuncu aktif oyuncuysa turu ilerlet
      if (target === activePid) {
        advanceTurn(state, now);
      }
      break;
    }
  }

  return {
    state,
    newLog: state.log.slice(newLogStart),
  };
}

/** Turu bir sonraki aktif oyuncuya geçirir ve Hasat fazını icra eder. */
export function advanceTurn(state: GameState, now: number): void {
  let nextIdx = (state.activePlayerIndex + 1) % state.turnOrder.length;
  while (state.removedPlayers.includes(state.turnOrder[nextIdx]!)) {
    nextIdx = (nextIdx + 1) % state.turnOrder.length;
  }

  state.activePlayerIndex = nextIdx;
  state.turnNumber++;
  state.turnFlags = { traded: false, roadSubstitutionUsed: false };

  if (state.config.turnTimerSeconds) {
    state.turnDeadline = now + state.config.turnTimerSeconds * 1000;
  } else {
    state.turnDeadline = null;
  }

  const newActive = state.turnOrder[nextIdx]!;
  state.log.push({ t: 'turn_started', playerId: newActive });

  // Hasat Fazı
  executeHarvestPhase(state);
  checkWinCondition(state);
}
