'use client';

import { useEffect, useRef, useState } from 'react';

import { drawMascot, MASCOT_AT_REST, type MascotMood, type MascotPose } from '@/lib/mascot-sphere';
import { cn } from '@/lib/utils';

/** `idle` is the small mascot of avatars; `waiting` is the large one with its whole halo. */
export type MascotArt = 'idle' | 'waiting';

/** The pixel grid each drawing is made on, and how much of it the sphere takes. */
const ART: Record<MascotArt, { grid: number; radius: number }> = {
  idle: { grid: 48, radius: 0.406 },
  waiting: { grid: 120, radius: 0.308 },
};

/** How far the mascot turns towards the pointer at most, in radians. */
const MAX_YAW = 0.4;
const MAX_PITCH = 0.3;

/** A pointer this far from the mascot, in pixels, turns it all the way. */
const FULL_TURN_AT = 520;

/** With the pointer still for this long, the mascot stops looking at it and faces forward again. */
const LOSES_INTEREST_AFTER_MS = 5000;

/** How long it takes to turn back to face forward. It starts fast and slows all the way to a stop. */
const TURNS_BACK_IN_MS = 800;

/** The share of the way to its target the mascot covers per frame: lower is heavier. */
const EASE = 0.09;

/** A blink: the eyes take this long to shut and to open again, and then stay open for a while. */
const BLINK_CLOSE_MS = 140;
const BLINK_OPEN_MS = 200;
const BLINK_EVERY_MS = { min: 3200, max: 7000 };

/** Most blinks are single. Now and then it blinks twice, with this short a pause in between. */
const DOUBLE_BLINK_CHANCE = 0.3;
const DOUBLE_BLINK_PAUSE_MS = 90;
const BLINK_MS = BLINK_CLOSE_MS + BLINK_OPEN_MS;

/**
 * The drawings exported from the design, by size and mood. One of them shows until the canvas has
 * painted, so the mascot is there from the first frame; the other combinations simply start a frame later.
 */
const EXPORTED: Partial<Record<`${MascotArt}-${MascotMood}`, string>> = {
  'idle-awake': '/illustrations/mascot-idle.svg',
  'idle-asleep': '/illustrations/mascot-asleep.svg',
  'waiting-awake': '/illustrations/mascot-waiting.svg',
  'waiting-happy': '/illustrations/mascot-happy.svg',
};

type MascotFaceProps = {
  art: MascotArt;
  /** `awake` by default. A happy mascot doesn't blink, and a sleeping one doesn't move at all. */
  mood?: MascotMood;
  /** Stands still: no turning towards the pointer and no blinking. */
  still?: boolean;
  className?: string;
};

/**
 * The mascot, drawn on a canvas (`drawMascot`) the way the design's drawings are made. Drawing it is
 * what lets the whole sphere turn towards the pointer, with its light, its shadow and its eyes moving
 * together, and lets it blink. It stands still when asked to, when asleep, and for anyone who prefers
 * reduced motion.
 */
export function MascotFace({ art, mood = 'awake', still = false, className }: MascotFaceProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = useState(false);
  const { grid, radius } = ART[art];
  const exported = EXPORTED[`${art}-${mood}`];

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) {
      return;
    }

    const image = context.createImageData(grid, grid);
    const pose: MascotPose = { ...MASCOT_AT_REST };
    const target = { yaw: 0, pitch: 0 };
    let drawn: MascotPose | null = null;
    let frame = 0;
    let idle = 0;
    // Where it was looking when it started to turn back, and when that was.
    let turningBack: { yaw: number; pitch: number; since: number } | null = null;
    let blinkAt = performance.now() + randomBetween(BLINK_EVERY_MS.min, BLINK_EVERY_MS.max);
    let blinks = pickBlinks();

    const paint = () => {
      drawMascot(image.data, grid, pose, radius, mood);
      context.putImageData(image, 0, 0);
      drawn = { ...pose };
    };

    paint();
    setPainted(true);

    if (still || mood === 'asleep' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const tick = (now: number) => {
      if (turningBack) {
        // On its way back to facing forward: a set stretch of time, fast at first and slowing to a stop.
        const progress = Math.min(1, (now - turningBack.since) / TURNS_BACK_IN_MS);
        const left = 1 - settle(progress);
        pose.yaw = turningBack.yaw * left;
        pose.pitch = turningBack.pitch * left;
        if (progress === 1) {
          turningBack = null;
        }
      } else {
        pose.yaw += (target.yaw - pose.yaw) * EASE;
        pose.pitch += (target.pitch - pose.pitch) * EASE;
      }

      const sinceBlink = mood === 'awake' ? now - blinkAt : 0;
      if (sinceBlink > blinks * BLINK_MS + (blinks - 1) * DOUBLE_BLINK_PAUSE_MS) {
        blinkAt = now + randomBetween(BLINK_EVERY_MS.min, BLINK_EVERY_MS.max);
        blinks = pickBlinks();
        pose.blink = 0;
      } else if (sinceBlink > 0) {
        // Where this moment falls within one blink; past its end it's the pause before the second one.
        const within = sinceBlink % (BLINK_MS + DOUBLE_BLINK_PAUSE_MS);
        pose.blink =
          within < BLINK_CLOSE_MS
            ? ease(within / BLINK_CLOSE_MS)
            : 1 - ease(Math.min(1, (within - BLINK_CLOSE_MS) / BLINK_OPEN_MS));
      }

      // The grid is coarse: a pose that moved less than this paints the very same pixels.
      const moved =
        !drawn ||
        Math.abs(pose.yaw - drawn.yaw) > 0.002 ||
        Math.abs(pose.pitch - drawn.pitch) > 0.002 ||
        Math.abs(pose.blink - drawn.blink) > 0.01;
      if (moved) {
        paint();
      }

      frame = requestAnimationFrame(tick);
    };

    const follow = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);

      turningBack = null;
      target.yaw = clamp(dx / FULL_TURN_AT) * MAX_YAW;
      target.pitch = clamp(dy / FULL_TURN_AT) * MAX_PITCH;

      window.clearTimeout(idle);
      idle = window.setTimeout(rest, LOSES_INTEREST_AFTER_MS);
    };
    // It faces forward again once the pointer has left the page, or hasn't moved for a while.
    const rest = () => {
      window.clearTimeout(idle);
      target.yaw = 0;
      target.pitch = 0;
      turningBack = { yaw: pose.yaw, pitch: pose.pitch, since: performance.now() };
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', follow, { passive: true });
    document.documentElement.addEventListener('pointerleave', rest);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('pointermove', follow);
      document.documentElement.removeEventListener('pointerleave', rest);
    };
  }, [still, mood, grid, radius]);

  return (
    <span aria-hidden="true" className={cn('relative block shrink-0', className)}>
      {exported && <img src={exported} alt="" className={cn('absolute inset-0 size-full', painted && 'invisible')} />}
      <canvas
        ref={canvas}
        width={grid}
        height={grid}
        className={cn('absolute inset-0 size-full [image-rendering:pixelated]', !painted && 'invisible')}
      />
    </span>
  );
}

function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/** Slow at both ends, so neither the eyelids nor a turn back snap. */
function ease(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

/** How many times the eyes shut this time: once, or sometimes twice. */
function pickBlinks(): 1 | 2 {
  return Math.random() < DOUBLE_BLINK_CHANCE ? 2 : 1;
}

/** `easeOutExpo`: off at full speed, then slowing all the way down. Half the turn is done in a tenth of the time. */
function settle(progress: number): number {
  return progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
