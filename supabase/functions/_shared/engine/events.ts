import { totalResourceCount } from './cards.ts';
import { nextInt, shuffle, type RngState } from './random.ts';
import type {
  EventCard,
  EventKind,
  GameState,
  PendingDecision,
  PlayerId,
  Resource,
} from './types.ts';
import { DECISION_TIMEOUT_MS } from './types.ts';
import { calculateVisibleVP } from './victory.ts';

/** Desteden 1 kaynak çeker. Deste boşsa ıskartayı karıştırıp yeni deste yapar. */
export function drawResourceCard(state: GameState): Resource | null {
  if (state.resourceDeck.length === 0) {
    if (state.resourceDiscard.length === 0) {
      return null; // Hem deste hem ıskarta boş
    }
    // Iskartayı karıştır ve desteye aktar
    const rng = state.rng as unknown as RngState;
    state.resourceDeck = shuffle(rng, [...state.resourceDiscard]);
    state.resourceDiscard = [];
  }
  return state.resourceDeck.pop() ?? null;
}

/** Bir oyuncuya N adet kaynak kartı verir. */
export function giveResourcesToPlayer(state: GameState, playerId: PlayerId, count: number): number {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const card = drawResourceCard(state);
    if (!card) break;
    state.hands[playerId]![card]++;
    drawn++;
  }
  return drawn;
}

/** Bir olay kartını çeker ve çözümler. */
export function drawAndResolveEvent(state: GameState, now: number): EventKind | null {
  // Olay destesi boşsa ıskartayı karıştır
  if (state.eventDeck.length === 0) {
    if (state.eventDiscard.length === 0) {
      return null;
    }
    const rng = state.rng as unknown as RngState;
    state.eventDeck = shuffle(rng, [...state.eventDiscard]);
    state.eventDiscard = [];
  }

  const eventCard = state.eventDeck.pop();
  if (!eventCard) return null;

  state.log.push({ t: 'event', kind: eventCard.kind });
  resolveEvent(state, eventCard, now);
  return eventCard.kind;
}

/** Olay kartının mantığını işletir. */
export function resolveEvent(state: GameState, eventCard: EventCard, now: number): void {
  const activePlayers = state.turnOrder.filter((pid) => !state.removedPlayers.includes(pid));
  const activePid = state.turnOrder[state.activePlayerIndex]!;

  switch (eventCard.kind) {
    case 'robber': {
      // Hırsız: (7 + şövalye) limitinden fazla kartı olanlar yarısını (aşağı yuvarla) atar
      const decisions: PendingDecision[] = [];
      for (const pid of activePlayers) {
        const knights = state.areas[pid]?.knights ?? 0;
        const limit = 7 + knights;
        const total = totalResourceCount(state.hands[pid]!);
        if (total > limit) {
          const discardCount = Math.floor(total / 2);
          if (discardCount > 0) {
            decisions.push({
              id: `dec-robber-${pid}-${now}-${decisions.length}`,
              kind: 'robber_discard',
              playerId: pid,
              count: discardCount,
              deadline: now + DECISION_TIMEOUT_MS,
            });
          }
        }
      }

      state.eventDiscard.push(eventCard);

      if (decisions.length > 0) {
        state.pendingDecisions.push(...decisions);
        state.phase = 'awaiting_decisions';
      }
      break;
    }

    case 'solstice': {
      // Yeni Yıl: Her oyuncu 1 kaynak çeker, ardından tüm olay kartları karıştırılıp yeni deste yapılır
      const startIdx = state.turnOrder.indexOf(activePid);
      for (let i = 0; i < state.turnOrder.length; i++) {
        const pid = state.turnOrder[(startIdx + i) % state.turnOrder.length]!;
        if (!state.removedPlayers.includes(pid)) {
          giveResourcesToPlayer(state, pid, 1);
        }
      }

      // Solstice kartı + ıskarta + destedeki kartlar hepsi birleşip karıştırılır
      const allEvents: EventCard[] = [
        eventCard,
        ...state.eventDiscard,
        ...state.eventDeck,
      ];
      state.eventDiscard = [];
      const rng = state.rng as unknown as RngState;
      state.eventDeck = shuffle(rng, allEvents);
      break;
    }

    case 'abundance': {
      // Bolluk / Teşvik: En Uzun Yol ve En Güçlü Ordu sahipleri hariç herkes 2 kaynak çeker
      for (const pid of activePlayers) {
        const isBonusHolder =
          state.longestRouteOwner === pid || state.largestArmyOwner === pid;
        if (!isBonusHolder) {
          giveResourcesToPlayer(state, pid, 2);
        }
      }
      state.eventDiscard.push(eventCard);
      break;
    }

    case 'subsidy': {
      // Hasat Kutlaması: Açık her Köy için 1 kaynak çeker (Şehirler sayılmaz)
      for (const pid of activePlayers) {
        const area = state.areas[pid];
        if (!area) continue;
        let count = 0;
        for (const stack of area.stacks) {
          if (stack.top === 'settlement') {
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

    case 'charity': {
      // Sadaka: En çok ZP'li oyuncu(lar), kendisinden az ZP'li bir oyuncuya 1 kaynak verir.
      // Herkes eşitse hiçbir şey olmaz.
      const vps = activePlayers.map((pid) => ({
        pid,
        vp: calculateVisibleVP(state, pid),
        resources: totalResourceCount(state.hands[pid]!),
      }));

      const maxVp = Math.max(...vps.map((v) => v.vp));
      const minVp = Math.min(...vps.map((v) => v.vp));

      state.eventDiscard.push(eventCard);

      if (maxVp === minVp) {
        // Herkesin puanı eşit, hiçbir şey olmaz
        break;
      }

      const topPlayers = vps.filter((v) => v.vp === maxVp && v.resources > 0);
      const decisions: PendingDecision[] = [];

      for (const top of topPlayers) {
        const candidates = vps
          .filter((v) => v.vp < top.vp)
          .map((v) => v.pid);

        if (candidates.length > 0) {
          decisions.push({
            id: `dec-charity-${top.pid}-${now}-${decisions.length}`,
            kind: 'charity_give',
            playerId: top.pid,
            candidates,
            deadline: now + DECISION_TIMEOUT_MS,
          });
        }
      }

      if (decisions.length > 0) {
        state.pendingDecisions.push(...decisions);
        state.phase = 'awaiting_decisions';
      }
      break;
    }
  }
}
