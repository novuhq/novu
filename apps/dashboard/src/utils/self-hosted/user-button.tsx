import { useNavigate } from 'react-router-dom';
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
import { LogOut, Settings, User, Cloud } from 'lucide-react';
import { useState, useRef } from 'react';

function getInitials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return 'U';
  return `${firstName?.[0] || ''}`.toUpperCase();
}

export function UserButton() {
  const navigate = useNavigate();
  const { user } = useUser() as {
    user: { firstName?: string; lastName?: string; emailAddresses?: { emailAddress: string }[] } | undefined;
  };
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!user) return null;

  const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
  const userInitials = getInitials(user.firstName, user.lastName);
  const userName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : userEmail;

  const handleSignOut = () => {
    localStorage.removeItem('self-hosted-jwt');
    window.location.href = '/sign-in';
  };

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
        <DropdownMenuContent
          align="end"
          className="min-w-[200px] max-w-[250px] border border-gray-200 bg-white shadow-sm"
          sideOffset={5}
        >
          <div className="flex items-center gap-3 border-b border-gray-100 p-3">
            <Avatar className="h-6 w-6 border border-gray-200">
              <AvatarImage src={undefined} alt={userName} />
              <AvatarFallback className="bg-gray-100 text-sm font-medium text-gray-700">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="truncate font-medium text-gray-900">{userName}</span>
              <span className="truncate text-xs text-gray-500">{userEmail}</span>
            </div>
          </div>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={() => navigate('/settings/profile')}
          >
            <User className="h-4 w-4 text-gray-500" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={() => navigate('/settings/organization')}
          >
            <Settings className="h-4 w-4 text-gray-500" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={() => window.open('https://novu.co', '_blank')}
          >
            <Cloud className="h-4 w-4 text-gray-500" />
            <span>Try Novu Cloud</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 text-gray-500" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
