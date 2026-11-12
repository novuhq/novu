import { describe, expect, it } from 'vitest';
import { drawMascot, EYE, formOf, MASCOT_PALETTE, MASCOT_PALETTE_LIGHT, type MascotDots } from './drawing';
import {
  BODY_OUTLINES,
  isLookColor,
  isMascotBody,
  LOOK_COLORS,
  MASCOT_BODIES,
  outlineRadius,
  terminalPalette,
} from './look';

const OPEN = { blink: 0, joy: 0 };
const STILL = { shimmer: 0 };

function count({ levels }: MascotDots, level: number): number {
  return levels.filter((value) => value === level).length;
}

describe('the looks', () => {
  it('keeps the mascot’s own oranges for ember', () => {
    expect(terminalPalette('ember').dark).toEqual(MASCOT_PALETTE);
    expect(terminalPalette('ember').light).toEqual(MASCOT_PALETTE_LIGHT);
  });

  it('gives every colour six tones for each background', () => {
    for (const color of LOOK_COLORS) {
      const palette = terminalPalette(color);
      expect(palette.dark).toHaveLength(6);
      expect(palette.light).toHaveLength(6);
    }
  });

  it('draws the orb as a circle, and only the orb', () => {
    expect(outlineRadius(BODY_OUTLINES.orb, 0)).toBe(1);
    expect(outlineRadius(BODY_OUTLINES.orb, 2)).toBe(1);
    expect(outlineRadius(BODY_OUTLINES.bean, 0)).not.toBeCloseTo(outlineRadius(BODY_OUTLINES.bean, Math.PI / 2), 2);
  });

  it('knows the bodies and colours the API answers, and nothing else', () => {
    expect(MASCOT_BODIES.every(isMascotBody)).toBe(true);
    expect(LOOK_COLORS.every(isLookColor)).toBe(true);
    expect(isMascotBody('cube')).toBe(false);
    expect(isLookColor(undefined)).toBe(false);
  });
});

describe('drawing a look', () => {
  it('draws the orb in ember exactly as the mascot always was', () => {
    const plain = drawMascot(64, OPEN, STILL);
    const original = drawMascot(64, OPEN, { ...STILL, form: formOf('orb', 'ember') });

    expect(original.levels).toEqual(plain.levels);
  });

  it('draws another body as another outline', () => {
    const orb = drawMascot(64, OPEN, STILL);
    const bean = drawMascot(64, OPEN, { ...STILL, form: formOf('bean', 'ember') });

    expect(bean.levels).not.toEqual(orb.levels);
  });

  it('cuts dark eyes out on a dark background, and draws them on a light one', () => {
    const onDark = drawMascot(64, OPEN, { ...STILL, form: formOf('orb', 'bone'), theme: 'dark' });
    const onLight = drawMascot(64, OPEN, { ...STILL, form: formOf('orb', 'bone'), theme: 'light' });

    expect(count(onDark, EYE)).toBe(0);
    expect(count(onLight, EYE)).toBeGreaterThan(0);
  });
});
