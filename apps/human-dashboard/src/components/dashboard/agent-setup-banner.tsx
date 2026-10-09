import { ArrowRight, Bot } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { buttonClassName } from '@/components/ui/button';

/**
 * The banner at the top of a page that has nothing to work with until the agent exists. It sends the
 * operator to the Agent page, which walks them through `human setup`.
 */
export function AgentSetupBanner({ children }: { children: ReactNode }) {
  return (
    <section className="dither-side dither-breathe flex animate-rise-in flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-background px-5 py-4.5 motion-reduce:animate-none">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-raised text-foreground"
      >
        <Bot className="size-4.5" />
      </span>
      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <h2 className="text-[13px] leading-4.5 font-medium text-foreground">Set up your agent first</h2>
        <p className="text-xs leading-4 text-secondary">{children}</p>
      </div>
      <Link href={DASHBOARD_HOME} className={buttonClassName('primary', 'h-9')}>
        Go to Agent
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </section>
  );
}
