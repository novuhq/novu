import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';

type LinkType = {
  href: string;
  label: string;
  category?: string;
};

const LINKS: LinkType[] = [
  { href: '/', label: 'Default Inbox', category: 'Components' },
  { href: '/render-bell', label: 'Render Bell', category: 'Components' },
  { href: '/render-notification', label: 'Render Notification', category: 'Components' },
  { href: '/notifications', label: 'Notifications', category: 'Components' },
  { href: '/preferences', label: 'Preferences', category: 'Components' },
  { href: '/subscription', label: 'Subscription', category: 'Components' },
  { href: '/subscription-components', label: 'Subscription Components', category: 'Components' },
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
        'relative px-4 py-2 text-sm font-medium transition-colors rounded-md',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground'
      )}
    >
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </Link>
  );
};

export default function Header() {
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
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6 py-6">
          {Object.entries(groupedLinks).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
