'use client';

import { type ComponentProps, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/** How far the card leans at most, in degrees, with the pointer at its edge. */
const MAX_TILT_DEG = 4;

/** The share of the way to where it should be that the card covers per frame: lower is heavier. */
const EASE = 0.12;

/** Close enough to where it should be to stop drawing. */
const SETTLED = 0.001;

/** How near the edge the pointer has to be for the border to start glowing: 0 is the centre, 1 the edge. */
const EDGE_FROM = 0.55;

type TiltCardProps = ComponentProps<'section'>;

/**
 * The agent card held in the hand: it leans towards the pointer, a soft glare follows the pointer across it,
 * and the stretch of its border nearest the pointer glows orange (`edge-glow`), more as the pointer nears the
 * edge. Where it leans, where the glare is and which edge is lit are CSS variables its own frames set, so
 * nothing re-renders; it eases there and back, and lies flat and unlit once the pointer leaves. Still on touch
 * screens, and for anyone who prefers reduced motion. It has the agent card's 14px corners.
 */
export function TiltCard({ className, children, ...props }: TiltCardProps) {
  const frame = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = frame.current;
    const surface = card.current;
    if (!area || !surface || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    // Where the pointer is on the card, from 0 to 1 across and down, and how much it is held (0 or 1).
    const now = { x: 0.5, y: 0.5, held: 0 };
    const target = { x: 0.5, y: 0.5, held: 0 };
    // The card's height for its width, so the lit edge points where the pointer really is.
    let aspect = 1;
    let next = 0;

    const draw = () => {
      now.x += (target.x - now.x) * EASE;
      now.y += (target.y - now.y) * EASE;
      now.held += (target.held - now.held) * EASE;

      const across = now.x - 0.5;
      const down = now.y - 0.5;
      const nearEdge = smoothstep(EDGE_FROM, 1, Math.max(Math.abs(across), Math.abs(down)) * 2);

      // The side the pointer is on comes towards the reader; let go, the card lies flat again.
      surface.style.setProperty('--tilt-x', `${(down * 2 * MAX_TILT_DEG * now.held).toFixed(3)}deg`);
      surface.style.setProperty('--tilt-y', `${(-across * 2 * MAX_TILT_DEG * now.held).toFixed(3)}deg`);
      surface.style.setProperty('--glare-x', `${(now.x * 100).toFixed(2)}%`);
      surface.style.setProperty('--glare-y', `${(now.y * 100).toFixed(2)}%`);
      surface.style.setProperty('--glare', now.held.toFixed(3));
      // 0deg is the top, clockwise, as a conic gradient counts.
      surface.style.setProperty(
        '--edge-angle',
        `${((Math.atan2(down * aspect, across) * 180) / Math.PI + 90).toFixed(2)}deg`
      );
      surface.style.setProperty('--edge', (nearEdge * now.held).toFixed(3));

      const moving =
        Math.abs(target.x - now.x) > SETTLED ||
        Math.abs(target.y - now.y) > SETTLED ||
        Math.abs(target.held - now.held) > SETTLED;
      next = moving ? requestAnimationFrame(draw) : 0;
    };

    const start = () => {
      if (!next) {
        next = requestAnimationFrame(draw);
      }
    };

    // Measured on the frame, which doesn't lean: the card's own box changes as it does.
    const follow = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }

      const box = area.getBoundingClientRect();
      aspect = box.height / box.width;
      target.x = clamp((event.clientX - box.left) / box.width);
      target.y = clamp((event.clientY - box.top) / box.height);
      target.held = 1;
      start();
    };

    // Where the pointer left stays put: the glare and the lit edge fade there as the card lies flat.
    const letGo = () => {
      target.held = 0;
      start();
    };

    area.addEventListener('pointermove', follow, { passive: true });
    area.addEventListener('pointerleave', letGo);

    return () => {
      cancelAnimationFrame(next);
      area.removeEventListener('pointermove', follow);
      area.removeEventListener('pointerleave', letGo);
    };
  }, []);

  return (
    <div ref={frame} className="w-full perspective-distant">
      <div
        ref={card}
        className="relative rounded-[14px] transform-[rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] will-change-transform"
      >
        {/* The lit edge's halo, behind the card: only what spills past its border shows. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-[inherit] blur-md edge-glow"
        />
        <section {...props} className={cn('relative', className)}>
          {children}
          {/* The glare: a soft light where the pointer is, brightening what is under it. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-[radial-gradient(circle_at_var(--glare-x,50%)_var(--glare-y,50%),rgb(255_255_255/0.08),rgb(255_255_255/0.02)_35%,transparent_65%)] opacity-(--glare,0) mix-blend-screen"
          />
        </section>
        {/* The lit edge itself, over the card's border. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] edge-glow edge-line"
        />
      </div>
    </div>
  );
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 0 below `from`, 1 above `to`, and a smooth rise in between. */
function smoothstep(from: number, to: number, value: number): number {
  const progress = clamp((value - from) / (to - from));

  return progress * progress * (3 - 2 * progress);
}
