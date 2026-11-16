import { describe, expect, it } from 'vitest';
import { BODY_OUTLINES, LOOK_PALETTES, outlineRadius } from './look';
import { AVATAR_RADIUS, drawMascot, formOf, MASCOT_AT_REST } from './mascot-sphere';

const GRID = 120;

/** The tone (1 darkest to 6 brightest) of every pixel of a drop drawn as `Avatar v2`, 0 where nothing is drawn. */
function drawnDrop(): number[] {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4);
  drawMascot(
    pixels,
    GRID,
    MASCOT_AT_REST,
    AVATAR_RADIUS,
    'awake',
    { ahead: true, avatar: true },
    formOf('drop', 'ember')
  );
  const tones = LOOK_PALETTES.ember.tones;

  return Array.from({ length: GRID * GRID }, (_, index) => {
    if (pixels[index * 4 + 3] === 0) {
      return 0;
    }

    return tones.findIndex((tone) => tone.every((channel, at) => channel === pixels[index * 4 + at])) + 1;
  });
}

/** Where a pixel sits against the drop's outline: its distance from the body's middle over the body's reach. */
function shareOfReach(index: number): number {
  const { dx, dy } = BODY_OUTLINES.drop;
  const radius = GRID * AVATAR_RADIUS;
  const x = ((index % GRID) + 0.5 - GRID / 2) / radius - dx;
  const y = (Math.floor(index / GRID) + 0.5 - GRID / 2 - GRID * 0.008) / radius - dy;

  return Math.hypot(x, y) / outlineRadius(BODY_OUTLINES.drop, Math.atan2(y, x));
}

describe('the Avatar v2 drawing', () => {
  it('glows in the darkest tone only, and edges the body with the next one all the way round', () => {
    const tones = drawnDrop();
    const outside = tones.filter((tone, index) => tone > 0 && shareOfReach(index) > 1);
    const rim = tones.filter((tone, index) => tone > 0 && shareOfReach(index) > 0.97 && shareOfReach(index) <= 1);

    expect(outside.length).toBeGreaterThan(0);
    expect(new Set(outside)).toEqual(new Set([1]));
    // Towards the highlight the rings crowd together, so there the next tone up dithers into the rim, as in the design.
    expect(new Set(rim)).toEqual(new Set([2, 3]));
    expect(rim.filter((tone) => tone === 2).length / rim.length).toBeGreaterThan(0.8);
  });

  it('puts its highlight up and to the left of the body’s middle, as the design does', () => {
    const tones = drawnDrop();
    const brightest = tones.flatMap((tone, index) => (tone === 6 ? [index] : []));
    const middleX = (brightest.reduce((sum, index) => sum + (index % GRID), 0) / brightest.length + 0.5) / GRID;
    const middleY =
      (brightest.reduce((sum, index) => sum + Math.floor(index / GRID), 0) / brightest.length + 0.5) / GRID;

    expect(brightest.length).toBeGreaterThan(0);
    expect(middleX).toBeLessThan(0.5);
    expect(middleY).toBeLessThan(0.5 + BODY_OUTLINES.drop.dy * AVATAR_RADIUS);
  });
});
