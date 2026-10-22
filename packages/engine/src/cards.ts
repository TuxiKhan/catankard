import type {
  BuildingCard,
  BuildingType,
  EventCard,
  EventKind,
  MetropolisBKind,
  MetropolisCard,
  MetropolisSide,
  Resource,
  ResourceCounts,
} from './types.ts';

export const EMPTY_RESOURCES: Readonly<ResourceCounts> = Object.freeze({
  brick: 0,
  wood: 0,
  wool: 0,
  wheat: 0,
  ore: 0,
});

export function createEmptyResources(): ResourceCounts {
  return { brick: 0, wood: 0, wool: 0, wheat: 0, ore: 0 };
}

export function totalResourceCount(res: ResourceCounts): number {
  return res.brick + res.wood + res.wool + res.wheat + res.ore;
}

export const BUILDING_COSTS: Record<BuildingType | 'metropolis', ResourceCounts> = {
  road: { brick: 1, wood: 1, wool: 0, wheat: 0, ore: 0 },
  knight: { brick: 0, wood: 0, wool: 1, wheat: 1, ore: 1 },
  settlement: { brick: 1, wood: 1, wool: 1, wheat: 1, ore: 0 },
  city: { brick: 0, wood: 0, wool: 0, wheat: 2, ore: 3 },
  metropolis: { brick: 0, wood: 0, wool: 3, wheat: 0, ore: 1 },
};

/** 61 adet resmi kaynak kartı listesini üretir. */
export function createInitialResourceDeck(): Resource[] {
  const deck: Resource[] = [];
  for (let i = 0; i < 11; i++) deck.push('brick');
  for (let i = 0; i < 11; i++) deck.push('wood');
  for (let i = 0; i < 14; i++) deck.push('wool');
  for (let i = 0; i < 12; i++) deck.push('wheat');
  for (let i = 0; i < 13; i++) deck.push('ore');
  return deck;
}

/** 34 adet resmi inşaat kartı listesini üretir. */
export function createInitialBuildingDeck(): BuildingCard[] {
  const deck: BuildingCard[] = [];
  let idCounter = 1;
  for (let i = 0; i < 10; i++) deck.push({ id: `bld-road-${idCounter++}`, type: 'road' });
  for (let i = 0; i < 11; i++) deck.push({ id: `bld-settlement-${idCounter++}`, type: 'settlement' });
  for (let i = 0; i < 5; i++) deck.push({ id: `bld-city-${idCounter++}`, type: 'city' });
  for (let i = 0; i < 8; i++) deck.push({ id: `bld-knight-${idCounter++}`, type: 'knight' });
  return deck;
}

/** 7 adet resmi olay kartı listesini üretir. */
export function createInitialEventDeck(): EventCard[] {
  const events: EventCard[] = [
    { id: 'evt-robber-1', kind: 'robber' },
    { id: 'evt-robber-2', kind: 'robber' },
    { id: 'evt-robber-3', kind: 'robber' },
    { id: 'evt-solstice-1', kind: 'solstice' },
    { id: 'evt-abundance-1', kind: 'abundance' },
    { id: 'evt-subsidy-1', kind: 'subsidy' },
    { id: 'evt-charity-1', kind: 'charity' },
  ];
  return events;
}

/** 4 adet Büyükşehir kartını üretir. */
export function createMetropolisStack(side: MetropolisSide): MetropolisCard[] {
  if (side === 'A') {
    return [
      { id: 'metro-A-1', side: 'A' },
      { id: 'metro-A-2', side: 'A' },
      { id: 'metro-A-3', side: 'A' },
      { id: 'metro-A-4', side: 'A' },
    ];
  }

  const bKinds: MetropolisBKind[] = ['knights', 'roads', 'longest_route', 'largest_army'];
  return bKinds.map((kind, idx) => ({
    id: `metro-B-${idx + 1}-${kind}`,
    side: 'B',
    kind,
  }));
}
