import { useNavigate } from 'react-router-dom';
import { useOrganization } from './index';
import { Button } from '@/components/primitives/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { ChevronDown, Settings, Cloud } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

function getInitials(name: string | null) {
  if (!name) return '';

  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const { organization } = useOrganization() as { organization: { name: string } | undefined };
  const [isOpen, setIsOpen] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (buttonRef.current) {
      setButtonWidth(buttonRef.current.offsetWidth);
    }
  }, [isOpen]);

  if (!organization) return null;

  return (
    <div className="w-full [&:focus-visible]:shadow-none [&:focus]:shadow-none">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={buttonRef}
            variant="secondary"
            size="sm"
            className="h-9 w-full justify-between bg-white p-1.5 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus-visible:shadow-none"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 border-gray-200">
                <AvatarImage src={undefined} alt={organization.name} />
                <AvatarFallback className="bg-gray-100 text-xs text-gray-700">
                  {getInitials(organization.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-gray-700">{organization.name}</span>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 text-gray-500 opacity-0 transition duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border border-gray-200 bg-white shadow-sm"
          style={{ width: buttonWidth }}
          sideOffset={5}
        >
          <DropdownMenuItem
            className="flex cursor-pointer items-center gap-2 text-gray-700 hover:bg-gray-50"
            onClick={() => navigate('/settings/organization')}
          >
            <Settings className="h-4 w-4 text-gray-500" />
            <span>Organization Settings</span>
          </DropdownMenuItem>
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
