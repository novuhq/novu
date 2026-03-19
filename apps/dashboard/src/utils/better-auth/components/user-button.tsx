import { useRef, useState } from 'react';
import { RiLogoutBoxRLine } from 'react-icons/ri';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { useAuth } from '../index';
import { useUser } from '../index';

function getUserInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserButton() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex-shrink-0">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={buttonRef}
            variant="secondary"
            size="sm"
            className="h-6 w-6 rounded-full p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
              <AvatarFallback className="bg-primary-base text-static-white text-xs">
                {getUserInitials(user.fullName || user.emailAddresses[0]?.emailAddress || 'U')}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[240px]" sideOffset={8}>
          <div className="flex items-center gap-3 px-2 py-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} alt={user.fullName || ''} />
              <AvatarFallback className="bg-primary-base text-static-white text-sm">
                {getUserInitials(user.fullName || user.emailAddresses[0]?.emailAddress || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground-950">{user.fullName}</span>
              <span className="truncate text-xs text-foreground-600">
                {user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress}
              </span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-foreground-700"
            onClick={handleLogout}
          >
            <RiLogoutBoxRLine className="h-4 w-4 flex-shrink-0" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
