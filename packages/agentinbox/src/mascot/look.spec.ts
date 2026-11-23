import { describe, expect, it } from 'vitest';
import {
  dotColor,
  drawMascot,
  EYE,
  formOf,
  MASCOT_DARK_EYE_COLOR,
  MASCOT_EYE_COLOR,
  MASCOT_PALETTE,
  MASCOT_PALETTE_LIGHT,
  type MascotDots,
  mixForms,
} from './drawing';
import {
  BODY_OUTLINES,
  isLookColor,
  isMascotBody,
  LOOK_COLORS,
  lookOf,
  MASCOT_BODIES,
  mixOutlines,
  outlineRadius,
  sameLook,
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

  it('reads the body and colour from a look as the API answers it, and nothing from one it can’t draw', () => {
    expect(lookOf({ shape: 'drop', color: 'coral', art: { kind: 'waves', seed: 7 } })).toEqual({
      shape: 'drop',
      color: 'coral',
    });
    // An API from before looks, one newer than this CLI, and whatever else an answer might hold.
    expect(lookOf(undefined)).toBeUndefined();
    expect(lookOf({ shape: 'cube', color: 'coral' })).toBeUndefined();
    expect(lookOf({ shape: 'drop' })).toBeUndefined();
    expect(lookOf('drop')).toBeUndefined();
  });

  it('counts no look as the orb in ember', () => {
    expect(sameLook(undefined, { shape: 'orb', color: 'ember' })).toBe(true);
    expect(sameLook({ shape: 'drop', color: 'coral' }, { shape: 'drop', color: 'coral' })).toBe(true);
    expect(sameLook({ shape: 'drop', color: 'coral' }, { shape: 'drop', color: 'ember' })).toBe(false);
    expect(sameLook(undefined, { shape: 'bean', color: 'ember' })).toBe(false);
  });
});

describe('bending from one look into another', () => {
  const orb = formOf('orb', 'ember');
  const drop = formOf('drop', 'coral');
  const bone = formOf('orb', 'bone');

  it('is exactly the look at either end, so a finished bend draws the look itself', () => {
    expect(mixOutlines(BODY_OUTLINES.orb, BODY_OUTLINES.drop, 0)).toBe(BODY_OUTLINES.orb);
    expect(mixOutlines(BODY_OUTLINES.orb, BODY_OUTLINES.drop, 1)).toBe(BODY_OUTLINES.drop);
    expect(mixForms(orb, drop, 0)).toBe(orb);
    expect(mixForms(orb, drop, 1)).toBe(drop);
  });

  it('bends the outline and blends every tone on the way', () => {
    const halfway = mixForms(orb, drop, 0.5);
    const up = -Math.PI / 2;

    // Halfway there the body reaches halfway between the orb's edge and the drop's, and so do its middle and its face.
    expect(outlineRadius(halfway.outline, up)).toBeCloseTo((1 + outlineRadius(BODY_OUTLINES.drop, up)) / 2, 6);
    expect(halfway.outline.dy).toBeCloseTo(BODY_OUTLINES.drop.dy / 2, 6);
    expect(halfway.outline.face.y).toBeCloseTo(BODY_OUTLINES.drop.face.y / 2, 6);
    for (const theme of ['dark', 'light'] as const) {
      halfway.palette[theme].forEach((tone, level) => {
        tone.forEach((part, channel) => {
          const [from, to] = [orb.palette[theme][level][channel], drop.palette[theme][level][channel]];
          expect(Math.abs(part - (from + to) / 2)).toBeLessThanOrEqual(0.5);
        });
      });
    }
    // Both have light eyes, so they stay as they are: drawn on a dark background, cut out on a light one.
    expect(halfway.eyesTurning).toBeUndefined();
    expect(count(drawMascot(64, OPEN, { ...STILL, form: halfway, theme: 'light' }), EYE)).toBe(0);
  });

  it('draws another mascot at every step of the way', () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((share) =>
      drawMascot(64, OPEN, { ...STILL, form: mixForms(orb, formOf('drop', 'ember'), share) })
    );

    steps.slice(1).forEach((step, index) => {
      expect(step.levels).not.toEqual(steps[index].levels);
    });
  });

  it('turns light eyes into dark ones in sight, on either background, and only then leaves them out', () => {
    const halfway = mixForms(orb, bone, 0.5);

    // Halfway between the cream and the near-black.
    expect(halfway.eyesTurning).toEqual(
      MASCOT_EYE_COLOR.map((part, channel) => Math.round((part + MASCOT_DARK_EYE_COLOR[channel]) / 2))
    );
    expect(dotColor(EYE, 'dark', halfway)).toEqual(halfway.eyesTurning);
    for (const theme of ['dark', 'light'] as const) {
      expect(count(drawMascot(64, OPEN, { ...STILL, form: halfway, theme }), EYE)).toBeGreaterThan(0);
    }
    // Once the bend is over the dark eyes are the dark background itself.
    expect(count(drawMascot(64, OPEN, { ...STILL, form: mixForms(orb, bone, 1), theme: 'dark' }), EYE)).toBe(0);
  });

  it('goes on from eyes that were on their way, when the look changes again before the bend is over', () => {
    const halfway = mixForms(orb, bone, 0.5);
    const backToLight = mixForms(halfway, formOf('bean', 'coral'), 0.5);

    // Neither jumps to the cream nor back to the dark: a quarter of the way from the cream.
    expect(backToLight.eyesTurning).toEqual(
      MASCOT_EYE_COLOR.map((part, channel) =>
        Math.round(((halfway.eyesTurning as readonly number[])[channel] + part) / 2)
      )
    );
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
