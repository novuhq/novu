import {
  BODY_OUTLINES,
  type BodyOutline,
  DARK_EYES,
  LIGHT_EYES,
  LOOK_PALETTES,
  type LookColor,
  type MascotBody,
  mixOutlines,
  mixRgb,
  outlineRadiusToward,
  type Rgb,
} from './look';

/**
 * Draws the agent mascot the way the design system's drawing is made: a lit sphere in six oranges,
 * ordered-dithered on a pixel grid, with a dotted halo and two eyes. Drawing it instead of showing the
 * exported picture is what lets it turn: the light and the eyes move across the sphere with the pose.
 * At rest it reproduces the exported `mascot-idle.svg` (48px grid) and `mascot-waiting.svg` (120px grid).
 *
 * Its body and colour can be any of an agent's looks (`look.ts`): the body bends the sphere's outline, and
 * the light, the halo and the eyes follow it; the colour swaps the six tones. The orb in ember is the mascot
 * as it always was, pixel for pixel. Where an agent's look is shown, it is drawn as the design's `Avatar v2`
 * instead (`MascotLook.avatar`): the same bodies and tones, shaded the way that drawing is.
 */

/**
 * `awake` has open eyes that can blink. `happy` has them curved up into arcs, as in `mascot-happy.svg`.
 * `asleep` has them shut, as in `mascot-asleep.svg`.
 */
export type MascotMood = 'awake' | 'happy' | 'asleep';

export type MascotPose = {
  /** How far the mascot has turned to the right, in radians. Negative is left. */
  yaw: number;
  /** How far it has turned down, in radians. Negative is up. */
  pitch: number;
  /** 0 with the eyes open, 1 with them shut. */
  blink: number;
  /**
   * 0 with the eyes open, 1 with them curved up into the happy arcs. Anything in between is an eye on
   * its way from one to the other, which is how an awake mascot turns happy and back.
   */
  joy: number;
};

export const MASCOT_AT_REST: MascotPose = { yaw: 0, pitch: 0, blink: 0, joy: 0 };

export type MascotLook = {
  /**
   * Faces straight ahead at rest. The design's awake drawing looks a touch to the right, and so does the
   * mascot drawn here unless this is set. Where it goes back and forth between open and happy eyes it
   * has to face ahead: the happy drawing does, and the eyes would step sideways with every change.
   */
  ahead?: boolean;
  /**
   * Drawn for light paper: the shadow side stays orange instead of going near black, and the halo is a
   * sparse scatter of pale dots instead of a dark ring.
   */
  paper?: boolean;
  /**
   * Drawn as the design's `Avatar v2`, the mascot of the looks an agent picks: no lit ball, but the tones in rings
   * that follow the body's own outline out from a highlight up and to the left, a dark rim all the way round, and
   * a glow of the darkest tone only. Every body reads by its whole outline this way, where a lit ball loses its
   * shadow side in the dark. Its sphere fills `AVATAR_RADIUS` of the square, as the design's does.
   */
  avatar?: boolean;
};

/** The share of its square an `Avatar v2` sphere's radius takes, rim included, as the design draws it. */
export const AVATAR_RADIUS = 0.3584;

/**
 * What the mascot is made of: its body's outline, its colour's six tones from the halo's darkest dot to the
 * highlight (level 0 is nothing at all), and the colour of its eyes.
 */
export type MascotForm = { outline: BodyOutline; tones: readonly Rgb[]; eyes: Rgb };

/** The mascot as it always was: the orb in ember, with cream eyes. */
export const ORIGINAL_FORM: MascotForm = formOf('orb', 'ember');

/** The mascot with this body in this colour. */
export function formOf(body: MascotBody, color: LookColor): MascotForm {
  const palette = LOOK_PALETTES[color];

  return {
    outline: BODY_OUTLINES[body],
    tones: palette.tones,
    eyes: palette.eyes === 'dark' ? DARK_EYES : LIGHT_EYES,
  };
}

/** A mascot on its way from one form to the other, `share` of the way: the outline bends, the tones blend. */
export function mixForms(from: MascotForm, to: MascotForm, share: number): MascotForm {
  if (share <= 0) {
    return from;
  }
  if (share >= 1) {
    return to;
  }

  return {
    outline: mixOutlines(from.outline, to.outline, share),
    tones: from.tones.map((tone, index) => mixRgb(tone, to.tones[index], share)),
    eyes: mixRgb(from.eyes, to.eyes, share),
  };
}

