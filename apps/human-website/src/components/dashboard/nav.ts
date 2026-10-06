import { BookOpen, Bot, type LucideIcon, RadioTower, Settings, Users } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Opens in a new tab and never shows as the current page. */
  external?: boolean;
};

export const DASHBOARD_HOME = '/agent';

/** The pages of the dashboard, in sidebar order. */
export const MAIN_NAV: NavItem[] = [
  { href: '/agent', label: 'Agent', icon: Bot },
  { href: '/channels', label: 'Channels', icon: RadioTower },
  { href: '/contacts', label: 'Contacts', icon: Users },
];

// There is no docs site yet, so Docs points at the package page like the landing page does.
const DOCS_URL = 'https://www.npmjs.com/package/@novu/human';

/** Pinned to the bottom of the sidebar. */
export const FOOTER_NAV: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: DOCS_URL, label: 'Docs', icon: BookOpen, external: true },
];

/** The page a path belongs to, so nested routes keep their section highlighted and titled. */
export function findNavItem(pathname: string): NavItem | undefined {
  return [...MAIN_NAV, ...FOOTER_NAV].find(
    (item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
}
