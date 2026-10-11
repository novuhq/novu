import type { ReactNode } from 'react';

import { Brand } from '@/components/site/brand';
import { cn } from '@/lib/utils';

/**
 * Page chrome shared with the gethuman.md landing page: a centered 896px column framed by
 * vertical rails, with the brand bar on top and the Novu credit at the bottom.
 */
export function SiteFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-clip">
      <div className="mx-auto flex min-h-dvh w-[calc(100%-2rem)] max-w-224 flex-col">
        <header className="section-rails flex min-h-12.5 items-center p-2">
          <Brand />
          <SectionDivider />
        </header>
        <main className={cn('section-rails flex flex-1 flex-col', className)}>
          {children}
          <SectionDivider />
        </main>
        <footer className="section-rails flex min-h-12.5 flex-wrap items-center gap-4 p-2">
          <Brand />
          <p className="flex gap-4 font-mono text-sm tracking-tight text-foreground/50">
            <span>© 2026</span>
            <span aria-hidden="true">|</span>
            <a href="https://novu.co/" className="text-accent">
              built by novu
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

/** The line and corner squares that separate stacked sections. */
function SectionDivider() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-1 z-20 h-2">
      <span className="absolute top-1 left-1/2 h-px w-screen -translate-x-1/2 bg-border" />
      <span className="absolute left-0 size-2 -translate-x-1/2 rounded-[2px] border border-black bg-surface" />
      <span className="absolute right-0 size-2 translate-x-1/2 rounded-[2px] border border-black bg-surface" />
    </div>
  );
}
