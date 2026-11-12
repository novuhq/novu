/**
 * An agent's look: its mascot's body and colour, and the art across the top of its card, as its operator picks
 * them in onboarding (`A.1 · Name it, make it yours`). The API keeps it on the agent (`look`); an agent nobody
 * picked one for has the original look, the round orange mascot with rays.
 *
 * The bodies and colours are the design's `Avatar v2 · Body` drawings: six bodies, each a lit, dithered blob on a
 * 120-cell grid, in six colours of six tones each. The mascot is drawn live (`mascot-sphere.ts`), so a body here
 * is an outline around the sphere's middle, fitted to the design's drawing: a radius for every direction, as a
 * sum of eight waves. The orb is the sphere itself, so it draws exactly as the mascot always has.
 */

/** The bodies a mascot can have, in the order the design's Shape picker lists them. */
export const MASCOT_BODIES = ['orb', 'pebble', 'drop', 'bean', 'peek', 'mochi'] as const;

export type MascotBody = (typeof MASCOT_BODIES)[number];

/** The colours of a mascot and its card's art, in the order the design's Color picker lists them. */
export const LOOK_COLORS = ['ember', 'marigold', 'coral', 'paprika', 'peach', 'bone'] as const;

export type LookColor = (typeof LOOK_COLORS)[number];

/** The kinds of dotted drawing across the top of a card. */
export const ART_KINDS = ['rays', 'waves', 'arcs', 'sparkles'] as const;

export type ArtKind = (typeof ART_KINDS)[number];

/** The largest seed the API keeps: any whole number from 0 up to it draws one drawing of its kind. */
export const ART_MAX_SEED = 2_147_483_647;

export type AgentLook = {
  /** The mascot's body. Called its shape on the page, as the design does. */
  shape: MascotBody;
  color: LookColor;
  art: { kind: ArtKind; seed: number };
};

/** The look every agent starts with: today's mascot, an orb in ember, and the design's own rays. */
export const ORIGINAL_LOOK: AgentLook = { shape: 'orb', color: 'ember', art: { kind: 'rays', seed: 0 } };

/** As the design's pickers name them. */
export const BODY_LABELS: Record<MascotBody, string> = {
  orb: 'Orb',
  pebble: 'Pebble',
  drop: 'Drop',
  bean: 'Bean',
  peek: 'Peek',
  mochi: 'Mochi',
};

export const COLOR_LABELS: Record<LookColor, string> = {
  ember: 'Ember',
  marigold: 'Marigold',
  coral: 'Coral',
  paprika: 'Paprika',
  peach: 'Peach',
  bone: 'Bone',
};

/** How the mascot says its colour: "Sid suits me. So does orange." */
export const COLOR_WORDS: Record<LookColor, string> = {
  ember: 'orange',
  marigold: 'yellow',
  coral: 'coral',
  paprika: 'red',
  peach: 'peach',
  bone: 'cream',
};

export type Rgb = readonly [number, number, number];

/**
 * A colour's six tones, from the halo's darkest dot to the highlight, and the colour of the eyes on it: light
 * eyes on the deep colours, dark ones on the pale peach and bone, as the design has them.
 */
export type LookPalette = { tones: readonly [Rgb, Rgb, Rgb, Rgb, Rgb, Rgb]; eyes: 'light' | 'dark' };

/**
 * The design's tones for each colour (`Avatar v2 · Body`, tone0 to tone5). Ember keeps the mascot's own, which
 * its drawings have always used and differ from the design's by a shade.
 */
