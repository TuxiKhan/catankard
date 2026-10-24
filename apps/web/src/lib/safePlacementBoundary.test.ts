import { describe, it, expect } from 'vitest';
import { createSafeZoneClamper, HAND_ZONE_CONFIG } from './safePlacementBoundary.ts';

describe('safePlacementBoundary Clamping & Hand Occlusion Prevention', () => {
  it('prevents cards from entering the central hand zone in 3P (clamps y to safe boundary)', () => {
    const clamper = createSafeZoneClamper({
      layout: '3P',
      handPosition: 'bottom-center',
      slotIndex: 0,
      totalSlots: 1,
      cardWidth: 110,
    });

    // 1. Trying to drag card downwards into the hand zone (y > 0)
    const resultDown = clamper({ x: 0, y: 50 });
    expect(resultDown.y).toBe(0); // Clamped immediately to safe border (y <= 0)

    const resultFarDown = clamper({ x: 0, y: 150 });
    expect(resultFarDown.y).toBe(0);

    // 2. Dragging card upwards into free table area (y < 0) is allowed
    const resultUp = clamper({ x: 0, y: -60 });
    expect(resultUp.y).toBe(-60);

    // 3. Masanın çok yukarısına (Bina dizisi üstüne) taşmayı engeller
    const resultTooFarUp = clamper({ x: 0, y: -300 });
    expect(resultTooFarUp.y).toBe(-230);
  });

  it('allows downward placement only on side flanks outside the hand zone', () => {
    const clamper = createSafeZoneClamper({
      layout: '3P',
      handPosition: 'bottom-center',
      slotIndex: 0,
      totalSlots: 1,
      cardWidth: 110,
    });

    // Central hand zone width is 540px (-270 to +270).
    // If x is far left (-350), it is outside the hand zone:
    const resultSide = clamper({ x: -350, y: 80 });
    expect(resultSide.x).toBe(-350);
    expect(resultSide.y).toBe(80); // Allowed because there are no hand cards on the far flank

    // But if moved back horizontally towards center (-100) while y = 80:
    const resultReturned = clamper({ x: -100, y: 80 });
    expect(resultReturned.y).toBe(0); // Immediately snapped to safe boundary!
  });

  it('protects the bottom-right hand zone in 4P', () => {
    const clamper4P = createSafeZoneClamper({
      layout: '4P',
      handPosition: 'bottom-right',
      slotIndex: 0,
      totalSlots: 2,
      cardWidth: 100,
    });

    // Dragging down into the right-hand corner is blocked
    const resultRightDown = clamper4P({ x: 50, y: 80 });
    expect(resultRightDown.y).toBe(0);

    // Moving up into open quadrant table is permitted
    const resultUp = clamper4P({ x: -50, y: -50 });
    expect(resultUp.y).toBe(-50);
  });
});
