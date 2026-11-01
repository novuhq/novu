import { cn } from '@/lib/utils';

/**
 * Email, as a small stationery mark. Warm paper, and an ink envelope with one light crease.
 * Quiet next to the brand marks, and still a letter at the smallest size. The parent clips it.
 */
const PAPER = '#f6f1ea';
const INK = '#3a2e28';
const FLAP = '#6d584e';
const CREASE = '#f3e6dc';

export function EmailMark({ className }: { crop?: 'circle' | 'square'; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-full', className)} aria-hidden="true">
      <rect width="32" height="32" fill={PAPER} />
      <path
        fill={INK}
        d="M9.6 10.2h12.8c.66 0 1.2.54 1.2 1.2v9.2c0 .66-.54 1.2-1.2 1.2H9.6c-.66 0-1.2-.54-1.2-1.2v-9.2c0-.66.54-1.2 1.2-1.2Z"
      />
      <path fill={FLAP} d="M10.15 11.55 16 16.05 21.85 11.55Z" />
      <path
        d="M10.15 11.55 16 16.05 21.85 11.55"
        fill="none"
        stroke={CREASE}
        strokeWidth="0.65"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