const PAPER_PALETTE = [
  [0xe4, 0x6e, 0x4c],
  [0xee, 0x76, 0x52],
  [0xf6, 0x7e, 0x58],
  [0xfb, 0x8c, 0x66],
  [0xfd, 0xa6, 0x88],
  [0xff, 0xcc, 0xb8],
];

const PAPER_EYE_COLOR = [0xff, 0xf8, 0xf1];

/** On paper the halo is one pale dot colour, thinned to this share of its dark-mode strength. */
const PAPER_HALO_COLOR = [0xf8, 0xc6, 0xb4];
const PAPER_HALO_STRENGTH = 0.24;

/** A 4x4 Bayer matrix: which pixels of a shade in between two levels take the brighter one. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** How far the sphere's middle sits below the grid's, as a share of the grid. */
const CENTER_DROP = 0.008;

/** Where the halo has faded to nothing, in sphere radii from the middle. */
const HALO_REACH = 1.62;

/** The glow right at the sphere: what every side gets, and what the lit edge adds on top. */
const HALO_AMBIENT = 1.25;
const HALO_SPILL = 1.5;

/** Where the light comes from at rest: up and to the left, in front. */
const LIGHT = { x: -0.5, y: -0.56, z: 0.66 };

/** How far the light swings along when the mascot turns. This is what moves the shading. */
const LIGHT_SWING = 0.7;

/** The eyes on the sphere, seen from the front, and their size in sphere radii. */
const EYE_SPREAD = 0.34;
const EYE_HEIGHT = -0.14;
const EYE_HALF_WIDTH = 0.092;
const EYE_HALF_HEIGHT = 0.16;

/**
 * A shut eye, as in the sleeping mascot's drawing (`mascot-asleep.svg`): a flat dash, wider than the
 * open eye and two of that drawing's pixels tall. While it shuts, the oval flattens, widens and squares
 * off into it.
 */
const SHUT_EYE_HALF_WIDTH = 0.154;
const SHUT_EYE_HEIGHT = 0.1;
const SHUT_EYE_DROP = 1.17;
const SHUT_EYE_CORNERS = 14;

/**
 * A happy eye is an arc: the top of an oval this size, with a smaller oval cut out of it from below.
 * The sizes are in sphere radii; the cut is given as shares of the arc's own size.
 */
const HAPPY_EYE_HALF_WIDTH = 0.162;
const HAPPY_EYE_HALF_HEIGHT = 0.216;
const HAPPY_EYE_HEIGHT = 0.054;
const HAPPY_EYE_CUT = { width: 0.864, height: 0.574, drop: 0.125 };

/** How far below the middle of its oval the arc ends, as a share of the oval's height. */
const HAPPY_EYE_LID = 0.1;

/** Where the cut sits while the eye is still open: right under the oval, touching its lowest point. */
const HAPPY_EYE_CUT_BELOW = 1 + HAPPY_EYE_CUT.height;

/** The awake drawing already looks a touch to the right. The other two face straight ahead. */
const REST_YAW = 0.08;

/*
 * `Avatar v2`, measured cell by cell from the design's six bodies (120-cell grids, sphere radius 43 cells): its
 * tones are bands of one radial gradient, the body's own outline being its outer ring and a point up and to the
 * left its middle, ordered-dithered across narrow seams between them. These numbers draw 89% of the body's cells
 * and 97% of the glow's exactly as the design does, and the rest one tone off at a seam.
 */

/** The gradient's middle, the highlight, in the body's own radii from its middle. */
const AVATAR_HIGHLIGHT = { x: -0.319, y: -0.315 };

/**
 * How near the body's edge the highlight may come, in the body's radii, as the mascot turns: any nearer and the
 * rings on that side would crowd into a single line.
 */
const AVATAR_HIGHLIGHT_REACH = 0.8;

/**
 * Where one tone gives way to the next brighter one, as shares of the way from the edge's rim (1) to the
 * highlight (0): the rim is the second-darkest tone, and every seam passed towards the highlight is one tone up.
 */
const AVATAR_SEAMS = [0.929, 0.76, 0.541, 0.3];

/** How wide a seam's dither is, in the same shares. */
const AVATAR_SEAM_DITHER = 0.139;

/**
 * The glow, in the darkest tone only: this share of its cells lit right at the edge, thinning out evenly to none
 * at `reach` sphere radii beyond it. It reaches as far beyond every body, however wide.
 */
const AVATAR_GLOW = { atEdge: 0.61, reach: 0.265 };

