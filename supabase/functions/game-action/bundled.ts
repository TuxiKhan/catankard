// supabase/functions/game-action/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// supabase/functions/_shared/engine/cards.ts
var EMPTY_RESOURCES = Object.freeze({
  brick: 0,
  wood: 0,
  wool: 0,
  wheat: 0,
  ore: 0
});
function totalResourceCount(res) {
  return res.brick + res.wood + res.wool + res.wheat + res.ore;
}
var BUILDING_COSTS = {
  road: { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 },
  knight: { brick: 0, wood: 0, wool: 1, wheat: 1, ore: 1 },
  settlement: { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 },
  city: { brick: 0, wood: 0, wool: 0, wheat: 2, ore: 3 },
  metropolis: { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 }
};

// supabase/functions/_shared/engine/random.ts
function nextRandom(rng) {
  rng.seed = rng.seed + 1831565813 | 0;
  let t = Math.imul(rng.seed ^ rng.seed >>> 15, 1 | rng.seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function nextInt(rng, maxExclusive) {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextRandom(rng) * maxExclusive);
}
function shuffle(rng, array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

// supabase/functions/_shared/engine/types.ts
var DECISION_TIMEOUT_MS = 15e3;

// supabase/functions/_shared/engine/victory.ts
function calculateVisibleVP(state, playerId) {
  const area = state.areas[playerId];
  if (!area) return 0;
  let vp = 0;
  for (const stack of area.stacks) {
    if (stack.top === "settlement") {
      vp += 1;
    } else if (stack.top === "city") {
      vp += 2;
    } else if (stack.top === "metropolis") {
      vp += 3;
    }
  }
  if (state.longestRouteOwner === playerId) {
    vp += 2;
  }
  if (state.largestArmyOwner === playerId) {
    vp += 2;
  }
  return vp;
}
function hasLongestRouteTiebreaker(state, playerId) {
  const area = state.areas[playerId];
  if (!area) return false;
  return area.stacks.some(
    (s) => s.top === "metropolis" && s.metropolis?.kind === "longest_route"
  );
}
function hasLargestArmyTiebreaker(state, playerId) {
  const area = state.areas[playerId];
  if (!area) return false;
  return area.stacks.some(
    (s) => s.top === "metropolis" && s.metropolis?.kind === "largest_army"
  );
}
function updateBonusCards(state) {
  const activePlayers = state.turnOrder.filter(
    (pid) => !state.removedPlayers.includes(pid)
  );
  const currentRoadOwner = state.longestRouteOwner;
  const currentOwnerRoads = currentRoadOwner && !state.removedPlayers.includes(currentRoadOwner) ? state.areas[currentRoadOwner]?.roads ?? 0 : 0;
  let bestRoadPlayer = currentOwnerRoads >= 3 ? currentRoadOwner : null;
  let maxRoads = currentOwnerRoads >= 3 ? currentOwnerRoads : 2;
  if (!bestRoadPlayer) {
    maxRoads = 2;
    for (const pid of activePlayers) {
      const roads = state.areas[pid]?.roads ?? 0;
      if (roads > maxRoads) {
        maxRoads = roads;
        bestRoadPlayer = pid;
      }
    }
  } else {
    for (const pid of activePlayers) {
      if (pid === currentRoadOwner) continue;
      const roads = state.areas[pid]?.roads ?? 0;
      if (roads < 3) continue;
      const tiebreaker = hasLongestRouteTiebreaker(state, pid);
      if (roads > maxRoads || roads === maxRoads && tiebreaker && !hasLongestRouteTiebreaker(state, currentRoadOwner)) {
        maxRoads = roads;
        bestRoadPlayer = pid;
      }
    }
  }
  if (bestRoadPlayer !== state.longestRouteOwner) {
    const prev = state.longestRouteOwner;
    state.longestRouteOwner = bestRoadPlayer;
    if (bestRoadPlayer) {
      state.log.push({
        t: "bonus_moved",
        bonus: "longest_route",
        to: bestRoadPlayer,
        from: prev
      });
    }
  }
  const currentArmyOwner = state.largestArmyOwner;
  const currentOwnerKnights = currentArmyOwner && !state.removedPlayers.includes(currentArmyOwner) ? state.areas[currentArmyOwner]?.knights ?? 0 : 0;
  let bestArmyPlayer = currentOwnerKnights >= 2 ? currentArmyOwner : null;
  let maxKnights = currentOwnerKnights >= 2 ? currentOwnerKnights : 1;
  if (!bestArmyPlayer) {
    maxKnights = 1;
    for (const pid of activePlayers) {
      const knights = state.areas[pid]?.knights ?? 0;
      if (knights > maxKnights) {
        maxKnights = knights;
        bestArmyPlayer = pid;
      }
    }
  } else {
    for (const pid of activePlayers) {
      if (pid === currentArmyOwner) continue;
      const knights = state.areas[pid]?.knights ?? 0;
      if (knights < 2) continue;
      const tiebreaker = hasLargestArmyTiebreaker(state, pid);
      if (knights > maxKnights || knights === maxKnights && tiebreaker && !hasLargestArmyTiebreaker(state, currentArmyOwner)) {
        maxKnights = knights;
        bestArmyPlayer = pid;
      }
    }
  }
  if (bestArmyPlayer !== state.largestArmyOwner) {
    const prev = state.largestArmyOwner;
    state.largestArmyOwner = bestArmyPlayer;
    if (bestArmyPlayer) {
      state.log.push({
        t: "bonus_moved",
        bonus: "largest_army",
        to: bestArmyPlayer,
        from: prev
      });
    }
  }
}
function checkWinCondition(state) {
  if (state.phase === "finished" || state.winner) return true;
  const activePid = state.turnOrder[state.activePlayerIndex];
  if (!activePid || state.removedPlayers.includes(activePid)) return false;
  const vp = calculateVisibleVP(state, activePid);
  if (vp >= 7) {
    state.winner = activePid;
    state.phase = "finished";
    state.log.push({ t: "game_won", playerId: activePid });
    return true;
  }
  return false;
}

// supabase/functions/_shared/engine/events.ts
function drawResourceCard(state) {
  if (state.resourceDeck.length === 0) {
    if (state.resourceDiscard.length === 0) {
      return null;
    }
    const rng = state.rng;
    state.resourceDeck = shuffle(rng, [...state.resourceDiscard]);
    state.resourceDiscard = [];
  }
  return state.resourceDeck.pop() ?? null;
}
function giveResourcesToPlayer(state, playerId, count) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const card = drawResourceCard(state);
    if (!card) break;
    state.hands[playerId][card]++;
    drawn++;
  }
  return drawn;
}
function drawAndResolveEvent(state, now) {
  if (state.eventDeck.length === 0) {
    if (state.eventDiscard.length === 0) {
      return null;
    }
    const rng = state.rng;
    state.eventDeck = shuffle(rng, [...state.eventDiscard]);
    state.eventDiscard = [];
  }
  const eventCard = state.eventDeck.pop();
  if (!eventCard) return null;
  state.log.push({ t: "event", kind: eventCard.kind });
  resolveEvent(state, eventCard, now);
  return eventCard.kind;
}
function resolveEvent(state, eventCard, now) {
  const activePlayers = state.turnOrder.filter((pid) => !state.removedPlayers.includes(pid));
  const activePid = state.turnOrder[state.activePlayerIndex];
  switch (eventCard.kind) {
    case "robber": {
      const decisions = [];
      for (const pid of activePlayers) {
        const knights = state.areas[pid]?.knights ?? 0;
        const limit = 7 + knights;
        const total = totalResourceCount(state.hands[pid]);
        if (total > limit) {
          const discardCount = Math.floor(total / 2);
          if (discardCount > 0) {
            decisions.push({
              id: `dec-robber-${pid}-${now}-${decisions.length}`,
              kind: "robber_discard",
              playerId: pid,
              count: discardCount,
              deadline: now + DECISION_TIMEOUT_MS
            });
          }
        }
      }
      state.eventDiscard.push(eventCard);
      if (decisions.length > 0) {
        state.pendingDecisions.push(...decisions);
        state.phase = "awaiting_decisions";
      }
      break;
    }
    case "solstice": {
      const startIdx = state.turnOrder.indexOf(activePid);
      for (let i = 0; i < state.turnOrder.length; i++) {
        const pid = state.turnOrder[(startIdx + i) % state.turnOrder.length];
        if (!state.removedPlayers.includes(pid)) {
          giveResourcesToPlayer(state, pid, 1);
        }
      }
      const allEvents = [
        eventCard,
        ...state.eventDiscard,
        ...state.eventDeck
      ];
      state.eventDiscard = [];
      const rng = state.rng;
      state.eventDeck = shuffle(rng, allEvents);
      break;
    }
    case "abundance": {
      for (const pid of activePlayers) {
        const isBonusHolder = state.longestRouteOwner === pid || state.largestArmyOwner === pid;
        if (!isBonusHolder) {
          giveResourcesToPlayer(state, pid, 2);
        }
      }
      state.eventDiscard.push(eventCard);
      break;
    }
    case "subsidy": {
      for (const pid of activePlayers) {
        const area = state.areas[pid];
        if (!area) continue;
        let count = 0;
        for (const stack of area.stacks) {
          if (stack.top === "settlement") {
            count++;
          }
        }
        if (count > 0) {
          giveResourcesToPlayer(state, pid, count);
        }
      }
      state.eventDiscard.push(eventCard);
      break;
    }
    case "charity": {
      const vps = activePlayers.map((pid) => ({
        pid,
        vp: calculateVisibleVP(state, pid),
        resources: totalResourceCount(state.hands[pid])
      }));
      const maxVp = Math.max(...vps.map((v) => v.vp));
      const minVp = Math.min(...vps.map((v) => v.vp));
      state.eventDiscard.push(eventCard);
      if (maxVp === minVp) {
        break;
      }
      const topPlayers = vps.filter((v) => v.vp === maxVp && v.resources > 0);
      const decisions = [];
      for (const top of topPlayers) {
        const candidates = vps.filter((v) => v.vp < top.vp).map((v) => v.pid);
        if (candidates.length > 0) {
          decisions.push({
            id: `dec-charity-${top.pid}-${now}-${decisions.length}`,
            kind: "charity_give",
            playerId: top.pid,
            candidates,
            deadline: now + DECISION_TIMEOUT_MS
          });
        }
      }
      if (decisions.length > 0) {
        state.pendingDecisions.push(...decisions);
        state.phase = "awaiting_decisions";
      }
      break;
    }
  }
}

