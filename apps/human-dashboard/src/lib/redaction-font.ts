import localFont from 'next/font/local';

/**
 * Redaction 35 italic (OFL, MCKL), for the accent words of the people page and the onboarding. In a file of its
 * own, so a page that sets it loads it alone.
 */
export const redaction = localFont({
  src: [{ path: '../../public/fonts/redaction-35-italic.woff2', weight: '400', style: 'italic' }],
  variable: '--font-redaction',
  display: 'swap',
});
