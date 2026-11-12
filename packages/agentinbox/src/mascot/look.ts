import type { Rgb } from './drawing';

/**
 * An agent's look as the terminal draws it: its mascot's body and colour. They are the dashboard's
 * (`apps/human-dashboard/src/lib/look.ts`), which fits each body's outline to the design's drawings: keep the two
 * in step. The colours differ the way the mascot's own oranges do here: on a terminal the dots have gaps between
 * them, so the dark tones are lifted towards the colour, or they read as grey. Ember is the mascot's own palette.
 */

export const MASCOT_BODIES = ['orb', 'pebble', 'drop', 'bean', 'peek', 'mochi'] as const;

export type MascotBody = (typeof MASCOT_BODIES)[number];

export const LOOK_COLORS = ['ember', 'marigold', 'coral', 'paprika', 'peach', 'bone'] as const;

export type LookColor = (typeof LOOK_COLORS)[number];

/** Where a body ends around its middle, in sphere radii; see the dashboard's `BodyOutline`. */
export interface BodyOutline {
  dx: number;
  dy: number;
  a: readonly number[];
  b: readonly number[];
  face: { x: number; y: number };
}

export const BODY_OUTLINES: Record<MascotBody, BodyOutline> = {
  orb: { dx: 0, dy: 0, a: [1], b: [0], face: { x: 0, y: 0 } },
  pebble: {
    dx: -0.0029,
    dy: 0.0228,
    a: [1.0282, 0.0027, 0.1275, 0.0004, -0.0324, 0.001, -0.0074, 0.0004, 0.0005],
    b: [0, 0.004, -0.0458, -0.0007, 0.0278, 0.0015, 0.0152, -0.0009, 0.0012],
    face: { x: -0.0029, y: 0.0228 },
  },
  drop: {
    dx: -0.0148,
    dy: 0.1209,
    a: [0.9119, 0.0014, -0.1042, -0.0282, 0.018, 0.0126, -0.0049, -0.0076, 0.0016],
    b: [0, 0.0103, -0.0362, 0.0506, 0.0155, -0.0145, -0.0082, 0.0007, 0.0036],
    face: { x: -0.0148, y: 0.2 },
  },
  bean: {
    dx: -0.0013,
    dy: 0.0318,
    a: [0.9279, 0.0016, 0.1715, -0.0044, 0.003, 0.006, 0.006, -0.0026, -0.0023],
    b: [0, 0.0094, -0.0827, -0.0145, -0.0155, 0.0082, -0.0106, -0.0065, 0.0045],
    face: { x: -0.0013, y: 0.0318 },
  },
  peek: { dx: 0.4686, dy: 0.7265, a: [1.7169], b: [0], face: { x: 0.2, y: 0.3 } },
  mochi: {
    dx: -0.003,
    dy: 0.0257,
    a: [0.9966, 0.0028, 0.1936, 0.0008, -0.0085, 0.0005, -0.0141, -0.0011, -0.0036],
    b: [0, -0.0003, -0.0018, 0.0145, 0.0007, 0.006, -0.0004, 0.0011, 0.0008],
    face: { x: -0.003, y: 0.0257 },
  },
};

/** How far the body reaches from its middle in the direction `angle`, in sphere radii. */
export function outlineRadius(outline: BodyOutline, angle: number): number {
  let radius = outline.a[0];

  for (let k = 1; k < outline.a.length; k += 1) {
    radius += outline.a[k] * Math.cos(k * angle) + outline.b[k] * Math.sin(k * angle);
  }

  return radius;
}