/**
 * Fills `pixels` (RGBA, `size` x `size`) with the mascot in `pose`. `radiusShare` is the sphere's radius
 * as a share of the grid: 0.308 leaves room for the whole halo, 0.406 fills an avatar with the sphere. `form`
 * is its body and colour; a body bigger than the sphere, such as peek, is cut off at the grid's edges. Paper
 * is only ever drawn for the original form, the one the landing page shows.
 */
export function drawMascot(
  pixels: Uint8ClampedArray,
  size: number,
  pose: MascotPose,
  radiusShare: number,
  mood: MascotMood = 'awake',
  look: MascotLook = {},
  form: MascotForm = ORIGINAL_FORM
): void {
  const radius = size * radiusShare;
  const centerX = size / 2;
  const centerY = size / 2 + size * CENTER_DROP;

  const lightX = LIGHT.x + Math.sin(pose.yaw) * LIGHT_SWING;
  const lightY = LIGHT.y + Math.sin(pose.pitch) * LIGHT_SWING;
  const lightLength = Math.hypot(lightX, lightY, LIGHT.z);
  const light = { x: lightX / lightLength, y: lightY / lightLength, z: LIGHT.z / lightLength };
  const highlight = avatarHighlight(pose, form.outline);
  // An avatar faces straight ahead at rest, as the design draws it, so its eyes and its highlight turn as one.
  const faceLook = look.avatar ? { ...look, ahead: true } : look;

  const { face } = form.outline;
  const eyes = matchEyes(
    [placeEye(-EYE_SPREAD, pose, radius, mood, faceLook), placeEye(EYE_SPREAD, pose, radius, mood, faceLook)].map(
      (eye) => eye && { ...eye, x: eye.x + face.x, y: eye.y + face.y }
    ),
    radius,
    centerX,
    centerY
  );

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column + 0.5 - centerX) / radius;
      const y = (row + 0.5 - centerY) / radius;
      const offset = (row * size + column) * 4;
      const threshold = (BAYER[row & 3][column & 3] + 0.5) / 16;
      const color = look.avatar
        ? avatarColorAt(x, y, threshold, eyes, highlight, form)
        : colorAt(x, y, threshold, eyes, light, look.paper ?? false, form);

      if (color) {
        paint(pixels, offset, color);
      } else {
        pixels[offset + 3] = 0;
      }
    }
  }
}

/**
 * The colour of the pixel at `x`, `y` (in sphere radii from the middle), or `null` where nothing is drawn. The
 * body is lit as if it were the sphere stretched to its outline: a point some share of the way from the body's
 * middle to its edge is shaded as the point that share of the way across the sphere, in the same direction.
 */
function colorAt(
  x: number,
  y: number,
  threshold: number,
  eyes: Array<Eye | null>,
  light: { x: number; y: number; z: number },
  paper: boolean,
  form: MascotForm
): readonly number[] | null {
  const { outline } = form;
  const fromX = x - outline.dx;
  const fromY = y - outline.dy;
  // A round body reaches as far every way, so it needs no direction: the orb stays exactly the sphere it was.
  const fromMiddle = Math.sqrt(fromX * fromX + fromY * fromY);
  const reach =
    outline.a.length === 1
      ? outline.a[0]
      : outlineRadiusToward(outline, fromMiddle ? fromX / fromMiddle : 1, fromMiddle ? fromY / fromMiddle : 0);
  const bodyX = fromX / reach;
  const bodyY = fromY / reach;
  const distanceSquared = bodyX * bodyX + bodyY * bodyY;
  const onSphere = distanceSquared <= 1;

  if (onSphere && eyes.some((eye) => eye && isInEye(eye, x, y))) {
    return paper ? PAPER_EYE_COLOR : form.eyes;
  }

  const shade = onSphere
    ? shadeOfSphere(bodyX, bodyY, Math.sqrt(1 - distanceSquared), light)
    : shadeOfHalo(bodyX, bodyY, Math.sqrt(distanceSquared), light) * (paper ? PAPER_HALO_STRENGTH : 1);
  const palette = paper ? PAPER_PALETTE : form.tones;
  const level = Math.min(palette.length, Math.floor(shade) + (shade - Math.floor(shade) > threshold ? 1 : 0));

  if (level <= 0) {
    return null;
  }

  return paper && !onSphere ? PAPER_HALO_COLOR : palette[level - 1];
}

