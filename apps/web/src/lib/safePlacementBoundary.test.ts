import { describe, it, expect } from 'vitest';
import {
  createSafeZoneClamper,
  clampPositionToViewport,
} from './safePlacementBoundary.ts';

describe('safePlacementBoundary Clamping & Viewport Restrictions', () => {
  it('enforces wide boundary clamping for table zone (expanded movement area)', () => {
    const clamper = createSafeZoneClamper({
      layout: '3P',
      viewportWidth: 1280,
      viewportHeight: 720,
    });

    const resultMid = clamper({ x: 0, y: 20 });
    expect(resultMid.x).toBe(0);
    expect(resultMid.y).toBe(20);

    const resultUp = clamper({ x: 0, y: -40 });
    expect(resultUp.y).toBe(-40);

    // Extreme upward movement is clamped to -maxSpanY (-360 for 720h)
    const resultTooFarUp = clamper({ x: 0, y: -600 });
    expect(resultTooFarUp.y).toBe(-360);

    // Extreme downward movement is clamped to maxSpanY (360 for 720h)
    const resultTooFarDown = clamper({ x: 0, y: 600 });
    expect(resultTooFarDown.y).toBe(360);

    // Extreme horizontal bounds: -maxSpanX to maxSpanX (-832 to 832 for 1280w)
    const resultTooFarRight = clamper({ x: 1200, y: 0 });
    expect(resultTooFarRight.x).toBe(832);

    const resultTooFarLeft = clamper({ x: -1200, y: 0 });
    expect(resultTooFarLeft.x).toBe(-832);
  });

  it('enforces boundary clamping for 4P playfield', () => {
    const clamper4P = createSafeZoneClamper({
      layout: '4P',
      viewportWidth: 1000,
      viewportHeight: 600,
    });

    // maxSpanX = max(400, 1000 * 0.65 = 650) = 650
    const resultSide = clamper4P({ x: 900, y: 0 });
    expect(resultSide.x).toBe(650);

    const resultLeftSide = clamper4P({ x: -900, y: 0 });
    expect(resultLeftSide.x).toBe(-650);

    // maxSpanY = max(250, 600 * 0.50 = 300) = 300
    const resultUp = clamper4P({ x: 0, y: -500 });
    expect(resultUp.y).toBe(-300);

    const resultDown = clamper4P({ x: 0, y: 500 });
    expect(resultDown.y).toBe(300);
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

    it('prevents cards from going above the market row (minScreenY: 50% height + 15px)', () => {
      // At y = -600, screen top would be 600 - 600 = 0 < (800 * 0.5 + 15 = 415)
      // Min allowed y = 415 - 600 = -185
      const clamped = clampPositionToViewport(
        { x: 0, y: -600 },
        baseRect,
        viewportOptions
      );
      expect(clamped.y).toBe(-185);
      expect(baseRect.top + clamped.y).toBe(415);
    });

    it('prevents cards from crossing center action buttons (minScreenX: 46% width = 552)', () => {
      // At x = -1100, screen left would be 1000 - 1100 = -100 < 552
      // Min allowed x = 552 - 1000 = -448
      const clamped = clampPositionToViewport(
        { x: -1100, y: 0 },
        baseRect,
        viewportOptions
      );
      expect(clamped.x).toBe(-448);
      expect(baseRect.left + clamped.x).toBe(552);
    });

    it('honors custom minScreenX and minScreenY if provided', () => {
      const clamped = clampPositionToViewport(
        { x: -1100, y: -600 },
        baseRect,
        {
          ...viewportOptions,
          minScreenX: 12,
          minScreenY: 50,
        }
      );
      // Min allowed x = 12 - 1000 = -988
      expect(clamped.x).toBe(-988);
      // Min allowed y = 50 - 600 = -550
      expect(clamped.y).toBe(-550);
    });
  });
});
