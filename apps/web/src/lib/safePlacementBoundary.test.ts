import { describe, it, expect } from 'vitest';
import {
  createSafeZoneClamper,
  clampPositionToViewport,
} from './safePlacementBoundary.ts';

describe('safePlacementBoundary Clamping & Viewport Restrictions', () => {
  it('enforces strict boundary clamping for table zone (minX=-140, maxX=100, minY=-75, maxY=45)', () => {
    const clamper = createSafeZoneClamper({
      layout: '3P',
    });

    const resultMid = clamper({ x: 0, y: 20 });
    expect(resultMid.x).toBe(0);
    expect(resultMid.y).toBe(20);

    const resultUp = clamper({ x: 0, y: -40 });
    expect(resultUp.y).toBe(-40);

    // Extreme upward movement is strictly bound to minY = -75
    const resultTooFarUp = clamper({ x: 0, y: -400 });
    expect(resultTooFarUp.y).toBe(-75);

    // Extreme downward movement is strictly bound to maxY = 45
    const resultTooFarDown = clamper({ x: 0, y: 300 });
    expect(resultTooFarDown.y).toBe(45);

    // Extreme horizontal bounds: minX = -140, maxX = 100
    const resultTooFarRight = clamper({ x: 200, y: 0 });
    expect(resultTooFarRight.x).toBe(100);

    const resultTooFarLeft = clamper({ x: -200, y: 0 });
    expect(resultTooFarLeft.x).toBe(-140);
  });

  it('enforces strict boundary clamping for 4P bottom-right desk', () => {
    const clamper4P = createSafeZoneClamper({
      layout: '4P',
    });

    // Rightward movement is strictly clamped to maxX = 100
    const resultSide = clamper4P({ x: 600, y: 0 });
    expect(resultSide.x).toBe(100);

    // Leftward movement is strictly clamped to minX = -140
    const resultLeftSide = clamper4P({ x: -600, y: 0 });
    expect(resultLeftSide.x).toBe(-140);

    // Vertical movements
    const resultUp = clamper4P({ x: 0, y: -250 });
    expect(resultUp.y).toBe(-75);

    const resultDown = clamper4P({ x: 0, y: 250 });
    expect(resultDown.y).toBe(45);
  });

  it('clamps against constrained viewport dimensions with 12px margin when smaller than 50px boundary', () => {
    const clamperUltraNarrow = createSafeZoneClamper({
      layout: '3P',
      viewportWidth: 150,
      viewportHeight: 200,
      margin: 12,
    });

    // (150 - 24) / 4 = 31 < 50 -> horizontal clamped within [-31, 31]
    const resultRight = clamperUltraNarrow({ x: 100, y: 0 });
    expect(resultRight.x).toBe(31);

    const resultLeft = clamperUltraNarrow({ x: -100, y: 0 });
    expect(resultLeft.x).toBe(-31);
  });

  describe('clampPositionToViewport', () => {
    const baseRect = {
      left: 1000,
      top: 600,
      width: 125,
      height: 194,
    };
    const viewportOptions = {
      viewportWidth: 1200,
      viewportHeight: 800,
      margin: 12,
      topMargin: 50,
    };

    it('prevents cards from escaping outside window.innerWidth - 12px', () => {
      // At x = 100, screen right would be 1000 + 100 + 125 = 1225 > 1200 - 12 (1188)
      // Max allowed x = 1188 - 1000 - 125 = 63
      const clamped = clampPositionToViewport(
        { x: 100, y: 0 },
        baseRect,
        viewportOptions
      );
      expect(clamped.x).toBe(63);
      expect(baseRect.left + clamped.x + baseRect.width).toBe(1200 - 12);
    });

    it('prevents cards from escaping outside window.innerHeight - 12px', () => {
      // At y = 50, screen bottom would be 600 + 50 + 194 = 844 > 800 - 12 (788)
      // Max allowed y = 788 - 600 - 194 = -6
      const clamped = clampPositionToViewport(
        { x: 0, y: 50 },
        baseRect,
        viewportOptions
      );
      expect(clamped.y).toBe(-6);
      expect(baseRect.top + clamped.y + baseRect.height).toBe(800 - 12);
    });

    it('prevents cards from going above top: 50px', () => {
      // At y = -600, screen top would be 600 - 600 = 0 < 50
      // Min allowed y = 50 - 600 = -550
      const clamped = clampPositionToViewport(
        { x: 0, y: -600 },
        baseRect,
        viewportOptions
      );
      expect(clamped.y).toBe(-550);
      expect(baseRect.top + clamped.y).toBe(50);
    });

    it('prevents cards from escaping outside left: 12px', () => {
      // At x = -1100, screen left would be 1000 - 1100 = -100 < 12
      // Min allowed x = 12 - 1000 = -988
      const clamped = clampPositionToViewport(
        { x: -1100, y: 0 },
        baseRect,
        viewportOptions
      );
      expect(clamped.x).toBe(-988);
      expect(baseRect.left + clamped.x).toBe(12);
    });
  });
});