/** The colour of the pixel at `x`, `y` (in sphere radii from the middle) as `Avatar v2` draws it, or `null`. */
function avatarColorAt(
  x: number,
  y: number,
  threshold: number,
  eyes: Array<Eye | null>,
  highlight: { x: number; y: number },
  form: MascotForm
): readonly number[] | null {
  const { outline, tones } = form;
  const fromX = x - outline.dx;
  const fromY = y - outline.dy;
  const fromMiddle = Math.sqrt(fromX * fromX + fromY * fromY);
  const reach =
    outline.a.length === 1
      ? outline.a[0]
      : outlineRadiusToward(outline, fromMiddle ? fromX / fromMiddle : 1, fromMiddle ? fromY / fromMiddle : 0);

  if (fromMiddle > reach) {
    const glow = AVATAR_GLOW.atEdge * (1 - (fromMiddle - reach) / AVATAR_GLOW.reach);

    return glow > threshold ? tones[0] : null;
  }

  if (eyes.some((eye) => eye && isInEye(eye, x, y))) {
    return form.eyes;
  }

  const across = shareFromHighlight(fromX / reach, fromY / reach, highlight);
  const dither = AVATAR_SEAM_DITHER * (threshold - 0.5);
  let level = 2;
  for (const seam of AVATAR_SEAMS) {
    if (across < seam + dither) {
      level += 1;
    }
  }

  return tones[level - 1];
}

/**
 * Where an avatar's highlight sits with the mascot in `pose`, in the body's own radii from its middle. It moves
 * exactly as far as the middle of the face does when the eyes turn (`placeEye`), so the shading and the eyes go
 * round together. A highlight that moved less made the eyes slide over a body that seemed to lag behind them.
 */
function avatarHighlight(pose: MascotPose, outline: BodyOutline): { x: number; y: number } {
  // The middle of the face, between the eyes, turned the way `placeEye` turns each eye.
  const front = Math.sqrt(1 - EYE_HEIGHT * EYE_HEIGHT);
  const faceX = front * Math.sin(pose.yaw);
  const faceY = EYE_HEIGHT * Math.cos(pose.pitch) + front * Math.cos(pose.yaw) * Math.sin(pose.pitch);
  // From sphere radii to the body's, which the gradient is drawn in.
  const perBody = 1 / outline.a[0];
  let x = AVATAR_HIGHLIGHT.x + faceX * perBody;
  let y = AVATAR_HIGHLIGHT.y + (faceY - EYE_HEIGHT) * perBody;

  const away = Math.sqrt(x * x + y * y);
  if (away > AVATAR_HIGHLIGHT_REACH) {
    x *= AVATAR_HIGHLIGHT_REACH / away;
    y *= AVATAR_HIGHLIGHT_REACH / away;
  }

  return { x, y };
}

/**
 * How far the point `x`, `y` of the unit disc is from `highlight` towards the disc's edge, along the line from the
 * highlight through it: 0 at the highlight and 1 at the edge, whichever way. This is a radial gradient whose middle
 * sits off centre, as a design tool draws one.
 */
function shareFromHighlight(x: number, y: number, highlight: { x: number; y: number }): number {
  const awayX = x - highlight.x;
  const awayY = y - highlight.y;
  const away = Math.sqrt(awayX * awayX + awayY * awayY);
  if (!away) {
    return 0;
  }

  // The rest of the way to the edge along that line, from |highlight + edge·direction| = 1.
  const along = (highlight.x * awayX + highlight.y * awayY) / away;
  const toEdge = -along + Math.sqrt(along * along - (highlight.x * highlight.x + highlight.y * highlight.y) + 1);

  return away / toEdge;
}

function paint(pixels: Uint8ClampedArray, offset: number, color: readonly number[]) {
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = 255;
}

/** Lit from one side, with a faint rim on the dark side so the sphere doesn't melt into its halo. */
function shadeOfSphere(x: number, y: number, z: number, light: { x: number; y: number; z: number }): number {
  const lit = Math.max(0, x * light.x + y * light.y + z * light.z);
  const rim = (1 - z) ** 1.5 * (1 - lit);

  return 1.25 + 4.6 * lit ** 1.3 + 0.5 * rim;
}

/**
 * The glow around the sphere is light spilling off it, so it follows the sphere's own edge: strongest
 * beside the lit edge, faint beside the one in shadow. When the mascot turns and the light swings, the
 * glow travels round the sphere with the highlight. It never changes shape or slides: a glow that
 * bulged to one side read as a second outline.
 */
function shadeOfHalo(x: number, y: number, distance: number, light: { x: number; y: number }): number {
  const edgeLit = Math.max(0, (x * light.x + y * light.y) / distance);
  const fade = Math.max(0, 1 - (distance - 1) / (HALO_REACH - 1)) ** 1.5;

  return (HALO_AMBIENT + HALO_SPILL * edgeLit) * fade;
}

