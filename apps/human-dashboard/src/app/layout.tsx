import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { geist, geistMono, instrumentSerif } from '@/lib/fonts';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: {
    default: 'agentinbox.md',
    template: '%s · agentinbox.md',
  },
  description: 'Agent Inbox gives your AI agent one inbox on every channel: email, Telegram and Slack.',
};

export const viewport: Viewport = {
  themeColor: '#0a0908',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={cn(geist.variable, geistMono.variable, instrumentSerif.variable)}>
      <body>{children}</body>
    </html>
  );
}
