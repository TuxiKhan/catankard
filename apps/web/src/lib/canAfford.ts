import type { BuildingType, Resource, ResourceCounts } from '@catankard/engine';

export const BUILDING_COSTS: Record<BuildingType | 'metropolis', ResourceCounts> = {
  road: { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 },
  knight: { brick: 0, wood: 0, wool: 1, wheat: 1, ore: 1 },
  settlement: { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 },
  city: { brick: 0, wood: 0, wool: 0, wheat: 2, ore: 3 },
  metropolis: { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 },
};

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
  if (!hand) return false;
  const cost = BUILDING_COSTS[type];
  if (!cost) return false;

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

  if (directAfford) return true;
  if (roadSubstitutionUsed) return false;

  // Yalnızca tam 1 eksik kaynak yol ikamesiyle kapatılabilir
  if (missing.length !== 1) return false;

  const ratio = getRoadSubstitutionRatio(roads);
  const neededResource = missing[0]!;

  // Base cost ödendikten sonra kalan kaynaklardan herhangi birinin fazlası >= ratio mu?
  for (const r of resources) {
    if (r === neededResource) continue;
    const surplus = (hand[r] ?? 0) - (cost[r] ?? 0);
    if (surplus >= ratio) {
      return true;
    }
  }

  return false;
}