// supabase/functions/_shared/engine/harvest.ts
function executeHarvestPhase(state) {
  const activePid = state.turnOrder[state.activePlayerIndex];
  const draws = {};
  const activePlayers = state.turnOrder.filter(
    (pid) => !state.removedPlayers.includes(pid)
  );
  const startIdx = state.turnOrder.indexOf(activePid);
  for (let i = 0; i < state.turnOrder.length; i++) {
    const pid = state.turnOrder[(startIdx + i) % state.turnOrder.length];
    if (!state.removedPlayers.includes(pid)) {
      const drawn = giveResourcesToPlayer(state, pid, 1);
      draws[pid] = (draws[pid] ?? 0) + drawn;
    }
  }
  const activeArea = state.areas[activePid];
  if (activeArea) {
    let extraCards = 0;
    for (const stack of activeArea.stacks) {
      if (stack.top === "city") {
        extraCards += 1;
      } else if (stack.top === "metropolis") {
        if (stack.metropolis?.side === "A") {
          extraCards += 2;
        } else if (stack.metropolis?.side === "B") {
          extraCards += 1;
        }
      }
    }
    if (extraCards > 0) {
      const extraDrawn = giveResourcesToPlayer(state, activePid, extraCards);
      draws[activePid] = (draws[activePid] ?? 0) + extraDrawn;
    }
  }
  state.log.push({ t: "harvest", draws });
  return draws;
}

