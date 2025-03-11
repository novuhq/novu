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
  { href: '/custom-subject-body', label: 'Custom Subject Body' },
];

const NavLink = ({ href, label }: LinkType) => {
  const router = useRouter();

  const { pathname } = router;

  const isActive = pathname === href;

  return (
    <li className={`rounded p-2 hover:bg-slate-200 ${isActive ? 'text-cyan-800 underline' : ''}`}>
      <Link href={href}>{label}</Link>
    </li>
  );
};

export default function Header() {
  return (
    <div className="flex items-center justify-center p-6">
      <ul className="flex list-none space-x-5">
        {LINKS.map((link) => (
          <NavLink key={link.href} {...link} />
        ))}
      </ul>
    </div>
  );
}
