import localFont from 'next/font/local';

// The people page's own faces (`/sapien`), apart from `fonts.ts` so the rest of the site never loads them.

export const inter = localFont({
  src: [
    { path: '../../public/fonts/inter-regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/inter-medium.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

/**
 * The page's Geist Mono: the website's own subset, regular only. Its line metrics and missing glyphs (`→` falls
 * back) set the page's mono lines, which the dashboard's full Geist Mono would make taller and wider.
 */
export const geistMono = localFont({
  src: '../../public/fonts/geist-mono-regular.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-sapien-geist-mono',
  display: 'swap',
});

/**
 * Redaction 35 (OFL, MCKL): a serif worn down to its pixel grid, so the accent words share the dithered art's
 * texture. Set in the page's cream, never in the accent orange.
 */
export const redaction = localFont({
  src: [
    { path: '../../public/fonts/redaction-35-regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/redaction-35-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-redaction',
  display: 'swap',
});

/** Geist Pixel Square (OFL) for the plate labels: figure numbers, card numbers and section indexes. */
export const geistPixel = localFont({
  src: '../../public/fonts/geist-pixel-square.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-geist-pixel',
  display: 'swap',
});
