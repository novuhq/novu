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

/** Italic display face for the accent words in the headings. */
export const ivyPresto = localFont({
  src: '../../public/fonts/ivy-presto-italic.woff2',
  weight: '400',
  style: 'italic',
  variable: '--font-ivy-presto',
  display: 'swap',
});
