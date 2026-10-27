/**
 * Draws the agent mascot the way the design system's drawing is made: a lit sphere in six oranges,
 * ordered-dithered on a pixel grid, with a dotted halo and two eyes. Drawing it instead of showing the
 * exported picture is what lets it turn: the light and the eyes move across the sphere with the pose.
 * At rest it reproduces the exported `mascot-idle.svg` (48px grid) and `mascot-waiting.svg` (120px grid).
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
};

/** From the halo's darkest dot to the highlight. Level 0 is nothing at all. */
const PALETTE = [
  [0x1c, 0x13, 0x10],
  [0x3a, 0x1a, 0x10],
  [0x7a, 0x28, 0x12],
  [0xc2, 0x40, 0x1c],
  [0xff, 0x5c, 0x30],
  [0xff, 0x8a, 0x5e],
];

const EYE_COLOR = [0xee, 0xe5, 0xd8];

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

/**
 * Fills `pixels` (RGBA, `size` x `size`) with the mascot in `pose`. `radiusShare` is the sphere's radius
 * as a share of the grid: 0.308 leaves room for the whole halo, 0.406 fills an avatar with the sphere.
 */
export function drawMascot(
  pixels: Uint8ClampedArray,
  size: number,
  pose: MascotPose,
  radiusShare: number,
  mood: MascotMood = 'awake',
  look: MascotLook = {}
): void {
  const radius = size * radiusShare;
  const centerX = size / 2;
  const centerY = size / 2 + size * CENTER_DROP;

  const lightX = LIGHT.x + Math.sin(pose.yaw) * LIGHT_SWING;
  const lightY = LIGHT.y + Math.sin(pose.pitch) * LIGHT_SWING;
  const lightLength = Math.hypot(lightX, lightY, LIGHT.z);
  const light = { x: lightX / lightLength, y: lightY / lightLength, z: LIGHT.z / lightLength };

  const eyes = matchEyes(
    [placeEye(-EYE_SPREAD, pose, radius, mood, look), placeEye(EYE_SPREAD, pose, radius, mood, look)],
    radius,
    centerX,
    centerY
  );

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const x = (column + 0.5 - centerX) / radius;
      const y = (row + 0.5 - centerY) / radius;
      const distanceSquared = x * x + y * y;
      const offset = (row * size + column) * 4;

      if (distanceSquared <= 1 && eyes.some((eye) => eye && isInEye(eye, x, y))) {
        paint(pixels, offset, EYE_COLOR);
        continue;
      }

      const shade =
        distanceSquared <= 1
          ? shadeOfSphere(x, y, Math.sqrt(1 - distanceSquared), light)
          : shadeOfHalo(x, y, Math.sqrt(distanceSquared), light);
      const threshold = (BAYER[row & 3][column & 3] + 0.5) / 16;
      const level = Math.min(PALETTE.length, Math.floor(shade) + (shade - Math.floor(shade) > threshold ? 1 : 0));

      if (level <= 0) {
        pixels[offset + 3] = 0;
      } else {
        paint(pixels, offset, PALETTE[level - 1]);
      }
    }
  }
}

function paint(pixels: Uint8ClampedArray, offset: number, color: number[]) {
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
