import type { ReactNode } from 'react';

import { Brand } from '@/components/site/brand';

const HUMAN_SITE_URL = 'https://gethuman.md';

/**
 * Page chrome for the public invite page: the brand bar, one centered card and a one-line
 * explanation of Human at the bottom. The invited person has no account, so every link here
 * leads to the public site, not the dashboard.
 */
export function InviteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <Brand href={HUMAN_SITE_URL} />
        <a
          href={HUMAN_SITE_URL}
          className="rounded-sm text-[13px] leading-4.5 text-secondary transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
        >
          What is Human?
        </a>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">{children}</main>
      <footer className="px-4 pb-6 text-center text-xs leading-4 text-muted">
        Human lets agents ask people before they act. Built by{' '}
        <a href="https://novu.co/" className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">
          Novu
        </a>
        .
      </footer>
    </div>
  );
}
