import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/primitives/avatar';
import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { openInNewTab } from '../url';
import { NovuLogoBlackBg } from './icons';
import { useOrganization } from './index';

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
      </Button>
    </div>
  );
}

const OrganizationAvatar = ({ shining = false }: { shining?: boolean }) => {
  return (
    <Avatar className="relative h-6 w-6 overflow-hidden border-gray-200">
      <NovuLogoBlackBg />
      {shining && (
        <div className="absolute inset-0 before:absolute before:left-[-100%] before:top-0 before:h-full before:w-full before:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] before:transition-all before:duration-[10000ms] before:ease-in-out group-hover:before:left-[100%]"></div>
      )}
    </Avatar>
  );
};
