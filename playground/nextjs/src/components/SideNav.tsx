import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';

type LinkType = {
  href: string;
  label: string;
  category?: string;
};

const LINKS: LinkType[] = [
  { href: '/agent-toolkit', label: 'Refund Agent (HITL)', category: 'AI' },
  { href: '/', label: 'Default Inbox', category: 'Components' },
  { href: '/render-bell', label: 'Render Bell', category: 'Components' },
  { href: '/render-notification', label: 'Render Notification', category: 'Components' },
  { href: '/notifications', label: 'Notifications', category: 'Components' },
  { href: '/preferences', label: 'Preferences', category: 'Components' },
  { href: '/subscription', label: 'Subscription', category: 'Components' },
  { href: '/subscription-components', label: 'Subscription Components', category: 'Components' },
  { href: '/subscription-hooks', label: 'Subscription Hooks', category: 'Components' },
  { href: '/novu-theme', label: 'Novu Theme', category: 'Customization' },
  { href: '/custom-popover', label: 'Custom Popover', category: 'Customization' },
  { href: '/custom-subject-body', label: 'Custom Subject Body', category: 'Customization' },
  { href: '/custom-icons', label: 'Custom Icons', category: 'Customization' },
  { href: '/hooks', label: 'Hooks', category: 'Advanced' },
];

const NavLink = ({ href, label }: LinkType) => {
  const router = useRouter();
  const { pathname } = router;
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors rounded-md',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground'
      )}
    >
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />}
      <span className={cn('flex-1', !isActive && 'ml-4')}>{label}</span>
    </Link>
  );
};

export default function SideNav() {
  const groupedLinks = LINKS.reduce(
    (acc, link) => {
      const category = link.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(link);
      return acc;
    },
    {} as Record<string, LinkType[]>
  );

  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-y-auto">
      <nav className="p-4 space-y-6">
        {Object.entries(groupedLinks).map(([category, links]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">{category}</h3>
            <div className="space-y-1">
              {links.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