// supabase/functions/_shared/engine/actions.ts
var EngineIllegalMoveError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "IllegalMoveError";
  }
};
function getRoadSubstitutionRatio(roads) {
  if (roads <= 1) return 4;
  if (roads === 2) return 3;
  if (roads === 3) return 2;
  return 1;
}
function checkAndReshuffleBuildingRow(state) {
  if (state.buildingRow.length < 5) return false;
  const firstType = state.buildingRow[0].type;
  const allSame = state.buildingRow.every((c) => c.type === firstType);
  if (!allSame) return false;
  const rng = state.rng;
  state.buildingDeck.push(...state.buildingRow);
  state.buildingRow = [];
  state.buildingDeck = shuffle(rng, state.buildingDeck);
  while (state.buildingRow.length < 5 && state.buildingDeck.length > 0) {
    state.buildingRow.push(state.buildingDeck.pop());
  }
  state.log.push({ t: "row_reshuffled" });
  return true;
}
function handleAction(state, actor, action, now) {
  const newLogStart = state.log.length;
  if (state.phase === "finished" || state.winner) {
    throw new EngineIllegalMoveError("GAME_FINISHED", "Oyun sona ermi\u015Ftir.");
  }
  if (state.removedPlayers.includes(actor)) {
    throw new EngineIllegalMoveError("PLAYER_REMOVED", "Oyundan \xE7\u0131kar\u0131lm\u0131\u015F bir oyuncu hamle yapamaz.");
  }
  const activePid = state.turnOrder[state.activePlayerIndex];
  switch (action.type) {
    case "propose_trade": {
      if (state.phase !== "action") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "Yaln\u0131zca aksiyon faz\u0131nda takas teklif edilebilir.");
      }
      if (state.turnFlags.traded) {
        throw new EngineIllegalMoveError("ALREADY_TRADED", "Bu tur zaten bir takas ger\xE7ekle\u015Ftirildi.");
      }
      const giveTotal = totalResourceCount(action.give);
      const wantTotal = totalResourceCount(action.want);
      if (giveTotal === 0 || wantTotal === 0) {
        throw new EngineIllegalMoveError("ZERO_TRADE", "Kar\u015F\u0131l\u0131ks\u0131z kart takas\u0131 (hediye) yasakt\u0131r.");
      }
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        if (action.give[r] > 0 && action.want[r] > 0) {
          throw new EngineIllegalMoveError("SAME_RESOURCE_TRADE", "Ayn\u0131 kaynak t\xFCr\xFC birbiriyle takas edilemez.");
        }
      }
      const hand = state.hands[actor];
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        if (hand[r] < action.give[r]) {
          throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", `Elinizde teklif etti\u011Finiz kadar ${r} yok.`);
        }
      }
      if (actor !== activePid && action.toPlayerId !== activePid) {
        throw new EngineIllegalMoveError("INVALID_TARGET", "Pasif oyuncular yaln\u0131zca aktif oyuncuya teklif verebilir.");
      }
      const offer = {
        id: `offer-${actor}-${now}-${state.tradeOffers.length}`,
        fromPlayerId: actor,
        toPlayerId: action.toPlayerId,
        give: { ...action.give },
        want: { ...action.want },
        status: "open"
      };
      state.tradeOffers.push(offer);
      break;
    }
    case "accept_trade": {
      if (state.phase !== "action") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "Yaln\u0131zca aksiyon faz\u0131nda takas kabul edilebilir.");
      }
      if (state.turnFlags.traded) {
        throw new EngineIllegalMoveError("ALREADY_TRADED", "Bu tur zaten bir takas ger\xE7ekle\u015Ftirildi.");
      }
      const offer = state.tradeOffers.find((o) => o.id === action.offerId && o.status === "open");
      if (!offer) {
        throw new EngineIllegalMoveError("OFFER_NOT_FOUND", "A\xE7\u0131k takas teklifi bulunamad\u0131.");
      }
      if (offer.toPlayerId && offer.toPlayerId !== actor) {
        throw new EngineIllegalMoveError("UNAUTHORIZED", "Bu teklif size yap\u0131lmad\u0131.");
      }
      if (offer.fromPlayerId === actor) {
        throw new EngineIllegalMoveError("SELF_TRADE", "Kendi teklifinizi kabul edemezsiniz.");
      }
      if (offer.fromPlayerId !== activePid && actor !== activePid) {
        throw new EngineIllegalMoveError("ACTIVE_PLAYER_REQUIRED", "Takas taraflar\u0131ndan biri aktif oyuncu olmal\u0131d\u0131r.");
      }
      const fromHand = state.hands[offer.fromPlayerId];
      const toHand = state.hands[actor];
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        if (fromHand[r] < offer.give[r]) {
          throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", "Teklifi yapan\u0131n elinde art\u0131k yeterli kaynak yok.");
        }
        if (toHand[r] < offer.want[r]) {
          throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", "Elinizde teklifi kar\u015F\u0131layacak kadar kaynak yok.");
        }
      }
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        fromHand[r] -= offer.give[r];
        toHand[r] += offer.give[r];
        toHand[r] -= offer.want[r];
        fromHand[r] += offer.want[r];
      }
      const tradingPartner = offer.fromPlayerId === activePid ? actor : offer.fromPlayerId;
      giveResourcesToPlayer(state, tradingPartner, 1);
      offer.status = "accepted";
      state.turnFlags.traded = true;
      for (const o of state.tradeOffers) {
        if (o.status === "open") o.status = "cancelled";
      }
      state.log.push({
        t: "trade_done",
        a: offer.fromPlayerId,
        b: actor,
        aGave: offer.give,
        bGave: offer.want
      });
      break;
    }
    case "cancel_trade": {
      const offer = state.tradeOffers.find((o) => o.id === action.offerId && o.status === "open");
      if (!offer) {
        throw new EngineIllegalMoveError("OFFER_NOT_FOUND", "A\xE7\u0131k teklif bulunamad\u0131.");
      }
      if (offer.fromPlayerId !== actor && actor !== activePid) {
        throw new EngineIllegalMoveError("UNAUTHORIZED", "Yaln\u0131zca teklif sahibi veya aktif oyuncu iptal edebilir.");
      }
      offer.status = "cancelled";
      break;
    }
    case "build": {
      if (state.phase !== "action") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "Yaln\u0131zca aksiyon faz\u0131nda in\u015Faat yap\u0131labilir.");
      }
      if (actor !== activePid) {
        throw new EngineIllegalMoveError("NOT_YOUR_TURN", "Yaln\u0131zca aktif oyuncu in\u015Faat yapabilir.");
      }
      const area = state.areas[actor];
      const hand = state.hands[actor];
      const { target, substitution } = action;
      let cardType;
      let cardToBuild;
      if (target.source === "row") {
        const cardIndex = state.buildingRow.findIndex((c) => c.id === target.cardId);
        if (cardIndex === -1) {
          throw new EngineIllegalMoveError("CARD_NOT_IN_ROW", "Kart in\u015Fa s\u0131ras\u0131ndan bulunamad\u0131.");
        }
        cardToBuild = state.buildingRow[cardIndex];
        cardType = cardToBuild.type;
      } else {
        const metroIndex = state.metropolisStack.findIndex((m) => m.id === target.cardId);
        if (metroIndex === -1) {
          throw new EngineIllegalMoveError("METROPOLIS_NOT_AVAILABLE", "B\xFCy\xFCk\u015Fehir destesinde kart kalmad\u0131.");
        }
        cardToBuild = state.metropolisStack[metroIndex];
        cardType = "metropolis";
      }
      if (cardType === "city") {
        if (!target.onStackId) {
          throw new EngineIllegalMoveError("STACK_REQUIRED", "\u015Eehir in\u015Fa etmek i\xE7in hedef k\xF6y belirtilmelidir.");
        }
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        if (!stack || stack.top !== "settlement") {
          throw new EngineIllegalMoveError("INVALID_STACK", "\u015Eehir yaln\u0131zca a\xE7\u0131k bir k\xF6y\xFCn \xFCzerine kurulabilir.");
        }
      } else if (cardType === "metropolis") {
        if (!target.onStackId) {
          throw new EngineIllegalMoveError("STACK_REQUIRED", "B\xFCy\xFCk\u015Fehir i\xE7in hedef \u015Fehir belirtilmelidir.");
        }
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        if (!stack || stack.top !== "city") {
          throw new EngineIllegalMoveError("INVALID_STACK", "B\xFCy\xFCk\u015Fehir yaln\u0131zca a\xE7\u0131k bir \u015Fehrin \xFCzerine kurulabilir.");
        }
      }
      const cost = { ...BUILDING_COSTS[cardType] };
      if (substitution) {
        if (state.turnFlags.roadSubstitutionUsed) {
          throw new EngineIllegalMoveError("SUBSTITUTION_ALREADY_USED", "Yol ikamesi turda yaln\u0131zca 1 kez kullan\u0131labilir.");
        }
        const ratio = getRoadSubstitutionRatio(area.roads);
        if (substitution.pay === substitution.replace) {
          throw new EngineIllegalMoveError("INVALID_SUBSTITUTION", "Ayn\u0131 kaynak ikame edilemez.");
        }
        if (cost[substitution.replace] <= 0) {
          throw new EngineIllegalMoveError("INVALID_SUBSTITUTION", "\u0130kame edilen kaynak kart\u0131n maliyetinde yok.");
        }
        cost[substitution.replace] -= 1;
        cost[substitution.pay] += ratio;
        state.turnFlags.roadSubstitutionUsed = true;
      }
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        if (hand[r] < cost[r]) {
          throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", `\u0130n\u015Faat i\xE7in yeterli ${r} yok.`);
        }
      }
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        hand[r] -= cost[r];
        for (let i = 0; i < cost[r]; i++) {
          state.resourceDiscard.push(r);
        }
      }
      if (cardType === "road") {
        area.roads++;
      } else if (cardType === "knight") {
        area.knights++;
      } else if (cardType === "settlement") {
        area.stacks.push({
          id: `stack-${actor}-${Date.now()}-${area.stacks.length}`,
          top: "settlement",
          isStarting: false
        });
      } else if (cardType === "city") {
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        stack.top = "city";
      } else if (cardType === "metropolis") {
        const stack = area.stacks.find((s) => s.id === target.onStackId);
        stack.top = "metropolis";
        stack.metropolis = cardToBuild;
      }
      if (target.source === "row") {
        const cardIndex = state.buildingRow.findIndex((c) => c.id === target.cardId);
        if (state.buildingDeck.length > 0) {
          state.buildingRow[cardIndex] = state.buildingDeck.pop();
        } else {
          state.buildingRow.splice(cardIndex, 1);
        }
      } else {
        const metroIndex = state.metropolisStack.findIndex((m) => m.id === target.cardId);
        state.metropolisStack.splice(metroIndex, 1);
      }
      state.log.push({
        t: "built",
        playerId: actor,
        card: cardType,
        cardId: target.cardId
      });
      if (cardType === "metropolis" && cardToBuild.side === "B") {
        if (cardToBuild.kind === "knights") {
          giveResourcesToPlayer(state, actor, area.knights);
        } else if (cardToBuild.kind === "roads") {
          giveResourcesToPlayer(state, actor, area.roads);
        }
      }
      if (cardType === "settlement") {
        drawAndResolveEvent(state, now);
      }
      if (target.source === "row") {
        checkAndReshuffleBuildingRow(state);
      }
      updateBonusCards(state);
      checkWinCondition(state);
      break;
    }
    case "discard": {
      if (state.phase !== "awaiting_decisions") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "\u015Eu an karar bekleme faz\u0131nda de\u011Filsiniz.");
      }
      const decIndex = state.pendingDecisions.findIndex(
        (d) => d.id === action.decisionId && d.playerId === actor && d.kind === "robber_discard"
      );
      if (decIndex === -1) {
        throw new EngineIllegalMoveError("DECISION_NOT_FOUND", "Ge\xE7erli h\u0131rs\u0131z kart atma karar\u0131 bulunamad\u0131.");
      }
      const decision = state.pendingDecisions[decIndex];
      const discardTotal = totalResourceCount(action.cards);
      if (discardTotal !== decision.count) {
        throw new EngineIllegalMoveError("INVALID_DISCARD_COUNT", `Tam olarak ${decision.count} kart atmal\u0131s\u0131n\u0131z.`);
      }
      const hand = state.hands[actor];
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        if (hand[r] < action.cards[r]) {
          throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", `Elinizde bu kadar ${r} yok.`);
        }
      }
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        hand[r] -= action.cards[r];
        for (let i = 0; i < action.cards[r]; i++) {
          state.resourceDiscard.push(r);
        }
      }
      state.pendingDecisions.splice(decIndex, 1);
      state.log.push({ t: "discarded", playerId: actor, count: decision.count });
      if (state.pendingDecisions.length === 0) {
        state.phase = "action";
      }
      checkWinCondition(state);
      break;
    }
    case "charity_give": {
      if (state.phase !== "awaiting_decisions") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "\u015Eu an karar bekleme faz\u0131nda de\u011Filsiniz.");
      }
      const decIndex = state.pendingDecisions.findIndex(
        (d) => d.id === action.decisionId && d.playerId === actor && d.kind === "charity_give"
      );
      if (decIndex === -1) {
        throw new EngineIllegalMoveError("DECISION_NOT_FOUND", "Ge\xE7erli sadaka karar\u0131 bulunamad\u0131.");
      }
      const decision = state.pendingDecisions[decIndex];
      if (!decision.candidates.includes(action.toPlayerId)) {
        throw new EngineIllegalMoveError("INVALID_RECIPIENT", "Bu oyuncu sadaka alabilecek adaylar aras\u0131nda de\u011Fil.");
      }
      const hand = state.hands[actor];
      if (hand[action.resource] <= 0) {
        throw new EngineIllegalMoveError("INSUFFICIENT_RESOURCES", `Elinizde verilecek ${action.resource} yok.`);
      }
      hand[action.resource]--;
      state.hands[action.toPlayerId][action.resource]++;
      state.pendingDecisions.splice(decIndex, 1);
      state.log.push({ t: "charity", from: actor, to: action.toPlayerId });
      if (state.pendingDecisions.length === 0) {
        state.phase = "action";
      }
      checkWinCondition(state);
      break;
    }
    case "end_turn": {
      if (state.phase !== "action") {
        throw new EngineIllegalMoveError("INVALID_PHASE", "Bekleyen kararlar varken tur bitirilemez.");
      }
      if (actor !== activePid) {
        throw new EngineIllegalMoveError("NOT_YOUR_TURN", "Yaln\u0131zca aktif oyuncu turunu bitirebilir.");
      }
      for (const o of state.tradeOffers) {
        if (o.status === "open") o.status = "cancelled";
      }
      advanceTurn(state, now);
      break;
    }
    case "remove_player": {
      const target = action.playerId;
      if (!state.turnOrder.includes(target) || state.removedPlayers.includes(target)) {
        throw new EngineIllegalMoveError("PLAYER_NOT_ACTIVE", "Ge\xE7ersiz veya zaten \xE7\u0131kar\u0131lm\u0131\u015F oyuncu.");
      }
      state.removedPlayers.push(target);
      const hand = state.hands[target];
      for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
        for (let i = 0; i < hand[r]; i++) {
          state.resourceDiscard.push(r);
        }
        hand[r] = 0;
      }
      state.areas[target] = { roads: 0, knights: 0, stacks: [] };
      state.pendingDecisions = state.pendingDecisions.filter((d) => d.playerId !== target);
      if (state.pendingDecisions.length === 0 && state.phase === "awaiting_decisions") {
        state.phase = "action";
      }
      state.log.push({ t: "player_removed", playerId: target });
      updateBonusCards(state);
      const remaining = state.turnOrder.filter((pid) => !state.removedPlayers.includes(pid));
      if (remaining.length <= 1) {
        state.winner = remaining[0] ?? null;
        state.phase = "finished";
        if (state.winner) {
          state.log.push({ t: "game_won", playerId: state.winner });
        }
        break;
      }
      if (target === activePid) {
        advanceTurn(state, now);
      }
      break;
    }
  }
  return {
    state,
    newLog: state.log.slice(newLogStart)
  };
}
function advanceTurn(state, now) {
  let nextIdx = (state.activePlayerIndex + 1) % state.turnOrder.length;
  while (state.removedPlayers.includes(state.turnOrder[nextIdx])) {
    nextIdx = (nextIdx + 1) % state.turnOrder.length;
  }
  state.activePlayerIndex = nextIdx;
  state.turnNumber++;
  state.turnFlags = { traded: false, roadSubstitutionUsed: false };
  if (state.config.turnTimerSeconds) {
    state.turnDeadline = now + state.config.turnTimerSeconds * 1e3;
  } else {
    state.turnDeadline = null;
  }
  const newActive = state.turnOrder[nextIdx];
  state.log.push({ t: "turn_started", playerId: newActive });
  executeHarvestPhase(state);
  checkWinCondition(state);
}

