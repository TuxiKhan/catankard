import { giveResourcesToPlayer } from './events.ts';
import type { GameState, PlayerId } from './types.ts';

/** Hasat Fazı: Her oyuncu 1 kart çeker; aktif oyuncu şehir ve büyükşehir ek bonuslarını çeker. */
export function executeHarvestPhase(state: GameState): Record<PlayerId, number> {
  const activePid = state.turnOrder[state.activePlayerIndex]!;
  const draws: Record<PlayerId, number> = {};

  const activePlayers = state.turnOrder.filter(
    (pid) => !state.removedPlayers.includes(pid)
  );

  // 1. Her aktif oyuncu 1 kaynak çeker (aktif oyuncudan başlayarak saat yönünde)
  const startIdx = state.turnOrder.indexOf(activePid);
  for (let i = 0; i < state.turnOrder.length; i++) {
    const pid = state.turnOrder[(startIdx + i) % state.turnOrder.length]!;
    if (!state.removedPlayers.includes(pid)) {
      const drawn = giveResourcesToPlayer(state, pid, 1);
      draws[pid] = (draws[pid] ?? 0) + drawn;
    }
  }

  // 2. Aktif oyuncu ek kaynaklarını çeker:
  // - Açık her Şehir için +1
  // - Her Metropolis (A) için +2
  // - Her Metropolis (B) için +1
  const activeArea = state.areas[activePid];
  if (activeArea) {
    let extraCards = 0;
    for (const stack of activeArea.stacks) {
      if (stack.top === 'city') {
        extraCards += 1;
      } else if (stack.top === 'metropolis') {
        if (stack.metropolis?.side === 'A') {
          extraCards += 2;
        } else if (stack.metropolis?.side === 'B') {
          extraCards += 1;
        }
      }
    }

    if (extraCards > 0) {
      const extraDrawn = giveResourcesToPlayer(state, activePid, extraCards);
      draws[activePid] = (draws[activePid] ?? 0) + extraDrawn;
    }
  }

  state.log.push({ t: 'harvest', draws });
  return draws;
}
