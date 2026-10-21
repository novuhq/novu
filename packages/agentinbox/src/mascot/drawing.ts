/**
 * The agent mascot drawn in braille dots, for the terminal. It mirrors the dashboard's drawing,
 * `apps/human-dashboard/src/lib/mascot-sphere.ts`: the same lit sphere, light, halo and eye shapes, from the
 * same measures. Keep the two in step: when a shape or a measure changes there, change it here too.
 *
 * What differs is made for a terminal:
 * - The dots are those of the agentinbox.md landing page: a dot is lit where the shade beats an 8x8 Bayer
 *   threshold, and takes the orange of its shade. The sphere is kept nearly solid, so its colour carries the
 *   light; only the halo thins out into loose dots.
 * - The face always looks straight ahead, so there is no turning (no yaw or pitch), and each eye keeps one
 *   centre: a blink closes towards the eye's middle and the smile sits on the same line. On a grid this
 *   coarse, any drift reads as the eyes jumping down.
 * - The sphere is drawn in true proportions for the terminal's characters, so it stays round, and it is a
 *   little bigger, with a shorter halo.
 * - The oranges are warmer and the shadow side lighter, so the sphere doesn't read as grey between its dots.
 * - On a light background the oranges are deeper, and the eyes aren't drawn at all: they are cut out of the
 *   sphere, so the background shows through as the eyes, as the cream eyes look on the dashboard.
 *
 * Nothing here writes anywhere: it only works out dots and characters.
 */

/** How the eyes look: `blink` from 0 (open) to 1 (shut), `joy` from 0 (open) to 1 (the happy arcs). */
export interface MascotFace {
  blink: number;
  joy: number;
}

export type Rgb = readonly [number, number, number];

/** Whether the terminal's background is dark or light. */
export type Theme = 'dark' | 'light';

/**
 * One frame of dots, row by row, `width` across and `height` down (whole braille cells). Each dot is a
 * level: 0 is no dot, 1 to 6 the oranges of {@link MASCOT_PALETTE} from darkest to the highlight, and
 * {@link EYE} is an eye.
 */
export interface MascotDots {
  levels: Uint8Array;
  width: number;
  height: number;
}

/** One character of the mascot: a braille cell, and the level of the dots it shows. */
export interface MascotCell {
  char: string;
  level: number;
}

/** The level of an eye's dots. */
export const EYE = 7;

/**
 * The dashboard's six oranges, the darker ones warmer and brighter: on a terminal the dots have gaps between
 * them, and the dashboard's dark browns read as grey there.
 */
export const MASCOT_PALETTE: readonly Rgb[] = [
  [0x6a, 0x26, 0x14],
  [0x96, 0x30, 0x16],
  [0xc2, 0x3c, 0x1a],
  [0xe8, 0x4a, 0x20],
  [0xff, 0x5c, 0x30],
  [0xff, 0x8a, 0x5e],
];

/**
 * For a light background: deeper, more saturated oranges, since thin dots of the light tones wash out on
 * white, and a soft peach halo.
 */
export const MASCOT_PALETTE_LIGHT: readonly Rgb[] = [
  [0xf0, 0xbc, 0xa6],
  [0xe8, 0x96, 0x74],
  [0xc8, 0x3a, 0x18],
  [0xdc, 0x46, 0x1c],
  [0xf0, 0x52, 0x20],
  [0xff, 0x6e, 0x3e],
];

export const MASCOT_EYE_COLOR: Rgb = [0xee, 0xe5, 0xd8];

/** The widths the mascot is drawn at, in dots, from the largest: 40, 32 and 24 columns. */
export const MASCOT_WIDTHS = [80, 64, 48] as const;

/** How much the lit dots shift about while the mascot is alive, as a share of their shade. */
export const SHIMMER = 0.08;

export function dotColor(level: number, theme: Theme = 'dark'): Rgb {
  if (level === EYE) {
    return MASCOT_EYE_COLOR;
  }

  return (theme === 'light' ? MASCOT_PALETTE_LIGHT : MASCOT_PALETTE)[level - 1];
}

/**
 * How many lines the mascot takes at `width` dots. `aspect` is how tall a row of dots is for one dot's width
 * on this terminal: 1 where a character is exactly twice as tall as it is wide.
 */
export function mascotLines(width: number, aspect: number): number {
  return Math.ceil(width / aspect / 4);
}

// The measures below are mascot-sphere.ts's, in sphere radii unless they say otherwise.

/** How far the sphere's middle sits below the grid's, as a share of the grid. */
const CENTER_DROP = 0.008;

