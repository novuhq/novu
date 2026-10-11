import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';

// Variable font, so every weight comes from one file. An explicit weight list failed to build
// under Turbopack in Next 16.3.6.
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

/** Italic display face for accent words in headings. */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-instrument-serif',
  display: 'swap',
});
