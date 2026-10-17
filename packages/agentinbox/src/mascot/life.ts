import type { MascotFace } from './drawing';

/**
 * What the mascot feels, after the dashboard's (`apps/human-dashboard/src/components/ui/mascot-face.tsx`),
 * whose timings are used here. Its face never moves; only its eyes do:
 * - `awake`: open eyes that blink every 3.2 to 7 seconds, now and then twice;
 * - `thinking`: the same face, while something is under way;
 * - `happy`: it smiles, then looks ahead with open eyes for a while, and smiles again;
 * - `asleep`: the eyes close softly and stay shut.
 */
export type Emotion = 'awake' | 'thinking' | 'happy' | 'asleep';

/** The mascot at one moment. */
export interface MascotMoment {
  face: MascotFace;
  /** Nothing moves any more, not even the dots: it is asleep with its eyes shut. */
  still: boolean;
  /** It has come to rest on the emotion it was asked to end on (see {@link MascotLife.settle}). */
  settled: boolean;
}

export interface MascotLife {
  /** Changes what it feels; the eyes take their time to follow. */
  feel(emotion: Emotion, now: number): void;
  /** Ends on `emotion`: no more blinks, and a happy mascot keeps smiling instead of looking ahead again. */
  settle(emotion: Emotion, now: number): void;
  /** Its face at `now`, in milliseconds. Time is what moves it, so a slow terminal doesn't slow it down. */
  frame(now: number): MascotMoment;
}

/** A blink: the eyes take this long to shut and to open again. */
const BLINK_CLOSE_MS = 140;
const BLINK_OPEN_MS = 200;
const BLINK_MS = BLINK_CLOSE_MS + BLINK_OPEN_MS;
const BLINK_EVERY_MS = { min: 3200, max: 7000 };

/** Most blinks are single. Now and then it blinks twice, with this short a pause in between. */
const DOUBLE_BLINK_CHANCE = 0.3;
const DOUBLE_BLINK_PAUSE_MS = 90;

/** How long the eyes take to turn from open to happy, or back. */
const TURNS_HAPPY_IN_MS = 420;

/** How long it smiles at a time while happy, and how long it looks ahead with open eyes in between. */
const BEAMS_FOR_MS = { min: 1600, max: 3000 };
const BEAMS_EVERY_MS = { min: 4000, max: 9000 };

/** How long the eyes take to close when it falls asleep, and to open again when it wakes. */
const FALLS_ASLEEP_IN_MS = 520;

/** The face of each emotion, standing still: what stays on screen once a command is done. */
export function restingFace(emotion: Emotion): MascotFace {
  return { blink: emotion === 'asleep' ? 1 : 0, joy: emotion === 'happy' ? 1 : 0 };
}

/** Time is played out in steps this short, so changes that follow one another within a frame take turns. */
const STEP_MS = 5;

/** The most time one frame plays out: every change is long over by then, and a long pause costs nothing. */
const CATCH_UP_MS = 2000;

/**
 * The mascot's life over time. The eyes change one thing at a time, each eased in and out: a blink under way
 * finishes first, eyes that were shut open before they smile, and a smile goes before the eyes close. So no
 * change of emotion ever jumps from one face to another.
 */
