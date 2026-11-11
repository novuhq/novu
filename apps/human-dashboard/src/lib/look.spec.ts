import { describe, expect, it } from 'vitest';
import { ART_COLUMNS, ART_ROWS, drawCardArt, newArtSeed } from './card-art';
import {
  ART_KINDS,
  artColorOf,
  BODY_OUTLINES,
  type BodyOutline,
  isAgentLook,
  LOOK_PALETTES,
  lookOf,
  mixOutlines,
  ORIGINAL_LOOK,
  outlineRadius,
  outlineRadiusToward,
  sameLook,
} from './look';

const count = (cells: Uint8Array) => cells.reduce((sum, cell) => sum + cell, 0);

/** The outline's sum written out term by term, each with its own cosine and sine. */
const sumOfTerms = (outline: BodyOutline, angle: number) =>
  outline.a.reduce((sum, a, k) => sum + a * Math.cos(k * angle) + outline.b[k] * Math.sin(k * angle), 0);

describe('looks', () => {
  it('reads a look the API answered, and the original one for anything else', () => {
    const picked = { shape: 'drop', color: 'coral', art: { kind: 'arcs', seed: 12 } };

    expect(lookOf(picked)).toEqual(picked);
    expect(lookOf(undefined)).toEqual(ORIGINAL_LOOK);
    expect(isAgentLook({ ...picked, shape: 'cube' })).toBe(false);
    expect(isAgentLook({ ...picked, art: { kind: 'arcs', seed: -1 } })).toBe(false);
    expect(sameLook(lookOf(picked), picked as never)).toBe(true);
  });

  it('keeps the orb a circle, so it draws as the mascot always has', () => {
    expect(outlineRadius(BODY_OUTLINES.orb, 0)).toBe(1);
    expect(outlineRadius(BODY_OUTLINES.orb, 1.3)).toBe(1);
  });

  it('finds how far a body reaches from a direction’s cosine and sine as it does from its angle', () => {
    for (const outline of Object.values(BODY_OUTLINES)) {
      for (let angle = -Math.PI; angle <= Math.PI; angle += 0.37) {
        expect(outlineRadiusToward(outline, Math.cos(angle), Math.sin(angle))).toBeCloseTo(
          sumOfTerms(outline, angle),
          12
        );
      }
    }
  });

  it('bends from one body to another, and ends exactly on it', () => {
    const { orb, bean } = BODY_OUTLINES;

    expect(mixOutlines(orb, bean, 0)).toBe(orb);
    expect(mixOutlines(orb, bean, 1)).toBe(bean);
    const halfway = outlineRadius(mixOutlines(orb, bean, 0.5), 0);
    expect(halfway).toBeCloseTo((outlineRadius(orb, 0) + outlineRadius(bean, 0)) / 2, 6);
  });
});

describe('card art', () => {
  it('starts every card with the design’s own rays, cell for cell', () => {
    const { lit, dim } = drawCardArt('rays', 0);

    expect(lit).toHaveLength(ART_COLUMNS * ART_ROWS);
    expect(count(lit)).toBe(669);
    expect(count(dim)).toBe(1697);
  });

  it('draws the same art for the same kind and seed, and another for another seed', () => {
    for (const kind of ART_KINDS) {
      expect(drawCardArt(kind, 7)).toEqual(drawCardArt(kind, 7));
      expect(drawCardArt(kind, 7).lit).not.toEqual(drawCardArt(kind, 8).lit);
    }
  });

  it('puts a dim cell under every lit one', () => {
    for (const kind of ART_KINDS) {
      const { lit, dim } = drawCardArt(kind, 3);
      expect(lit.every((cell, index) => !cell || dim[index] === 1)).toBe(true);
    }
  });

  it('never redraws the design’s rays by chance', () => {
    expect(newArtSeed(() => 0)).toBe(1);
    expect(newArtSeed(() => 0.999999999)).toBeLessThanOrEqual(2_147_483_647);
  });
});

describe('artColorOf', () => {
  it('draws ember cards in the design card’s own orange', () => {
    expect(artColorOf('ember')).toEqual([0xff, 0x61, 0x33]);
  });

  it('draws the other colours in their brightest tone but one', () => {
    expect(artColorOf('marigold')).toEqual(LOOK_PALETTES.marigold.tones[4]);
    expect(artColorOf('bone')).toEqual(LOOK_PALETTES.bone.tones[4]);
  });
});