// supabase/functions/_shared/engine/tick.ts
function handleTick(state, now) {
  const newLogStart = state.log.length;
  if (state.phase === "finished" || state.winner) {
    return { state, newLog: [] };
  }
  if (state.phase === "awaiting_decisions" && state.pendingDecisions.length > 0) {
    const expiredDecisions = state.pendingDecisions.filter((d) => d.deadline <= now);
    for (const dec of expiredDecisions) {
      const rng = state.rng;
      const hand = state.hands[dec.playerId];
      if (dec.kind === "robber_discard") {
        let remainingToDiscard = dec.count;
        while (remainingToDiscard > 0) {
          const availableRes = [];
          for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
            for (let i = 0; i < hand[r]; i++) {
              availableRes.push(r);
            }
          }
          if (availableRes.length === 0) break;
          const chosenIdx = nextInt(rng, availableRes.length);
          const chosenRes = availableRes[chosenIdx];
          hand[chosenRes]--;
          state.resourceDiscard.push(chosenRes);
          remainingToDiscard--;
        }
        state.log.push({
          t: "auto_choice",
          playerId: dec.playerId,
          decision: "robber_discard"
        });
        state.log.push({
          t: "discarded",
          playerId: dec.playerId,
          count: dec.count
        });
      } else if (dec.kind === "charity_give") {
        const availableRes = [];
        for (const r of ["brick", "wood", "wool", "wheat", "ore"]) {
          for (let i = 0; i < hand[r]; i++) {
            availableRes.push(r);
          }
        }
        if (availableRes.length > 0 && dec.candidates.length > 0) {
          const chosenRes = availableRes[nextInt(rng, availableRes.length)];
          const targetPid = dec.candidates[nextInt(rng, dec.candidates.length)];
          hand[chosenRes]--;
          state.hands[targetPid][chosenRes]++;
          state.log.push({
            t: "auto_choice",
            playerId: dec.playerId,
            decision: "charity_give"
          });
          state.log.push({
            t: "charity",
            from: dec.playerId,
            to: targetPid
          });
        }
      }
      const idx = state.pendingDecisions.indexOf(dec);
      if (idx !== -1) {
        state.pendingDecisions.splice(idx, 1);
      }
    }
    if (state.pendingDecisions.length === 0) {
      state.phase = "action";
    }
    checkWinCondition(state);
  }
  if (state.phase === "action" && state.turnDeadline !== null && state.turnDeadline <= now) {
    const activePid = state.turnOrder[state.activePlayerIndex];
    state.log.push({ t: "turn_timeout", playerId: activePid });
    for (const o of state.tradeOffers) {
      if (o.status === "open") o.status = "cancelled";
    }
    advanceTurn(state, now);
  }
  return {
    state,
    newLog: state.log.slice(newLogStart)
  };
}