type Eye = {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
  /** 2 draws an oval; the higher it goes, the squarer the corners. */
  corners: number;
  /** 0 draws the whole oval, 1 only its arc, and in between an oval that is turning into the arc. */
  joy: number;
};

/** `from` at 0 and `to` at 1, exactly: the drawings at either end stay the ones of the design. */
function mix(from: number, to: number, share: number): number {
  return from * (1 - share) + to * share;
}

/**
 * Where an eye lands once the sphere has turned, or `null` when it has gone round the back.
 *
 * An eye that is turning happy is every measure of the open eye on its way to that of the happy one:
 * it sinks, widens and stops looking to the side, while `isInEye` brings its lower lid up.
 */
function placeEye(side: number, pose: MascotPose, radius: number, mood: MascotMood, look: MascotLook): Eye | null {
  const joy = mood === 'happy' ? 1 : mood === 'asleep' ? 0 : Math.max(0, Math.min(1, pose.joy));
  const front = Math.sqrt(1 - side * side - EYE_HEIGHT * EYE_HEIGHT);
  const yaw = (mood === 'awake' && !look.ahead ? REST_YAW * (1 - joy) : 0) + pose.yaw;
  // A happy eye doesn't blink.
  const blink = mood === 'asleep' ? 1 : pose.blink * (1 - joy);
  // The lid comes down: a shutting eye ends up at its own lower edge, not at its middle.
  const height = mix(EYE_HEIGHT + EYE_HALF_HEIGHT * SHUT_EYE_DROP * blink, HAPPY_EYE_HEIGHT, joy);

  // Turn about the upright axis, then about the level one.
  const x = side * Math.cos(yaw) + front * Math.sin(yaw);
  const depth = -side * Math.sin(yaw) + front * Math.cos(yaw);
  const y = height * Math.cos(pose.pitch) + depth * Math.sin(pose.pitch);
  const z = -height * Math.sin(pose.pitch) + depth * Math.cos(pose.pitch);
  if (z <= 0.05) {
    return null;
  }

  // An eye near the edge is seen from the side, so it gets narrower.
  const narrowing = z / front;

  const openWidth = EYE_HALF_WIDTH + (SHUT_EYE_HALF_WIDTH - EYE_HALF_WIDTH) * blink;
  const openHalfWidth = Math.max(openWidth * narrowing, 0.6 / radius);
  // A shut eye is a whole number of pixel rows: two on the small grid, four on the large one.
  const openHalfHeight = Math.max(
    EYE_HALF_HEIGHT * (1 - blink),
    Math.max(1, Math.round(radius * SHUT_EYE_HEIGHT)) / 2 / radius
  );

  return {
    x,
    y,
    halfWidth: mix(openHalfWidth, HAPPY_EYE_HALF_WIDTH * narrowing, joy),
    halfHeight: mix(openHalfHeight, HAPPY_EYE_HALF_HEIGHT, joy),
    corners: mix(2 + SHUT_EYE_CORNERS * blink, 2, joy),
    joy,
  };
}

/**
 * Makes the two eyes the very same shape, pixel for pixel. Left alone they come out a little different:
 * each sits at its own fraction of a pixel, and the one further round the sphere is narrower. So both get
 * one size, and each is moved to the nearest spot where that size falls on whole pixels.
 */
function matchEyes(eyes: Array<Eye | null>, radius: number, centerX: number, centerY: number): Array<Eye | null> {
  const seen = eyes.filter((eye): eye is Eye => eye !== null);
  if (seen.length === 0) {
    return eyes;
  }

  const halfWidth = seen.reduce((sum, eye) => sum + eye.halfWidth, 0) / seen.length;
  const { halfHeight } = seen[0];

  return eyes.map(
    (eye) =>
      eye && {
        ...eye,
        halfWidth,
        x: (snap(eye.x * radius + centerX, halfWidth * radius) - centerX) / radius,
        y: (snap(eye.y * radius + centerY, halfHeight * radius) - centerY) / radius,
      }
  );
}

/**
 * The nearest place for the middle of something `halfSize` pixels to either side: on the middle of a
 * pixel when it covers an odd number of them, on the line between two when it covers an even number.
 */
function snap(position: number, halfSize: number): number {
  const covered = Math.max(1, Math.round(halfSize * 2));

  return covered % 2 === 1 ? Math.floor(position) + 0.5 : Math.round(position);
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
 * An eye between the open oval and the happy arc: its lower lid is coming up. The line the arc ends at
 * rises from the oval's lowest point to its place, and the oval that hollows the arc out comes up from
 * underneath it. Both are where the arc has them once `joy` is 1, and out of the way while it is 0.
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
