import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

/** Clerk's sign-in and sign-up forms in the gethuman.md colors (see `src/styles/globals.css`). */
export const humanClerkAppearance: ComponentProps<typeof ClerkProvider>['appearance'] = {
  variables: {
    colorPrimary: '#ff5c30',
    colorPrimaryForeground: '#000000',
    colorBackground: '#100f0d',
    colorForeground: '#ebe2d6',
    colorMutedForeground: '#8f887d',
    colorNeutral: '#ebe2d6',
    colorInput: '#0a0908',
    colorInputForeground: '#ebe2d6',
    colorBorder: '#2e2b27',
    colorDanger: '#ff5c30',
    borderRadius: '0.375rem',
    fontFamily: 'var(--font-geist), sans-serif',
  },
};
