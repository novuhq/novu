import { useId } from 'react';

import { cn } from '@/lib/utils';

type MascotMood = 'neutral' | 'happy';
type MascotSize = 'small' | 'large';

const SIZES: Record<MascotSize, string> = {
  small: 'size-7',
  large: 'size-28',
};

type MascotProps = {
  mood?: MascotMood;
  size?: MascotSize;
  className?: string;
};

/**
 * The agent mascot: an orange orb with two simple eyes. Small for avatars, large for heroes.
 * A stand-in drawn in SVG until the dithered artwork from the design system is exported.
 */
export function Mascot({ mood = 'neutral', size = 'small', className }: MascotProps) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn('shrink-0', SIZES[size], className)}>
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ff8547" />
          <stop offset="55%" stopColor="#ff5c30" />
          <stop offset="100%" stopColor="#84331c" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${gradientId})`} />
      {mood === 'happy' ? (
        <g fill="none" stroke="#ebe2d6" strokeWidth="3" strokeLinecap="round">
          <path d="M20 31q4-6 8 0" />
          <path d="M36 31q4-6 8 0" />
        </g>
      ) : (
        <g fill="#ebe2d6">
          <rect x="22" y="24" width="4" height="10" rx="2" />
          <rect x="38" y="24" width="4" height="10" rx="2" />
        </g>
      )}
    </svg>
  );
}
