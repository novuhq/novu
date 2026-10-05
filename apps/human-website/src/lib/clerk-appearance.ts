import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

/** Clerk's sign-in and sign-up forms in the gethuman.md colors (see `src/styles/globals.css`). */
export const humanClerkAppearance: ComponentProps<typeof ClerkProvider>['appearance'] = {
  variables: {
    colorPrimary: '#ff5c30',
    colorPrimaryForeground: '#000000',
    colorBackground: '#0b0a09',
    colorForeground: '#eee5d8',
    colorMutedForeground: '#a39c93',
    colorNeutral: '#eee5d8',
    colorInput: '#000000',
    colorInputForeground: '#eee5d8',
    colorBorder: '#2a2724',
    colorDanger: '#ff5c30',
    borderRadius: '0.375rem',
    fontFamily: 'var(--font-inter), sans-serif',
  },
};