// supabase/functions/_shared/engine/view.ts
function createPlayerView(state, playerId) {
  const activePlayerId = state.turnOrder[state.activePlayerIndex] ?? "";
  const playersSummary = {};
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
      removed
    };
  }
  let lastEvent = null;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i];
    if (entry && entry.t === "event") {
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
    recentLog: state.log.slice(-30)
  };
}

// supabase/functions/_shared/engine/index.ts
function applyAction(state, actor, action, now) {
  return handleAction(state, actor, action, now);
}
function applyTick(state, now) {
  return handleTick(state, now);
}
function getPlayerView(state, playerId) {
  return createPlayerView(state, playerId);
}

// supabase/functions/game-action/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-player-id"
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    const headerPlayerId = req.headers.get("x-player-id");
    const body = await req.json();
    let userId = null;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""));
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch {
      }
    }
    if (!userId) {
      userId = headerPlayerId || body.playerId;
    }
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, code: "UNAUTHORIZED", message: "Oyuncu kimli\u011Fi eksik." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { roomId, action, tick } = body;
    if (!roomId) {
      return new Response(JSON.stringify({ ok: false, code: "MISSING_ROOM_ID", message: "roomId belirtilmelidir." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const now = Date.now();
    await supabase.from("room_players").update({ last_seen_at: new Date(now).toISOString() }).eq("room_id", roomId).eq("user_id", userId);
    const { data: row, error: fetchErr } = await supabase.from("game_states").select("*").eq("room_id", roomId).single();
    if (fetchErr || !row) {
      return new Response(JSON.stringify({ ok: false, code: "GAME_NOT_FOUND", message: "Oyun durumu bulunamad\u0131." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const currentState = row.state;
    const currentVersion = row.version;
    const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    let isHostOffline = false;
    if (room) {
      const { data: hostPlayer } = await supabase.from("room_players").select("last_seen_at").eq("room_id", roomId).eq("user_id", room.created_by).maybeSingle();
      const hostLastSeen = hostPlayer ? new Date(hostPlayer.last_seen_at).getTime() : 0;
      isHostOffline = !hostPlayer || now - hostLastSeen > 6e4;
    }
    let result;
    if (tick) {
      result = applyTick(currentState, now);
    } else if (action) {
      if (action.type === "remove_player") {
        const isHost = room?.created_by === userId;
        if (!isHost && !isHostOffline) {
          return new Response(JSON.stringify({
            ok: false,
            code: "UNAUTHORIZED",
            message: "Yaln\u0131zca kurucu oyundan oyuncu atabilir."
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        const { data: targetPlayer } = await supabase.from("room_players").select("last_seen_at").eq("room_id", roomId).eq("user_id", action.playerId).maybeSingle();
        if (targetPlayer) {
          const lastSeen = new Date(targetPlayer.last_seen_at).getTime();
          if (now - lastSeen < 6e4) {
            return new Response(JSON.stringify({
              ok: false,
              code: "PLAYER_NOT_DISCONNECTED",
              message: "Oyuncu son 1 dakika i\xE7inde aktifti, hen\xFCz oyundan at\u0131lamaz."
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }
      }
      result = applyAction(currentState, userId, action, now);
    } else {
      return new Response(JSON.stringify({ ok: false, code: "INVALID_REQUEST", message: "action veya tick parametresi gereklidir." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const nextState = result.state;
    const { data: updatedRow, error: updateErr } = await supabase.from("game_states").update({
      state: nextState,
      version: currentVersion + 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("room_id", roomId).eq("version", currentVersion).select().maybeSingle();
    if (updateErr || !updatedRow) {
      return new Response(JSON.stringify({
        ok: false,
        code: "CONCURRENCY_CONFLICT",
        message: "Ayn\u0131 anda ba\u015Fka bir hamle yap\u0131ld\u0131, l\xFCtfen tekrar deneyin."
      }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (action?.type === "remove_player" && room) {
      const removedId = action.playerId;
      if (removedId === room.created_by || isHostOffline) {
        const { data: remainingPlayers } = await supabase.from("room_players").select("*").eq("room_id", roomId).neq("user_id", removedId).order("seat_index", { ascending: true });
        const nextHost = (remainingPlayers ?? []).find(
          (p) => p.user_id !== room.created_by && now - new Date(p.last_seen_at).getTime() <= 6e4
        ) ?? (remainingPlayers ?? []).find((p) => p.user_id !== removedId);
        if (nextHost && nextHost.user_id !== room.created_by) {
          await supabase.from("rooms").update({ created_by: nextHost.user_id }).eq("id", roomId);
          await supabase.from("room_players").update({ is_host: false }).eq("room_id", roomId).eq("user_id", room.created_by);
          await supabase.from("room_players").update({ is_host: true }).eq("room_id", roomId).eq("user_id", nextHost.user_id);
        }
      }
    }
    for (const pid of nextState.turnOrder) {
      const view = getPlayerView(nextState, pid);
      await supabase.from("player_views").upsert({
        room_id: roomId,
        user_id: pid,
        view,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    if (nextState.phase === "finished" && nextState.winner) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", roomId);
    }
    const callerUserView = getPlayerView(nextState, userId);
    return new Response(JSON.stringify({ ok: true, view: callerUserView }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    const isIllegal = err.name === "IllegalMoveError" || err.code;
    return new Response(JSON.stringify({
      ok: false,
      code: err.code || "ACTION_ERROR",
      message: err.message
    }), {
      status: isIllegal ? 400 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
