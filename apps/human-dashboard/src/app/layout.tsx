import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { geistMono, instrumentSerif, inter } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: {
    default: 'gethuman.md',
    template: '%s · gethuman.md',
  },
  description: 'Human lets your AI agents reach you for a decision, over the apps you already use.',
};

export const viewport: Viewport = {
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(inter.variable, geistMono.variable, instrumentSerif.variable)}>
      <body>{children}</body>
    </html>
  );
}
