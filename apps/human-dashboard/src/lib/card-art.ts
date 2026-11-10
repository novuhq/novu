import { DESIGN_RAYS } from './card-art-rays';
import type { ArtKind } from './look';

/**
 * The dotted drawing across the top of an agent card (`Agent card · Vertical`): square cells on a grid of 100
 * columns over the card's width, covering its top 84 rows. Each cell is lit, dim or empty: the dim ones are the
 * design's `Art · dim` layer, a faint field drawn at a third of the colour, and the lit ones its `Art · lit`, the
 * drawing itself, on top. Most cells sit on every other point of the grid, offset row by row, as the design's
 * do; where a drawing is brightest the cells close up.
 *
 * Seed 0 of rays is the design's own drawing, cell for cell, which every agent's card starts with. Any other
 * seed draws a new one of its kind in the same manner, the same one every time for the same seed, so a card
 * looks the same wherever it is shown.
 */

export const ART_COLUMNS = 100;
export const ART_ROWS = 84;

/** A cell's side as a share of the space between cells: the design's 2.713px squares, 3.3913px apart. */
export const ART_CELL_SHARE = 0.8;

/** The opacity the design gives its dim layer. */
export const ART_DIM_OPACITY = 0.32;

/** One drawing: 1 where a cell is, row by row, `ART_COLUMNS` to a row. Every lit cell has a dim one under it. */
export type ArtCells = { lit: Uint8Array; dim: Uint8Array };

/**
 * A drawing as two SVG paths of square cells on a 100 × 84 grid (`viewBox="0 0 100 84"`): the lit cells, and the dim
 * ones that show around them, each square the share of the space between cells the design gives it.
 */
export function artPathsOf({ lit, dim }: ArtCells): { lit: string; dim: string } {
  const square = (index: number) => {
    const column = index % ART_COLUMNS;
    const row = Math.floor(index / ART_COLUMNS);

    return `M${column} ${row}h${ART_CELL_SHARE}v${ART_CELL_SHARE}h-${ART_CELL_SHARE}z`;
  };
  let litPath = '';
  let dimPath = '';

  for (let index = 0; index < lit.length; index += 1) {
    if (lit[index]) {
      litPath += square(index);
    } else if (dim[index]) {
      dimPath += square(index);
    }
  }

  return { lit: litPath, dim: dimPath };
}

/** The art of a look, the same for the same kind and seed. */
export function drawCardArt(kind: ArtKind, seed: number): ArtCells {
  if (kind === 'rays' && seed === 0) {
    return designRays();
  }

  const random = seeded(seed * 4 + ART_SALT[kind]);
  const field = FIELDS[kind](random);

  return ditherField(field, random);
}

const ART_SALT: Record<ArtKind, number> = { rays: 0, waves: 1, arcs: 2, sparkles: 3 };

/** Where the art may draw: the rows the design's drawings keep to, under the card's label. */
const FIRST_ROW = 16;
const LAST_ROW = 80;

function designRays(): ArtCells {
  const lit = new Uint8Array(ART_COLUMNS * ART_ROWS);
  const dim = new Uint8Array(ART_COLUMNS * ART_ROWS);

  for (const [row, litHex, dimHex] of DESIGN_RAYS) {
    fillRow(lit, row, litHex);
    fillRow(dim, row, dimHex);
  }

  return { lit, dim };
}

function fillRow(cells: Uint8Array, row: number, hex: string): void {
  for (let digit = 0; digit < hex.length; digit += 1) {
    const value = Number.parseInt(hex[digit], 16);
    for (let bit = 0; bit < 4; bit += 1) {
      if (value & (8 >> bit)) {
        cells[row * ART_COLUMNS + digit * 4 + bit] = 1;
      }
    }
  }
}

/** How bright the drawing is at a column and row, from 0 to 1. */
type Field = (column: number, row: number) => number;

const FIELDS: Record<ArtKind, (random: () => number) => Field> = { rays, waves, arcs, sparkles };

/** Rays fanning up from below the middle of the card, each widening as it goes, as a sunburst. */
function rays(random: () => number): Field {
  const originX = 50 + (random() - 0.5) * 16;
  const originY = 78 + random() * 6;
  const count = 6 + Math.floor(random() * 3);
  const spread = 1.15 + random() * 0.25;
  const beams = Array.from({ length: count }, (_, index) => {
    const share = count === 1 ? 0.5 : index / (count - 1);

    return {
      angle: -Math.PI / 2 + (share - 0.5) * 2 * spread + (random() - 0.5) * 0.12,
      width: 0.11 + random() * 0.06,
      reach: 54 + random() * 14,
    };
  });

  return (column, row) => {
    const dx = column - originX;
    const dy = row - originY;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    let brightest = 0;

    for (const beam of beams) {
      const off = Math.abs(wrapAngle(angle - beam.angle));
      // A ray is a narrow wedge: it widens with the distance, and fades in from its root and out at its tip.
      const across = off / (beam.width * (0.7 + distance / 90));
      const along = smoothstep(4, 16, distance) * (1 - smoothstep(beam.reach - 14, beam.reach, distance));
      brightest = Math.max(brightest, Math.exp(-across * across) * along);
    }

    return brightest;
  };
}

/** Three bands rolling across the card, each a little lower than the one before. */
function waves(random: () => number): Field {
  const length = 70 + random() * 40;
  const height = 6 + random() * 4;
  const phase = random() * Math.PI * 2;
  const top = 26 + random() * 6;
  const gap = 13 + random() * 4;
  const bands = [0, 1, 2].map((index) => ({
    base: top + index * gap,
    phase: phase + index * (0.5 + random() * 0.6),
    width: 3.4 + random() * 1.2 - index * 0.4,
  }));

  return (column, row) => {
    let brightest = 0;

    for (const band of bands) {
      const middle = band.base + height * Math.sin((column / length) * Math.PI * 2 + band.phase);
      const off = (row - middle) / band.width;
      brightest = Math.max(brightest, Math.exp(-off * off));
    }

    return brightest;
  };
}

