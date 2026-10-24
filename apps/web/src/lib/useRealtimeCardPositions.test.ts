import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAliasesForCardId,
  resolveCardPosition,
  sanitizeCardPosition,
  CARD_BOUNDS,
  type CardPosition,
  type CardMovePayload,
} from './useRealtimeCardPositions.ts';

describe('useRealtimeCardPositions - Helper functions & Alias resolution', () => {
  it('generates correct aliases for player-specific road ids', () => {
    const aliases = getAliasesForCardId('player-1', 'player-1-road-0');
    expect(aliases).toContain('player-1-road-0');
    expect(aliases).toContain('my-road-0');
    expect(aliases).toContain('road-0');
    expect(aliases).toContain('you-4p-road-0');
    expect(aliases).toContain('you-3p-road-0');
  });

  it('generates correct aliases for active player my-road ids', () => {
    const aliases = getAliasesForCardId('player-1', 'my-road-2');
    expect(aliases).toContain('my-road-2');
    expect(aliases).toContain('player-1-road-2');
    expect(aliases).toContain('road-2');
  });

  it('generates correct aliases for you-4p and you-3p prefixed ids', () => {
    const aliases4p = getAliasesForCardId('player-1', 'you-4p-road-3');
    expect(aliases4p).toContain('you-4p-road-3');
    expect(aliases4p).toContain('player-1-road-3');
    expect(aliases4p).toContain('my-road-3');

    const aliases3p = getAliasesForCardId('player-1', 'you-3p-knight-1');
    expect(aliases3p).toContain('you-3p-knight-1');
    expect(aliases3p).toContain('player-1-knight-1');
    expect(aliases3p).toContain('my-knight-1');
  });

  it('generates bonus card aliases correctly', () => {
    const aliasesRoute = getAliasesForCardId('player-1', 'bonus-longest-route');
    expect(aliasesRoute).toContain('player-1-bonus-longest-route');
    expect(aliasesRoute).toContain('bonus-longest-route');
    expect(aliasesRoute).toContain('bonus-4p-longest-route');
    expect(aliasesRoute).toContain('bonus-3p-longest-route');

    const aliasesArmy = getAliasesForCardId('player-1', 'bonus-4p-largest-army');
    expect(aliasesArmy).toContain('player-1-bonus-largest-army');
    expect(aliasesArmy).toContain('bonus-largest-army');
    expect(aliasesArmy).toContain('bonus-4p-largest-army');
  });

  it('resolves card position using exact id or aliases', () => {
    const playerMap: Record<string, CardPosition> = {
      'p1-road-0': { x: 45, y: -20 },
      'my-knight-1': { x: 10, y: 15 },
      'p1-bonus-longest-route': { x: 30, y: -40 },
    };

    // Exact match
    expect(resolveCardPosition(playerMap, 'p1', 'p1-road-0')).toEqual({ x: 45, y: -20 });

    // Alias match: asking for 'my-road-0' -> resolves to 'p1-road-0'
    expect(resolveCardPosition(playerMap, 'p1', 'my-road-0')).toEqual({ x: 45, y: -20 });

    // Alias match: asking for 'you-4p-road-0' -> resolves to 'p1-road-0'
    expect(resolveCardPosition(playerMap, 'p1', 'you-4p-road-0')).toEqual({ x: 45, y: -20 });

    // Alias match: asking for 'p1-knight-1' -> resolves to 'my-knight-1'
    expect(resolveCardPosition(playerMap, 'p1', 'p1-knight-1')).toEqual({ x: 10, y: 15 });

    // Bonus card alias resolution
    expect(resolveCardPosition(playerMap, 'p1', 'bonus-4p-longest-route')).toEqual({ x: 30, y: -40 });
    expect(resolveCardPosition(playerMap, 'p1', 'bonus-longest-route')).toEqual({ x: 30, y: -40 });

    // Non-existent card returns undefined
    expect(resolveCardPosition(playerMap, 'p1', 'non-existent')).toBeUndefined();
  });

  it('validates card_move broadcast payload structure', () => {
    const payload: CardMovePayload = {
      playerId: 'player-xyz',
      cardId: 'player-xyz-road-0',
      pos: { x: 120, y: -35 },
      timestamp: Date.now(),
    };

    expect(payload.playerId).toBe('player-xyz');
    expect(payload.cardId).toBe('player-xyz-road-0');
    expect(payload.pos.x).toBe(120);
    expect(payload.pos.y).toBe(-35);
    expect(typeof payload.timestamp).toBe('number');
  });

  describe('sanitizeCardPosition - Bounds clamping and coordinate sanity', () => {
    it('clamps coordinates exceeding max and min boundaries (-140 to +100 X, -80 to +50 Y)', () => {
      // Exceeding positive limits
      const clampedMax = sanitizeCardPosition({ x: 999, y: 300 });
      expect(clampedMax).toEqual({ x: 100, y: 50 });

      // Exceeding negative limits
      const clampedMin = sanitizeCardPosition({ x: -500, y: -200 });
      expect(clampedMin).toEqual({ x: -140, y: -80 });

      // Inside normal limits
      const normal = sanitizeCardPosition({ x: 42, y: -15 });
      expect(normal).toEqual({ x: 42, y: -15 });

      // Exact boundaries
      const exact = sanitizeCardPosition({ x: -140, y: 50 });
      expect(exact).toEqual({ x: -140, y: 50 });
    });

    it('handles invalid, non-finite, or missing coordinate values safely', () => {
      expect(sanitizeCardPosition(null as any)).toEqual({ x: 0, y: 0 });
      expect(sanitizeCardPosition(undefined as any)).toEqual({ x: 0, y: 0 });
      expect(sanitizeCardPosition({ x: NaN, y: Infinity })).toEqual({ x: 0, y: 0 });
      expect(sanitizeCardPosition({} as any)).toEqual({ x: 0, y: 0 });
    });

    it('rounds floating-point coordinates to integer pixels', () => {
      const rounded = sanitizeCardPosition({ x: 45.7, y: -34.2 });
      expect(rounded).toEqual({ x: 46, y: -34 });
    });
  });
});
