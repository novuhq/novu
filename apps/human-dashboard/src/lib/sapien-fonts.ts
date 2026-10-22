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

/** Italic display face for the accent words in the headings. */
export const ivyPresto = localFont({
  src: '../../public/fonts/ivy-presto-italic.woff2',
  weight: '400',
  style: 'italic',
  variable: '--font-ivy-presto',
  display: 'swap',
});
