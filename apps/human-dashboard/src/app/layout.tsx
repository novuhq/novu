import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { GoogleTagManagerNoScript, GoogleTagManagerScript } from '@/components/analytics/google-tag-manager';
import { geist, geistMono, instrumentSerif } from '@/lib/fonts';
import { siteNoindex } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: {
    default: 'agentinbox.md',
    template: '%s · agentinbox.md',
  },
  description: 'Agent Inbox gives your AI agent one inbox on every channel: email, Telegram and Slack.',
  // Staging sets SITE_NOINDEX. Pages that name their own robots replace this.
  ...(siteNoindex() ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#0a0908',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable, instrumentSerif.variable)}>
      <head>
        <GoogleTagManagerScript />
      </head>
      <body>
        <GoogleTagManagerNoScript />
        {children}
      </body>
    </html>
  );
}
