'use client';

import { useClerk } from '@clerk/nextjs';
import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type UserMenuUser = {
  name: string;
  email: string | null;
  imageUrl: string | null;
};

/** The operator's avatar in the top bar, opening a menu with Settings and Sign out. */
export function UserMenu({ user }: { user: UserMenuUser }) {
  const { signOut } = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-surface text-xs font-medium text-foreground ring-1 ring-border-strong"
      >
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-sm font-medium tracking-tight text-foreground">{user.name}</span>
          {user.email && <span className="truncate font-mono text-xs tracking-tight text-muted">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/' })}>
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