/** The design's six tones of each colour, darkest first, and whether the eyes on it are light or dark. */
const DESIGN_TONES: Record<LookColor, { tones: readonly Rgb[]; eyes: 'light' | 'dark' }> = {
  ember: {
    tones: [
      [0x1c, 0x13, 0x10],
      [0x3a, 0x1a, 0x10],
      [0x7a, 0x28, 0x12],
      [0xc2, 0x40, 0x1c],
      [0xff, 0x5c, 0x30],
      [0xff, 0x8a, 0x5e],
    ],
    eyes: 'light',
  },
  marigold: {
    tones: [
      [0x1c, 0x12, 0x0f],
      [0x3b, 0x21, 0x0e],
      [0x7a, 0x53, 0x1b],
      [0xc2, 0x84, 0x2b],
      [0xff, 0xad, 0x38],
      [0xff, 0xc4, 0x70],
    ],
    eyes: 'light',
  },
  coral: {
    tones: [
      [0x1c, 0x12, 0x0f],
      [0x3b, 0x1b, 0x14],
      [0x7a, 0x3d, 0x33],
      [0xc2, 0x61, 0x51],
      [0xff, 0x80, 0x6b],
      [0xff, 0xa3, 0x95],
    ],
    eyes: 'light',
  },
  paprika: {
    tones: [
      [0x1c, 0x12, 0x0f],
      [0x38, 0x14, 0x0c],
      [0x6e, 0x20, 0x14],
      [0xae, 0x32, 0x1f],
      [0xe6, 0x42, 0x29],
      [0xed, 0x77, 0x65],
    ],
    eyes: 'light',
  },
  peach: {
    tones: [
      [0x1c, 0x12, 0x0f],
      [0x3b, 0x23, 0x19],
      [0x7a, 0x5d, 0x49],
      [0xc2, 0x93, 0x74],
      [0xff, 0xc2, 0x99],
      [0xff, 0xd3, 0xb6],
    ],
    eyes: 'dark',
  },
  bone: {
    tones: [
      [0x1c, 0x12, 0x0f],
      [0x39, 0x28, 0x21],
      [0x74, 0x71, 0x6a],
      [0xb8, 0xb2, 0xa9],
      [0xf2, 0xeb, 0xde],
      [0xf6, 0xf0, 0xe7],
    ],
    eyes: 'dark',
  },
};

const WHITE: Rgb = [0xff, 0xff, 0xff];

/** How far each dark tone is lifted towards the colour itself on a dark terminal: about what ember's own are. */
const LIFT = [0.34, 0.45, 0.5, 0.6, 0, 0];

/** The mascot's colours on a terminal: its tones on a dark and on a light background, and its eyes. */
export interface TerminalPalette {
  dark: readonly Rgb[];
  light: readonly Rgb[];
  eyes: 'light' | 'dark';
}

/** The mascot's own oranges, from `drawing.ts`, kept as they are. */
const EMBER: Omit<TerminalPalette, 'eyes'> = {
  dark: [
    [0x6a, 0x26, 0x14],
    [0x96, 0x30, 0x16],
    [0xc2, 0x3c, 0x1a],
    [0xe8, 0x4a, 0x20],
    [0xff, 0x5c, 0x30],
    [0xff, 0x8a, 0x5e],
  ],
  light: [
    [0xf0, 0xbc, 0xa6],
    [0xe8, 0x96, 0x74],
    [0xc8, 0x3a, 0x18],
    [0xdc, 0x46, 0x1c],
    [0xf0, 0x52, 0x20],
    [0xff, 0x6e, 0x3e],
  ],
};

/**
 * The colour's tones for a terminal. On a light background the halo is a pale wash of the colour and the body
 * one tone deeper than on a dark one, so even the pale colours stand off white.
 */
export function terminalPalette(color: LookColor): TerminalPalette {
  const { tones, eyes } = DESIGN_TONES[color];
  if (color === 'ember') {
    return { ...EMBER, eyes };
  }

  const body = tones[4];
  const pale = eyes === 'dark';

  return {
    dark: tones.map((tone, level) => mixRgb(tone, body, LIFT[level])),
    light: [
      mixRgb(body, WHITE, pale ? 0.35 : 0.6),
      mixRgb(body, WHITE, pale ? 0.15 : 0.35),
      pale ? tones[2] : mixRgb(tones[2], tones[3], 0.6),
      pale ? mixRgb(tones[2], tones[3], 0.5) : mixRgb(tones[3], body, 0.25),
      pale ? tones[3] : mixRgb(tones[3], body, 0.7),
      pale ? mixRgb(tones[3], body, 0.4) : body,
    ],
    eyes,
  };
}

function mixRgb(from: Rgb, to: Rgb, share: number): Rgb {
  return [
    Math.round(from[0] + (to[0] - from[0]) * share),
    Math.round(from[1] + (to[1] - from[1]) * share),
    Math.round(from[2] + (to[2] - from[2]) * share),
  ];
}

/** Whether `value` is one of the bodies, as the API answers it. */
export function isMascotBody(value: unknown): value is MascotBody {
  return (MASCOT_BODIES as readonly unknown[]).includes(value);
}

/** Whether `value` is one of the colours, as the API answers it. */
export function isLookColor(value: unknown): value is LookColor {
  return (LOOK_COLORS as readonly unknown[]).includes(value);
}
