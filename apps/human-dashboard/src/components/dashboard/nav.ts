import { BookOpen, Bot, Inbox, type LucideIcon, MessageSquare, Settings, Users } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Opens in a new tab and never shows as the current page. */
  external?: boolean;
  /** Leaves the browser (a `mailto:`), so it gets neither a new tab nor the arrow of one. */
  quiet?: boolean;
};

export const DASHBOARD_HOME = '/inbox';

/** Where the agent is set up and its channels are connected. */
export const CONFIGURE_PATH = '/configure';

/** The pages of the dashboard, in sidebar order. */
export const MAIN_NAV: NavItem[] = [
  { href: DASHBOARD_HOME, label: 'Inbox', icon: Inbox },
  { href: CONFIGURE_PATH, label: 'Configure', icon: Bot },
  { href: '/contacts', label: 'Contacts', icon: Users },
];

// There is no docs site yet, so Docs points at the package page like the landing page does.
export const DOCS_URL = 'https://www.npmjs.com/package/@novu/human';

/** Where Share feedback leads until the product has a feedback form of its own. */
export const FEEDBACK_URL = 'mailto:support@novu.co?subject=Agent%20Inbox%20feedback';

/** Pinned to the bottom of the sidebar. */
export const FOOTER_NAV: NavItem[] = [
  { href: FEEDBACK_URL, label: 'Share feedback', icon: MessageSquare, external: true, quiet: true },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: DOCS_URL, label: 'Docs', icon: BookOpen, external: true },
];

/** The page a path belongs to, so nested routes keep their section highlighted and titled. */
export function findNavItem(pathname: string): NavItem | undefined {
  return [...MAIN_NAV, ...FOOTER_NAV].find(
    (item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`))
  );
}
