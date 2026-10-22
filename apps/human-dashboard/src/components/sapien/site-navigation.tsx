import { NAVIGATION, type NavigationItem } from '@/data/sapien';

import { cn } from '@/lib/utils';

type SiteNavigationProps = {
  label: string;
  /** The links, the footer's by default. */
  items?: readonly NavigationItem[];
  /** Called when a link is followed, such as to close the menu it's in. */
  onNavigate?: () => void;
  className?: string;
};

export function SiteNavigation({ label, items = NAVIGATION, onNavigate, className }: SiteNavigationProps) {
  return (
    <nav aria-label={label} className={cn('flex flex-wrap items-center gap-2', className)}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'inline-flex h-8 items-center justify-center rounded-sm bg-sapien-border px-4 pt-2 pb-2.5 font-sapien-mono text-sm leading-none tracking-tight text-sapien-foreground sm:px-6',
            item.variant === 'outline' && 'bg-transparent ring-1 ring-sapien-border'
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
