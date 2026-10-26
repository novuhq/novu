import { useId } from 'react';

import { cn } from '@/lib/utils';

/**
 * The tints of the design's portraits (`Avatar/Portrait/<name>`): bone, clay, sage, slate, ochre, lilac.
 * Each contact keeps one, picked from their id.
 */
const TINTS = ['#d9d1c5', '#c98a6e', '#94b08a', '#8ea3c2', '#c9a96a', '#ad97c4'];

type ContactAvatarProps = {
  /** What picks the tint, so a contact looks the same everywhere: their id. */
  seed: string;
  /** Size and corners, such as `size-8` in the table or `size-14` on the contact card. */
  className?: string;
};

/**
 * A contact's picture (`Human/Avatar`, Content Portrait): an abstract figure, head and shoulders, drawn in
 * dithered pixels and tinted per person, inside a ring. The pixels scale with the size, as the design's do.
 */
export function ContactAvatar({ seed, className }: ContactAvatarProps) {
  // React's ids carry characters `url(#…)` doesn't take.
  const id = `avatar${useId().replace(/[^\w-]/g, '')}`;
  const tint = TINTS[hashOf(seed) % TINTS.length];

  return (
    <span
      aria-hidden="true"
      className={cn('block shrink-0 overflow-hidden rounded-full border border-border-strong bg-background', className)}
    >
      <svg viewBox="0 0 32 32" className="size-full" shapeRendering="crispEdges">
        <defs>
          {/* Light from the top left, falling off towards the edges. */}
          <radialGradient id={`${id}-head`} cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor={tint} />
            <stop offset="0.55" stopColor={tint} stopOpacity="0.6" />
            <stop offset="1" stopColor={tint} stopOpacity="0.15" />
          </radialGradient>
          <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint} stopOpacity="0.85" />
            <stop offset="1" stopColor={tint} stopOpacity="0.25" />
          </linearGradient>
          {/* An ordered 2×2 dither: every other pixel full, the rest at three steps of strength. */}
          <pattern id={`${id}-dither`} width="2" height="2" patternUnits="userSpaceOnUse">
            <rect width="1" height="1" fill="#fff" />
            <rect x="1" width="1" height="1" fill="#fff" fillOpacity="0.7" />
            <rect y="1" width="1" height="1" fill="#fff" fillOpacity="0.35" />
            <rect x="1" y="1" width="1" height="1" fill="#fff" fillOpacity="0.85" />
          </pattern>
          <mask id={`${id}-mask`}>
            <rect width="32" height="32" fill={`url(#${id}-dither)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}-mask)`}>
          <circle cx="16" cy="13" r="6.5" fill={`url(#${id}-head)`} />
          <path d="M4.5 32c0-6.6 5.1-10.5 11.5-10.5S27.5 25.4 27.5 32Z" fill={`url(#${id}-body)`} />
        </g>
      </svg>
    </span>
  );
}

function hashOf(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash;
}
