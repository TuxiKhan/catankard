import { advanceTurn } from './actions.ts';
import { nextInt, type RngState } from './random.ts';
import type { ActionResult, GameState, Resource } from './types.ts';
import { checkWinCondition } from './victory.ts';

export function handleTick(state: GameState, now: number): ActionResult {
  const newLogStart = state.log.length;

  if (state.phase === 'finished' || state.winner) {
    return { state, newLog: [] };
  }

  // 1. Bekleyen kararların süresini kontrol et
  if (state.phase === 'awaiting_decisions' && state.pendingDecisions.length > 0) {
    const expiredDecisions = state.pendingDecisions.filter((d) => d.deadline <= now);

    for (const dec of expiredDecisions) {
      const rng = state.rng as unknown as RngState;
      const hand = state.hands[dec.playerId]!;

      if (dec.kind === 'robber_discard') {
        // Eldeki kaynaklardan rastgele `dec.count` adet seç ve at
        let remainingToDiscard = dec.count;
        while (remainingToDiscard > 0) {
          const availableRes: Resource[] = [];
          for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
            for (let i = 0; i < hand[r]; i++) {
              availableRes.push(r);
            }
          }
          if (availableRes.length === 0) break;

          const chosenIdx = nextInt(rng, availableRes.length);
          const chosenRes = availableRes[chosenIdx]!;
          hand[chosenRes]--;
          state.resourceDiscard.push(chosenRes);
          remainingToDiscard--;
        }

        state.log.push({
          t: 'auto_choice',
          playerId: dec.playerId,
          decision: 'robber_discard',
        });
        state.log.push({
          t: 'discarded',
          playerId: dec.playerId,
          count: dec.count,
        });
      } else if (dec.kind === 'charity_give') {
        const availableRes: Resource[] = [];
        for (const r of ['brick', 'wood', 'wool', 'wheat', 'ore'] as const) {
          for (let i = 0; i < hand[r]; i++) {
            availableRes.push(r);
          }
        }

        if (availableRes.length > 0 && dec.candidates.length > 0) {
          const chosenRes = availableRes[nextInt(rng, availableRes.length)]!;
          const targetPid = dec.candidates[nextInt(rng, dec.candidates.length)]!;

          hand[chosenRes]--;
          state.hands[targetPid]![chosenRes]++;

          state.log.push({
            t: 'auto_choice',
            playerId: dec.playerId,
            decision: 'charity_give',
          });
          state.log.push({
            t: 'charity',
            from: dec.playerId,
            to: targetPid,
          });
        }
      }

      // Kararı listeden çıkar
      const idx = state.pendingDecisions.indexOf(dec);
      if (idx !== -1) {
        state.pendingDecisions.splice(idx, 1);
      }
    }

    if (state.pendingDecisions.length === 0) {
      state.phase = 'action';
    }

    checkWinCondition(state);
  }

  // 2. Tur süresi aşımı kontrolü (yalnızca action fazında)
  if (
    state.phase === 'action' &&
    state.turnDeadline !== null &&
    state.turnDeadline <= now
  ) {
    const activePid = state.turnOrder[state.activePlayerIndex]!;
    state.log.push({ t: 'turn_timeout', playerId: activePid });

    // Açık takasları iptal et
    for (const o of state.tradeOffers) {
      if (o.status === 'open') o.status = 'cancelled';
    }

    advanceTurn(state, now);
  }

  return {
    state,
    newLog: state.log.slice(newLogStart),
  };
}