/** The sphere's radius as a share of the width. The dashboard's drawing uses 0.308; the terminal's is bigger. */
const RADIUS_SHARE = 0.35;

/** Where the halo has faded to nothing. The dashboard's reaches 1.62; a shorter one leaves room for the sphere. */
const HALO_REACH = 1.42;

const HALO_AMBIENT = 1.25;
const HALO_SPILL = 1.5;

/** Where the light comes from: up and to the left, in front. It never swings, since the face never turns. */
const LIGHT = normalize({ x: -0.5, y: -0.56, z: 0.66 });

const EYE_SPREAD = 0.34;
const EYE_HEIGHT = -0.14;
const EYE_HALF_WIDTH = 0.092;
const EYE_HALF_HEIGHT = 0.16;

const SHUT_EYE_HALF_WIDTH = 0.154;
const SHUT_EYE_HEIGHT = 0.1;
const SHUT_EYE_CORNERS = 14;

const HAPPY_EYE_HALF_WIDTH = 0.162;
const HAPPY_EYE_HALF_HEIGHT = 0.216;
const HAPPY_EYE_CUT = { width: 0.864, height: 0.574, drop: 0.125 };
const HAPPY_EYE_LID = 0.1;
const HAPPY_EYE_CUT_BELOW = 1 + HAPPY_EYE_CUT.height;

/**
 * The landing page's 8x8 Bayer matrix, as thresholds between 0 and 1: a dot is lit where its shade beats the
 * threshold at its place, so a brighter shade lights more dots.
 */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((value) => (value + 0.5) / 64));

/** Which bit of a braille character each of its 2 x 4 dots is. */
const BRAILLE_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

interface Eye {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  /** 2 draws an oval; the higher it goes, the squarer the corners. */
  corners: number;
  /** 0 draws the whole oval, 1 only its arc, and in between an oval that is turning into the arc. */
  joy: number;
}

/** How an eye is moved and sized to sit on the braille cells, the same in every frame. */
interface CellShift {
  dx: number;
  dy: number;
  scale: number;
}

export interface DrawOptions {
  /** How tall a row of dots is for one dot's width; see {@link mascotLines}. 1 by default. */
  aspect?: number;
  /** The time in milliseconds, which moves the shimmer. */
  time?: number;
  /** How much the dots shimmer; 0 stands them still. {@link SHIMMER} by default. */
  shimmer?: number;
  /** On a `light` background the eyes are left out, for the background to show through. `dark` by default. */
  theme?: Theme;
}

/**
 * The mascot with `face` as dots, `width` across and as many rows as keep the sphere round on this terminal,
 * rounded up to whole braille cells.
 */
export function drawMascot(width: number, face: MascotFace, options: DrawOptions = {}): MascotDots {
  const { aspect = 1, time = 0, shimmer = SHIMMER, theme = 'dark' } = options;
  const height = mascotLines(width, aspect) * 4;
  const radius = width * RADIUS_SHARE;
  const centerX = width / 2;
  const centerY = (height * aspect) / 2 + width * CENTER_DROP;
  const shifts = shiftToCells(width, aspect, radius, centerX, centerY);
  const eyes = [-EYE_SPREAD, EYE_SPREAD].map((side, index) => {
    const eye = placeCenteredEye(side, face, radius);
    const shift = shifts[index];

    return { ...eye, x: eye.x + shift.dx, y: eye.y + shift.dy, halfWidth: eye.halfWidth * shift.scale };
  });
  // The shimmer is two slow waves across the dots, as on the landing page.
  const across = time * 0.00012 * 9;
  const down = time * 0.00009 * 7;
  const levels = new Uint8Array(width * height);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = (column + 0.5 - centerX) / radius;
      const y = ((row + 0.5) * aspect - centerY) / radius;
      const distanceSquared = x * x + y * y;
      const onSphere = distanceSquared <= 1;
      const index = row * width + column;

      if (onSphere && eyes.some((eye) => isInEye(eye, x, y))) {
        levels[index] = theme === 'light' ? 0 : EYE;
        continue;
      }

      // The sphere's shadow side is lifted to a clear orange-red (level 3 and up), so the whole disc stays
      // round and warm; the highlight, level 6, stays a small spot.
      const shade = onSphere
        ? 3 + (shadeOfSphere(x, y, Math.sqrt(1 - distanceSquared)) - 1.25) * 0.62
        : shadeOfHalo(x, y, Math.sqrt(distanceSquared));
      // The shimmer only changes which dots are lit, never their colour, so no band of colour slides about.
      const breathing = shade + shade * shimmer * Math.sin(column * 0.18 + across + Math.sin(row * 0.15 + down));
      const density = onSphere ? 0.78 + 0.22 * Math.min(1, breathing / 6) : (breathing / 6) * 0.75;

      if (density > BAYER[row & 7][column & 7]) {
        levels[index] = Math.max(1, Math.min(6, Math.round(shade)));
      }
    }
  }

  return { levels, width, height };
}

