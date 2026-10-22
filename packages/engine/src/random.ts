/**
 * Pure, deterministic pseudo-random number generator (Mulberry32).
 * Supabase Edge Functions ve Deno uyumluluğu için harici bağımlılık içermez.
 */

export interface RngState {
  seed: number;
}

export function hashSeed(seedStr: string): number {
  let hash = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(hash ^ seedStr.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return hash >>> 0;
}

export function createRng(seed: string | number): RngState {
  const numSeed = typeof seed === 'number' ? (seed >>> 0) : hashSeed(seed);
  return { seed: numSeed };
}

/** 0 (dahil) ile 1 (hariç) arasında deterministik float üretir ve RNG state'i günceller. */
export function nextRandom(rng: RngState): number {
  rng.seed = (rng.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(rng.seed ^ (rng.seed >>> 15), 1 | rng.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 0 ile maxExclusive - 1 arasında rastgele tamsayı üretir. */
export function nextInt(rng: RngState, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  return Math.floor(nextRandom(rng) * maxExclusive);
}

/** Bir diziyi yerinde (in-place) Fisher-Yates algoritması ile karıştırır. */
export function shuffle<T>(rng: RngState, array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    const temp = array[i]!;
    array[i] = array[j]!;
    array[j] = temp;
  }
  return array;
}
