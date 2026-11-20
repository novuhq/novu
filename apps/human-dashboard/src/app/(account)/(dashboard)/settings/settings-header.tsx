import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'general', href: '/settings', label: 'General' },
  { id: 'billing', href: '/settings/billing', label: 'Billing' },
] as const;

type SettingsTab = (typeof TABS)[number]['id'];

/** The title of Settings with the plan badge, and the tabs under it. Each tab is a page of its own. */
export function SettingsHeader({ tab }: { tab: SettingsTab }) {
  return (
    <>
      <div className="flex flex-col gap-1.5 pb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl leading-7.5 tracking-tight text-foreground">Settings</h1>
          <Badge>Free</Badge>
        </div>
        <p className="text-[13px] leading-4.5 text-secondary">You, your API key and your plan.</p>
      </div>
      <nav aria-label="Settings" className="flex border-b border-border">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            aria-current={item.id === tab ? 'page' : undefined}
            className={cn(
              '-mb-px flex h-9 items-center border-b px-3 text-[13px] leading-4.5 transition-colors duration-150 motion-reduce:transition-none',
              item.id === tab
                ? 'border-accent text-foreground'
                : 'border-transparent text-secondary hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** The plan everyone is on for now. Settings shows it with the way to Billing, Billing without. */
export function PlanHeading() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <h2 className="flex items-center gap-2.5 text-[13px] leading-4.5 font-medium text-foreground">
        Plan
        <Badge variant="accent">Early access</Badge>
      </h2>
      <p className="text-xs leading-4 text-secondary">Free during early access.</p>
    </div>
  );
}