/** Rings around a point past the card's upper right corner, fading the further round they go. */
function arcs(random: () => number): Field {
  const centerX = 104 + random() * 10;
  const centerY = 8 + random() * 10;
  const first = 22 + random() * 6;
  const step = 9 + random() * 2.5;
  const count = 5 + Math.floor(random() * 2);

  return (column, row) => {
    const dx = column - centerX;
    const dy = row - centerY;
    const distance = Math.hypot(dx, dy);
    // Straight down from the centre is 0; round towards the left is 1.
    const round = Math.atan2(-dx, dy) / (Math.PI / 2);
    const fade = 1 - smoothstep(0.7, 1.15, round);
    let brightest = 0;

    for (let index = 0; index < count; index += 1) {
      const radius = first + index * step;
      const width = 2.5 + index * 0.18;
      const off = (distance - radius) / width;
      brightest = Math.max(brightest, Math.exp(-off * off) * fade * (1 - index * 0.07));
    }

    return brightest;
  };
}

/** Small diamonds scattered over the card, some bigger and brighter than others. */
function sparkles(random: () => number): Field {
  const count = 26 + Math.floor(random() * 10);
  const stars = Array.from({ length: count }, () => ({
    x: random() * 100,
    y: FIRST_ROW + 6 + random() * (LAST_ROW - FIRST_ROW - 12),
    size: 3.8 + random() * 4.2,
    strength: 0.7 + random() * 0.3,
  }));

  return (column, row) => {
    let brightest = 0;

    for (const star of stars) {
      // A diamond: the distance across and down added up.
      const off = (Math.abs(column - star.x) + Math.abs(row - star.y)) / star.size;
      if (off < 1) {
        brightest = Math.max(brightest, (1 - off * off) * star.strength);
      }
    }

    return brightest;
  };
}

/**
 * Lights the field's cells: on every other point of the grid wherever the drawing beats a 4x4 Bayer threshold,
 * and on the points between where it is brightest. The dim field is a glow around the drawing over a faint
 * scatter, thinning towards the top and bottom of the art.
 */
function ditherField(field: Field, random: () => number): ArtCells {
  const lit = new Uint8Array(ART_COLUMNS * ART_ROWS);
  const dim = new Uint8Array(ART_COLUMNS * ART_ROWS);
  const values = new Float32Array(ART_COLUMNS * ART_ROWS);

  for (let row = FIRST_ROW; row <= LAST_ROW; row += 1) {
    for (let column = 0; column < ART_COLUMNS; column += 1) {
      values[row * ART_COLUMNS + column] = field(column + 0.5, row + 0.5);
    }
  }

  const glow = blur(values, 3);
  const jitter = random() * 16;

  for (let row = FIRST_ROW; row <= LAST_ROW; row += 1) {
    const edge = smoothstep(FIRST_ROW - 1, FIRST_ROW + 12, row) * (1 - smoothstep(LAST_ROW - 12, LAST_ROW + 1, row));

    for (let column = 0; column < ART_COLUMNS; column += 1) {
      const index = row * ART_COLUMNS + column;
      const onLattice = (column + row) % 2 === 0;
      const threshold = BAYER[row & 3][(column >> 1) & 3];
      const value = values[index];
      const isLit = onLattice ? value > 0.28 + threshold * 0.6 : value > 0.97;
      const faint = edge * (0.18 + 0.82 * Math.min(1, glow[index] * 2.4));
      const isDim = onLattice && faint > (threshold + ((jitter + column * 7 + row * 13) % 16) / 256) * 0.95;

      if (isLit) {
        lit[index] = 1;
        dim[index] = 1;
      } else if (isDim) {
        dim[index] = 1;
      }
    }
  }

  return { lit, dim };
}

/** A box blur, `radius` cells each way, twice over: near enough a soft glow. */
function blur(values: Float32Array, radius: number): Float32Array {
  let current = values;

  for (let pass = 0; pass < 2; pass += 1) {
    current = blurLine(blurLine(current, radius, 'across'), radius, 'down');
  }

  return current;
}

/** One pass of the box blur along the rows (`across`) or the columns (`down`). */
function blurLine(values: Float32Array, radius: number, direction: 'across' | 'down'): Float32Array {
  const out = new Float32Array(values.length);
  const along = direction === 'across' ? ART_COLUMNS : ART_ROWS;
  const lines = direction === 'across' ? ART_ROWS : ART_COLUMNS;
  const at = (line: number, position: number) =>
    direction === 'across' ? line * ART_COLUMNS + position : position * ART_COLUMNS + line;

  for (let line = 0; line < lines; line += 1) {
    for (let position = 0; position < along; position += 1) {
      const from = Math.max(0, position - radius);
      const to = Math.min(along - 1, position + radius);
      let sum = 0;
      for (let k = from; k <= to; k += 1) {
        sum += values[at(line, k)];
      }
      out[at(line, position)] = sum / (to - from + 1);
    }
  }

  return out;
}

/** A 4x4 Bayer matrix as thresholds between 0 and 1. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

function smoothstep(from: number, to: number, value: number): number {
  const share = Math.max(0, Math.min(1, (value - from) / (to - from)));

  return share * share * (3 - 2 * share);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** A small, fast random number generator (mulberry32): the same numbers for the same seed, everywhere. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new seed for "Redraw art": any of the seeds the API keeps, but never 0, which is the design's own rays. */
export function newArtSeed(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 2_147_483_646);
}
