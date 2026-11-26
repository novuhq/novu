'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

/** A link to one of the website's pages, which says so when that page is the one open (`aria-current`). */
export function SiteNavigationLink({ href, ...props }: { href: string } & Omit<ComponentProps<typeof Link>, 'href'>) {
  const pathname = usePathname();

  return <Link href={href} aria-current={pathname === href ? 'page' : undefined} {...props} />;
}