export const LOOK_PALETTES: Record<LookColor, LookPalette> = {
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

/** The eyes on a deep colour: the mascot's own cream. */
export const LIGHT_EYES: Rgb = [0xee, 0xe5, 0xd8];

/** The eyes on peach and bone: the design's near-black. */
export const DARK_EYES: Rgb = [0x17, 0x12, 0x0f];

/** Ember's art and link on the design's card, a shade off the mascot's own orange. */
const EMBER_CARD: Rgb = [0xff, 0x61, 0x33];

/**
 * The colour of the card's art and its link for each colour: the brightest tone but one, except ember's, which
 * the design draws in its own orange.
 */
export function artColorOf(color: LookColor): Rgb {
  return color === 'ember' ? EMBER_CARD : LOOK_PALETTES[color].tones[4];
}

/**
 * Where a body ends, around its middle, in sphere radii: `radius(θ) = Σ a[k]·cos(kθ) + b[k]·sin(kθ)`, with θ
 * measured from the right, turning down (the screen's y grows downward). `dx` and `dy` move its middle off the
 * sphere's, and `face` is where the middle of its face sits, both in sphere radii.
 */
export type BodyOutline = {
  dx: number;
  dy: number;
  a: readonly number[];
  b: readonly number[];
  face: { x: number; y: number };
};

/**
 * The bodies fitted to the design's drawings (`Avatar v2 · Body`), the orb's radius being 1: each puts all but
 * 1% at most of the design's body cells on the same side of its edge. Peek is a large orb coming in from the
 * lower right: whatever draws it cuts it off at the edges of its square, as the design's tile does.
 */
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
    // The drop narrows to its tip, so its face sits low, where it is widest.
    face: { x: -0.0148, y: 0.2 },
  },
  bean: {
    dx: -0.0013,
    dy: 0.0318,
    a: [0.9279, 0.0016, 0.1715, -0.0044, 0.003, 0.006, 0.006, -0.0026, -0.0023],
    b: [0, 0.0094, -0.0827, -0.0145, -0.0155, 0.0082, -0.0106, -0.0065, 0.0045],
    face: { x: -0.0013, y: 0.0318 },
  },
  peek: {
    dx: 0.4686,
    dy: 0.7265,
    a: [1.7169],
    b: [0],
    // On the part that shows: the orb's own middle, a little to the right and down.
    face: { x: 0.2, y: 0.3 },
  },
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
  return outlineRadiusToward(outline, Math.cos(angle), Math.sin(angle));
}

/**
 * `outlineRadius` in the direction whose cosine and sine are given. Each term's angle is the one before it turned
 * once more, so a drawing that asks this for every one of its pixels makes no trigonometric call at all: that is
 * what lets a whole row of swatches bend into a new body at once without dropping frames.
 */
export function outlineRadiusToward(outline: BodyOutline, cos: number, sin: number): number {
  let radius = outline.a[0];
  let termCos = 1;
  let termSin = 0;

  for (let k = 1; k < outline.a.length; k += 1) {
    const turnedCos = termCos * cos - termSin * sin;
    termSin = termSin * cos + termCos * sin;
    termCos = turnedCos;
    radius += outline.a[k] * termCos + outline.b[k] * termSin;
  }

  return radius;
}

/**
 * A body on its way from `from` to `to`: every measure `share` of the way there. At 0 and 1 it is exactly the one
 * at that end, so a finished morph draws the body itself.
 */
export function mixOutlines(from: BodyOutline, to: BodyOutline, share: number): BodyOutline {
  if (share <= 0) {
    return from;
  }
  if (share >= 1) {
    return to;
  }

  const terms = Math.max(from.a.length, to.a.length);
  const mix = (a: number, b: number) => a + (b - a) * share;
  const at = (list: readonly number[], k: number) => list[k] ?? 0;

  return {
    dx: mix(from.dx, to.dx),
    dy: mix(from.dy, to.dy),
    a: Array.from({ length: terms }, (_, k) => mix(at(from.a, k), at(to.a, k))),
    b: Array.from({ length: terms }, (_, k) => mix(at(from.b, k), at(to.b, k))),
    face: { x: mix(from.face.x, to.face.x), y: mix(from.face.y, to.face.y) },
  };
}

/** The same colour `share` of the way from one to the other. */
export function mixRgb(from: Rgb, to: Rgb, share: number): Rgb {
  return [
    Math.round(from[0] + (to[0] - from[0]) * share),
    Math.round(from[1] + (to[1] - from[1]) * share),
    Math.round(from[2] + (to[2] - from[2]) * share),
  ];
}

/** Whether `value` is a look the API could have answered, so a look from elsewhere is never trusted blindly. */
export function isAgentLook(value: unknown): value is AgentLook {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const look = value as Partial<AgentLook>;
  const art = look.art as Partial<AgentLook['art']> | undefined;

  return (
    (MASCOT_BODIES as readonly unknown[]).includes(look.shape) &&
    (LOOK_COLORS as readonly unknown[]).includes(look.color) &&
    !!art &&
    (ART_KINDS as readonly unknown[]).includes(art.kind) &&
    Number.isInteger(art.seed) &&
    (art.seed as number) >= 0 &&
    (art.seed as number) <= ART_MAX_SEED
  );
}

/** The look as the API answered it, or the original look where it answered none or one this page doesn't know. */
export function lookOf(value: unknown): AgentLook {
  return isAgentLook(value) ? value : ORIGINAL_LOOK;
}

/** Whether two looks draw the same. */
export function sameLook(a: AgentLook, b: AgentLook): boolean {
  return a.shape === b.shape && a.color === b.color && a.art.kind === b.art.kind && a.art.seed === b.art.seed;
}