export function createMascotLife({
  emotion: first = 'awake',
  random = Math.random,
}: {
  emotion?: Emotion;
  /** A number from 0 to 1, as `Math.random` gives; tests pass their own. */
  random?: () => number;
} = {}): MascotLife {
  let emotion = first;
  let settling = false;
  let last: number | undefined;
  // How far the eyes have turned happy and how far they have shut, each at an even pace from 0 to 1.
  let turned = 0;
  let shut = 0;
  // While happy, whether it smiles right now, and when that changes.
  let beaming = emotion === 'happy';
  let beamTurn: number | undefined;
  // The blink under way, if any, and when the next one is due, once the eyes are free to blink.
  let blinkStart: number | undefined;
  let blinks = 1;
  let nextBlink: number | undefined;

  const between = ({ min, max }: { min: number; max: number }) => min + random() * (max - min);
  const blinkLength = () => blinks * BLINK_MS + (blinks - 1) * DOUBLE_BLINK_PAUSE_MS;

  /** How shut the eyes are at `time` in the blink under way: 0 in the pause between the two of a double one. */
  const blinkAt = (time: number): number | undefined => {
    if (blinkStart === undefined) {
      return undefined;
    }

    const within = (time - blinkStart) % (BLINK_MS + DOUBLE_BLINK_PAUSE_MS);
    if (within < BLINK_CLOSE_MS) {
      return ease(within / BLINK_CLOSE_MS);
    }

    return within < BLINK_MS ? 1 - ease((within - BLINK_CLOSE_MS) / BLINK_OPEN_MS) : 0;
  };

  /** While happy, it smiles for a while, then looks ahead with open eyes for a while, and so on. */
  const beam = (time: number) => {
    if (emotion !== 'happy' || settling) {
      return;
    }

    beamTurn ??= time + between(BEAMS_FOR_MS);
    if (time >= beamTurn) {
      beaming = !beaming;
      beamTurn = time + between(beaming ? BEAMS_FOR_MS : BEAMS_EVERY_MS);
    }
  };

  /** Ends the blink that is over, and starts the next when it is due, if the eyes are `free` to blink. */
  const blink = (time: number, free: boolean) => {
    if (blinkStart !== undefined && time >= blinkStart + blinkLength()) {
      blinkStart = undefined;
      nextBlink = undefined;
    }
    if (blinkStart !== undefined) {
      return;
    }

    // It blinks with its eyes wide open only; the next blink comes a while after they are again.
    if (!free) {
      nextBlink = undefined;

      return;
    }

    nextBlink ??= time + between(BLINK_EVERY_MS);
    if (time >= nextBlink) {
      blinkStart = nextBlink;
      blinks = random() < DOUBLE_BLINK_CHANCE ? 2 : 1;
    }
  };

  /** Moves the eyes `elapsed` milliseconds' worth towards the face of the emotion, one change at a time. */
  const turnEyes = (elapsed: number, happy: number, asleep: number) => {
    if (turned !== happy && (happy === 0 || shut === 0)) {
      turned = toward(turned, happy, elapsed / TURNS_HAPPY_IN_MS);
    } else if (shut !== asleep && (asleep === 0 || turned === 0)) {
      shut = toward(shut, asleep, elapsed / FALLS_ASLEEP_IN_MS);
    }
  };

  /** Plays out the `elapsed` milliseconds from `time` on, as things stand at `time`. */
  const step = (time: number, elapsed: number) => {
    beam(time);
    const happy = emotion === 'happy' && beaming ? 1 : 0;
    const asleep = emotion === 'asleep' ? 1 : 0;

    blink(time, !settling && !happy && !asleep && turned === 0 && shut === 0);
    // A blink under way finishes first.
    if (blinkStart === undefined) {
      turnEyes(elapsed, happy, asleep);
    }
  };

  /** Brings everything up to `now`. */
  const advance = (now: number) => {
    if (last === undefined) {
      step(now, 0);
    } else {
      for (let time = Math.max(last, now - CATCH_UP_MS); time < now; time += STEP_MS) {
        step(time, Math.min(STEP_MS, now - time));
      }
    }
    last = Math.max(last ?? now, now);
  };

  const feel = (next: Emotion, now: number) => {
    if (next === emotion) {
      return;
    }

    // What it felt until now still counts until now.
    advance(now);
    emotion = next;
    if (next === 'happy') {
      beaming = true;
      beamTurn = now + between(BEAMS_FOR_MS);
    }
  };

  return {
    feel,
    settle: (next, now) => {
      feel(next, now);
      settling = true;
      beaming = true;
    },
    frame: (now) => {
      advance(now);
      const blinking = blinkAt(now);
      const resting = restingFace(emotion);

      return {
        face: { blink: Math.max(blinking ?? 0, ease(shut)), joy: ease(turned) },
        still: emotion === 'asleep' && shut === 1,
        settled: settling && blinking === undefined && turned === resting.joy && shut === resting.blink,
      };
    },
  };
}

/** Slow at both ends, so neither the eyelids nor a smile snap. */
function ease(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

/** `value` moved by `step` towards `target`, and onto it once it is there, give or take rounding. */
function toward(value: number, target: number, step: number): number {
  const moved = target > value ? Math.min(target, value + step) : Math.max(target, value - step);

  return Math.abs(target - moved) < 1e-9 ? target : moved;
}
