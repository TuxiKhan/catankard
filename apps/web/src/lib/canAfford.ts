import type { BuildingType, Resource, ResourceCounts } from '@catankard/engine';

export const BUILDING_COSTS: Record<BuildingType | 'metropolis', ResourceCounts> = {
  road: { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 },
  knight: { brick: 0, wood: 0, wool: 1, wheat: 1, ore: 1 },
  settlement: { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 },
  city: { brick: 0, wood: 0, wool: 0, wheat: 2, ore: 3 },
  metropolis: { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 },
};

export const RESOURCE_NAMES_TR: Record<Resource, string> = {
  brick: 'Tuğla',
  wood: 'Odun',
  wool: 'Yün',
  wheat: 'Buğday',
  ore: 'Demir',
};

export interface SubstitutionInfo {
  canAfford: boolean;
  isDirectAfford: boolean;
  neededResource: Resource | null;
  payOptions: Resource[];
  ratio: number;
}

/**
 * Oyuncunun sahip olduğu yol sayısına göre ikame takas oranını verir.
 * (1 yol -> 4:1, 2 yol -> 3:1, 3 yol -> 2:1, 4+ yol -> 1:1)
 */
export function getRoadSubstitutionRatio(roads: number): number {
  if (roads <= 1) return 4;
  if (roads === 2) return 3;
  if (roads === 3) return 2;
  return 1;
}

/**
 * Bir binanın doğrudan mı yoksa yol ikamesiyle mi inşa edilebileceğini
 * ve yol ikamesi gerekiyorsa hangi kaynakların (payOptions) kullanılabileceğini hesaplar.
 */
export function getBuildingSubstitutionInfo(
  type: BuildingType | 'metropolis',
  hand: ResourceCounts | undefined | null,
  roads: number = 0,
  roadSubstitutionUsed: boolean = false
): SubstitutionInfo {
  const ratio = getRoadSubstitutionRatio(roads);
  if (!hand) {
    return { canAfford: false, isDirectAfford: false, neededResource: null, payOptions: [], ratio };
  }
  const cost = BUILDING_COSTS[type];
  if (!cost) {
    return { canAfford: false, isDirectAfford: false, neededResource: null, payOptions: [], ratio };
  }

  const resources: Resource[] = ['brick', 'wood', 'wool', 'wheat', 'ore'];
  const missing: Resource[] = [];
  let directAfford = true;

  for (const r of resources) {
    const current = hand[r] ?? 0;
    const needed = cost[r] ?? 0;
    if (current < needed) {
      directAfford = false;
      for (let i = 0; i < needed - current; i++) {
        missing.push(r);
      }
    }
  }

  if (directAfford) {
    return { canAfford: true, isDirectAfford: true, neededResource: null, payOptions: [], ratio };
  }

  if (roadSubstitutionUsed || missing.length !== 1) {
    return { canAfford: false, isDirectAfford: false, neededResource: null, payOptions: [], ratio };
  }

  const neededResource = missing[0]!;
  const payOptions: Resource[] = [];

  for (const r of resources) {
    if (r === neededResource) continue;
    const surplus = (hand[r] ?? 0) - (cost[r] ?? 0);
    if (surplus >= ratio) {
      payOptions.push(r);
    }
  }

  return {
    canAfford: payOptions.length > 0,
    isDirectAfford: false,
    neededResource,
    payOptions,
    ratio,
  };
}

/**
 * Oyuncunun elindeki kaynakların ve yol ikamesinin verilen bina kartını inşa etmeye yetip yetmediğini kontrol eder.
 *
 * Kurallar:
 * 1. Tüm maliyet eldeki kaynaklarla doğrudan ödenebiliyorsa -> true
 * 2. Eğer bu tur yol ikamesi kullanılmadıysa ve tam 1 kaynak eksikse:
 *    Maliyet karşılandıktan sonra kalan kaynaklardan herhangi biri
 *    yol takas oranına (ratio) eşit veya fazlaysa -> true
 * 3. Aksi halde -> false
 */
export function canAffordCard(
  type: BuildingType | 'metropolis',
  hand: ResourceCounts | undefined | null,
  roads: number = 0,
  roadSubstitutionUsed: boolean = false
): boolean {
  return getBuildingSubstitutionInfo(type, hand, roads, roadSubstitutionUsed).canAfford;
}