/**
 * The dots as lines of braille characters, 2 x 4 dots each, in one colour each. A character can't hold a
 * bit of an eye and orange dots too, so the characters inside each eye's bounding box show the eye's dots and
 * nothing else, and the rest show everything but. Letting the characters around an eye keep their orange
 * would leave orange islands boxed in by dark ones, most of all in the hollow under a smile; this way that
 * hollow is a dark half-moon and the arc a clean cream ∩. Outside the eyes a character takes the colour of
 * its brightest dot. `null` is an empty character.
 */
export function toCells(dots: MascotDots): Array<Array<MascotCell | null>> {
  const { levels, width, height } = dots;
  const boxes = eyeBoxes(dots);
  const lines: Array<Array<MascotCell | null>> = [];

  for (let line = 0; line < height / 4; line += 1) {
    const cells: Array<MascotCell | null> = [];

    for (let cell = 0; cell < width / 2; cell += 1) {
      const inEye = boxes.some((box) => cell >= box.left && cell <= box.right && line >= box.top && line <= box.bottom);
      let bits = 0;
      let brightest = 0;

      for (let dy = 0; dy < 4; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          const level = levels[(line * 4 + dy) * width + cell * 2 + dx];
          if (level && (level === EYE) === inEye) {
            bits |= BRAILLE_BITS[dy][dx];
            brightest = Math.max(brightest, level);
          }
        }
      }

      cells.push(bits ? { char: String.fromCodePoint(0x2800 + bits), level: brightest } : null);
    }

    lines.push(cells);
  }

  return lines;
}

/** Where an eye is, in braille characters, from the first to the last of them each way. */
export interface EyeBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The characters each eye's dots fall in: one box in the left half of the mascot, one in the right. */
export function eyeBoxes({ levels, width }: MascotDots): EyeBox[] {
  const half = width / 4;
  const boxes = [0, 1].map(() => ({ left: Infinity, right: -1, top: Infinity, bottom: -1 }));

  levels.forEach((level, index) => {
    if (level !== EYE) {
      return;
    }

    const cell = Math.floor((index % width) / 2);
    const line = Math.floor(index / width / 4);
    const box = boxes[cell < half ? 0 : 1];
    box.left = Math.min(box.left, cell);
    box.right = Math.max(box.right, cell);
    box.top = Math.min(box.top, line);
    box.bottom = Math.max(box.bottom, line);
  });

  return boxes.filter((box) => box.right >= 0);
}

/** Lit from one side, with a faint rim on the dark side so the sphere doesn't melt into its halo. */
function shadeOfSphere(x: number, y: number, z: number): number {
  const lit = Math.max(0, x * LIGHT.x + y * LIGHT.y + z * LIGHT.z);
  const rim = (1 - z) ** 1.5 * (1 - lit);

  return 1.25 + 4.6 * lit ** 1.3 + 0.5 * rim;
}

/** The glow around the sphere: light spilling off it, strongest beside the lit edge. */
function shadeOfHalo(x: number, y: number, distance: number): number {
  const edgeLit = Math.max(0, (x * LIGHT.x + y * LIGHT.y) / distance);
  const fade = Math.max(0, 1 - (distance - 1) / (HALO_REACH - 1)) ** 1.5;

  return (HALO_AMBIENT + HALO_SPILL * edgeLit) * fade;
}

/**
 * The dashboard's eye, but keeping one centre. A blink closes towards the eye's middle instead of its lower
 * edge, and the smile's arc is placed so what shows of it, from the top of its oval down to the rising lower
 * lid, keeps its middle on the open eye's middle all through the change.
 */
