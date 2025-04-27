import { useUser } from './index';
import { Button } from '@/components/primitives/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Cloud } from 'lucide-react';
import { useState, useRef } from 'react';
import { UserAvatar } from './icons';

function getInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return 'U';
  return `${firstName?.[0] || ''}`.toUpperCase();
}

export function UserButton() {
  const { user } = useUser() as {
    user: { firstName?: string; lastName?: string; emailAddresses?: { emailAddress: string }[] } | undefined;
  };
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
  const userInitials = getInitials(user.firstName, user.lastName);
  const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : userEmail;

  return (
    <div className="flex-shrink-0">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={buttonRef}
            variant="secondary"
            size="sm"
            className="h-6 w-6 rounded-full bg-white p-0 hover:bg-gray-50 focus:outline-none focus:ring-0 focus-visible:shadow-none"
          >
            <Avatar className="h-6 w-6 border border-gray-200">
              <AvatarImage src={undefined} alt={userName} />
              <AvatarFallback className="h-6 w-6 bg-gray-100 text-sm font-medium text-gray-700">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[320px] border border-gray-200 bg-white shadow-sm" sideOffset={5}>
          <div className="flex items-center gap-3 p-3">
            <UserAvatar className="rounded-full" />
            <div className="flex flex-col">
              <span className="truncate text-sm font-medium text-gray-900">{userName}</span>
              <span className="truncate text-sm text-gray-500">{userEmail}</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={() => window.open('https://novu.co', '_blank')}
          >
            <Cloud className="h-4 w-4 text-gray-500" />
            <span>Try Novu Cloud</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
