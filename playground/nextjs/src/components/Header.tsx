import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

type LinkType = {
  href: string;
  label: string;
};

const LINKS: LinkType[] = [
  { href: '/', label: 'Default Inbox' },
  { href: '/render-bell', label: 'Render Bell' },
  { href: '/render-notification', label: 'Render Notification' },
  { href: '/preferences', label: 'Preferences' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/novu-theme', label: 'Novu Theme' },
  { href: '/custom-popover', label: 'Custom Popover' },
  { href: '/hooks', label: 'Hooks' },
];

const NavLink = ({ href, label }: LinkType) => {
  const router = useRouter();

  const pathname = router.pathname;

  const isActive = pathname === href;
  return (
    <li className={`p-2 rounded hover:bg-slate-200 ${isActive ? 'underline text-cyan-800' : ''}`}>
      <Link href={href}>{label}</Link>
    </li>
  );
};

export default function Header() {
  return (
    <div className="flex items-center justify-center p-6">
      <ul className="flex space-x-5 list-none">
        {LINKS.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </ul>
    </div>
  );
}