function placeCenteredEye(side: number, face: MascotFace, radius: number): Eye {
  const joy = Math.max(0, Math.min(1, face.joy));
  // A happy eye doesn't blink.
  const blink = face.blink * (1 - joy);
  const openHalfWidth = EYE_HALF_WIDTH + (SHUT_EYE_HALF_WIDTH - EYE_HALF_WIDTH) * blink;
  // A shut eye is a whole number of dot rows.
  const openHalfHeight = Math.max(
    EYE_HALF_HEIGHT * (1 - blink),
    Math.max(1, Math.round(radius * SHUT_EYE_HEIGHT)) / 2 / radius
  );
  const halfHeight = mix(openHalfHeight, HAPPY_EYE_HALF_HEIGHT, joy);
  const lid = mix(1, HAPPY_EYE_LID, joy);

  return {
    x: side,
    y: EYE_HEIGHT + (halfHeight * (1 - lid)) / 2,
    halfWidth: mix(openHalfWidth, HAPPY_EYE_HALF_WIDTH, joy),
    halfHeight,
    corners: mix(2 + SHUT_EYE_CORNERS * blink, 2, joy),
    joy,
  };
}

const cellShifts = new Map<string, CellShift[]>();

/**
 * Where the eyes go on the braille cells. A cell has one colour, so a cell holding part of an eye can't
 * also hold orange dots; lining each eye up with the cells keeps that dark ring to a sliver: its sides on
 * the 2-dot columns, its lower edge on a 4-row line. It is worked out once, from the open eye, and the same
 * shift and scale serve every frame, so a blink or a smile never makes the eyes hop from one cell row to the
 * next. Each eye is moved across on its own; both take the left eye's move down, so they always sit level.
 */
function shiftToCells(width: number, aspect: number, radius: number, centerX: number, centerY: number): CellShift[] {
  const key = `${width}:${aspect.toFixed(3)}`;
  const known = cellShifts.get(key);
  if (known) {
    return known;
  }

  const shifts = [-EYE_SPREAD, EYE_SPREAD].map((side) => {
    const open = placeCenteredEye(side, { blink: 0, joy: 0 }, radius);
    const eyeWidth = open.halfWidth * 2 * radius;
    // The open eye is widened or narrowed to whole cells; every other shape of it scales the same way.
    const scale = Math.max(2, Math.round(eyeWidth / 2) * 2) / eyeWidth;
    const left = centerX + (open.x - open.halfWidth * scale) * radius;
    // Rows are `aspect` dot widths tall, so the lower edge is lined up in rows.
    const bottom = (centerY + (open.y + open.halfHeight) * radius) / aspect;

    return {
      scale,
      dx: (Math.round(left / 2) * 2 - left) / radius,
      dy: ((Math.round(bottom / 4) * 4 - bottom) * aspect) / radius,
    };
  });
  const level = shifts.map((shift) => ({ ...shift, dy: shifts[0].dy }));
  cellShifts.set(key, level);

  return level;
}

function isInEye(eye: Eye, x: number, y: number): boolean {
  if (eye.joy >= 1) {
    return isInArc(eye, x, y);
  }
  if (eye.joy > 0) {
    return isInTurningEye(eye, x, y);
  }

  const across = Math.abs((x - eye.x) / eye.halfWidth);
  const along = Math.abs((y - eye.y) / eye.halfHeight);

  return across ** eye.corners + along ** eye.corners <= 1;
}

/** The upper half of the eye's oval, less the smaller oval that hollows it out from below. */
function isInArc(eye: Eye, x: number, y: number): boolean {
  const across = (x - eye.x) / eye.halfWidth;
  const along = (y - eye.y) / eye.halfHeight;
  if (along > HAPPY_EYE_LID || across * across + along * along > 1) {
    return false;
  }

  const cutAcross = across / HAPPY_EYE_CUT.width;
  const cutAlong = (along - HAPPY_EYE_CUT.drop) / HAPPY_EYE_CUT.height;

  return cutAcross * cutAcross + cutAlong * cutAlong > 1;
}

/**
 * An eye between the open oval and the happy arc: its lower lid is coming up, and the oval that hollows the
 * arc out comes up from underneath it.
 */
function isInTurningEye(eye: Eye, x: number, y: number): boolean {
  const across = (x - eye.x) / eye.halfWidth;
  const along = (y - eye.y) / eye.halfHeight;
  if (along > mix(1, HAPPY_EYE_LID, eye.joy) || Math.abs(across) ** eye.corners + Math.abs(along) ** eye.corners > 1) {
    return false;
  }

  const cutAcross = across / HAPPY_EYE_CUT.width;
  const cutAlong = (along - mix(HAPPY_EYE_CUT_BELOW, HAPPY_EYE_CUT.drop, eye.joy)) / HAPPY_EYE_CUT.height;

  return cutAcross * cutAcross + cutAlong * cutAlong > 1;
}

/** `from` at 0 and `to` at 1, exactly. */
function mix(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

function normalize(vector: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}
