'use client';

import { usePathname } from 'next/navigation';

import { findNavItem } from '@/components/dashboard/nav';
import { UserMenu, type UserMenuUser } from '@/components/dashboard/user-menu';

/** The bar above every dashboard page: the section name on the left, the operator's menu on the right. */
export function TopBar({ user }: { user: UserMenuUser }) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  // The one page that sits under another: Settings › Billing.
  const child = pathname === '/settings/billing' ? 'Billing' : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <p className="flex items-center gap-2.5 text-sm font-medium tracking-tight text-foreground">
        {current?.label}
        {child && (
          <>
            <span aria-hidden="true" className="text-muted">
              /
            </span>
            <span className="font-normal text-secondary">{child}</span>
          </>
        )}
      </p>
      <UserMenu user={user} />
    </header>
  );
}
