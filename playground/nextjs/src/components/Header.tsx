import Link from 'next/link';
import React from 'react';

export default function Header() {
  return (
    <div className="flex items-center justify-center p-6">
      <ul className="flex space-x-5 list-none">
        <li className="p-2 rounded hover:bg-slate-200">
          <Link href="/">Default Inbox</Link>
        </li>
        <li className="p-2 rounded hover:bg-slate-200">
          <Link href="/render-bell">Render Bell</Link>
        </li>
        <li className="p-2 rounded hover:bg-slate-200">
          <Link href="/render-notification">Render Notifcation</Link>
        </li>
        <li className="p-2 rounded hover:bg-slate-200">
          <Link href="/preferences">Preferences</Link>
        </li>
        <li className="p-2 rounded hover:bg-slate-200">
          <Link href="/notifications">Notifications</Link>
        </li>
      </ul>
    </div>
  );
}
