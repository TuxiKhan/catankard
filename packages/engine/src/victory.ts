import type { GameState, PlayerId } from './types.ts';

/** Bir oyuncunun önündeki görünür Zafer Puanını (ZP) hesaplar. */
export function calculateVisibleVP(state: GameState, playerId: PlayerId): number {
  const area = state.areas[playerId];
  if (!area) return 0;

  let vp = 0;

  // Yerleşim yığınları: Sadece en üstteki (top) kart puan verir
  for (const stack of area.stacks) {
    if (stack.top === 'settlement') {
      vp += 1;
    } else if (stack.top === 'city') {
      vp += 2;
    } else if (stack.top === 'metropolis') {
      vp += 3;
    }
  }

  // Bonus kartları
  if (state.longestRouteOwner === playerId) {
    vp += 2;
  }
  if (state.largestArmyOwner === playerId) {
    vp += 2;
  }

  return vp;
}

/** Oyuncunun "En Uzun Yol Eşitliği" Büyükşehrine sahip olup olmadığını denetler. */
export function hasLongestRouteTiebreaker(state: GameState, playerId: PlayerId): boolean {
  const area = state.areas[playerId];
  if (!area) return false;
  return area.stacks.some(
    (s) => s.top === 'metropolis' && s.metropolis?.kind === 'longest_route'
  );
}

/** Oyuncunun "En Güçlü Ordu Eşitliği" Büyükşehrine sahip olup olmadığını denetler. */
export function hasLargestArmyTiebreaker(state: GameState, playerId: PlayerId): boolean {
  const area = state.areas[playerId];
  if (!area) return false;
  return area.stacks.some(
    (s) => s.top === 'metropolis' && s.metropolis?.kind === 'largest_army'
  );
}

/** En Uzun Yol ve En Güçlü Ordu bonus sahipliğini günceller ve değişiklikleri günlüğe ekler. */
export function updateBonusCards(state: GameState): void {
  const activePlayers = state.turnOrder.filter(
    (pid) => !state.removedPlayers.includes(pid)
  );

  // 1. En Uzun Yol (Eşik: en az 3 yol)
  const currentRoadOwner = state.longestRouteOwner;
  const currentOwnerRoads =
    currentRoadOwner && !state.removedPlayers.includes(currentRoadOwner)
      ? (state.areas[currentRoadOwner]?.roads ?? 0)
      : 0;

  let bestRoadPlayer: PlayerId | null = currentOwnerRoads >= 3 ? currentRoadOwner : null;
  let maxRoads = currentOwnerRoads >= 3 ? currentOwnerRoads : 2;

  // Eğer mevcut sahip elendi veya 3'ün altına düştüyse baştan tara
  if (!bestRoadPlayer) {
    maxRoads = 2; // en az 3 gerekir
    for (const pid of activePlayers) {
      const roads = state.areas[pid]?.roads ?? 0;
      if (roads > maxRoads) {
        maxRoads = roads;
        bestRoadPlayer = pid;
      }
    }
  } else {
    // Mevcut sahip varken: başkası daha fazla yapmalı VEYA eşitlik tiebreaker'ı olmalı
    for (const pid of activePlayers) {
      if (pid === currentRoadOwner) continue;
      const roads = state.areas[pid]?.roads ?? 0;
      if (roads < 3) continue;

      const tiebreaker = hasLongestRouteTiebreaker(state, pid);
      if (roads > maxRoads || (roads === maxRoads && tiebreaker && !hasLongestRouteTiebreaker(state, currentRoadOwner!))) {
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
        t: 'bonus_moved',
        bonus: 'longest_route',
        to: bestRoadPlayer,
        from: prev,
      });
    }
  }

  // 2. En Güçlü Ordu (Eşik: en az 2 şövalye)
  const currentArmyOwner = state.largestArmyOwner;
  const currentOwnerKnights =
    currentArmyOwner && !state.removedPlayers.includes(currentArmyOwner)
      ? (state.areas[currentArmyOwner]?.knights ?? 0)
      : 0;

  let bestArmyPlayer: PlayerId | null = currentOwnerKnights >= 2 ? currentArmyOwner : null;
  let maxKnights = currentOwnerKnights >= 2 ? currentOwnerKnights : 1;

  if (!bestArmyPlayer) {
    maxKnights = 1; // en az 2 gerekir
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
      if (knights > maxKnights || (knights === maxKnights && tiebreaker && !hasLargestArmyTiebreaker(state, currentArmyOwner!))) {
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
        t: 'bonus_moved',
        bonus: 'largest_army',
        to: bestArmyPlayer,
        from: prev,
      });
    }
  }
}

/** Aktif oyuncunun 7+ ZP ile kazanıp kazanmadığını kontrol eder. */
export function checkWinCondition(state: GameState): boolean {
  if (state.phase === 'finished' || state.winner) return true;

  const activePid = state.turnOrder[state.activePlayerIndex];
  if (!activePid || state.removedPlayers.includes(activePid)) return false;

  const vp = calculateVisibleVP(state, activePid);
  if (vp >= 7) {
    state.winner = activePid;
    state.phase = 'finished';
    state.log.push({ t: 'game_won', playerId: activePid });
    return true;
  }
  return false;
}
