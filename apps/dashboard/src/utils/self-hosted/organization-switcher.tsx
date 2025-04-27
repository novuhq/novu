import { useNavigate } from 'react-router-dom';
import { useOrganization } from './index';
import { Button } from '@/components/primitives/button';
import { Avatar, AvatarFallback } from '@/components/primitives/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/primitives/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NovuLogoBlackBg } from './icons';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/primitives/tooltip';

export function OrganizationSwitcher() {
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
            className="group h-9 w-full justify-between bg-white p-1.5 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-0 focus-visible:shadow-none"
          >
            <div className="flex items-center gap-2">
              <OrganizationAvatar shining={true} />
              <span className="truncate text-sm font-medium text-gray-700">{organization.name}</span>
            </div>
            <ChevronDown className="ml-auto h-4 w-4 text-gray-500 opacity-0 transition duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border border-gray-200 bg-white p-2 shadow-sm"
          style={{ width: buttonWidth }}
          sideOffset={5}
        >
          <DropdownMenuItem className="flex items-center gap-2 text-gray-700 hover:bg-transparent">
            <OrganizationAvatar />
            <span>{organization.name}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem className="flex items-center gap-2 text-gray-700 hover:bg-transparent" asChild>
            {/* <div className="w-full"> */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-2 rounded-md bg-white px-2 py-1.5 text-left text-gray-400 transition-colors duration-150 hover:bg-gray-50 focus:outline-none focus:ring-0"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 text-2xl font-light">
                    <span className="-mt-0.5 leading-none">+</span>
                  </span>
                  <span className="text-base font-medium">Create Organization</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-neutral-950 text-white">
                Switch to Novu Cloud to manage multiple organizations.
              </TooltipContent>
            </Tooltip>
            {/* </div> */}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const OrganizationAvatar = ({ shining = false }: { shining?: boolean }) => {
  return (
    <Avatar className="relative h-6 w-6 overflow-hidden border-gray-200">
      <AvatarFallback className="relative bg-gradient-to-r from-red-500 to-red-600 text-xs text-white">
        <NovuLogoBlackBg />
        {shining && (
          <div className="absolute inset-0 before:absolute before:left-[-100%] before:top-0 before:h-full before:w-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] before:transition-all before:duration-[650ms] before:ease-in-out group-hover:before:left-[100%]"></div>
        )}
      </AvatarFallback>
    </Avatar>
  );
};
