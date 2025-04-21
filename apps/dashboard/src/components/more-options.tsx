import { ReactNode } from 'react';
import { RiMoreLine } from 'react-icons/ri';
import { Button } from './primitives/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './primitives/dropdown-menu';

type MoreOptionsItem = {
  type: 'button' | 'link';
  label: string;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
};

interface MoreOptionsProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  items: MoreOptionsItem[];
  align?: 'start' | 'end';
}

export const MoreOptions = ({ isOpen, setIsOpen, items, align = 'end' }: MoreOptionsProps) => {
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="h-8 w-8 p-0" size="xs">
          <RiMoreLine className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {items.map((item, index) => (
          <DropdownMenuItem key={index} disabled={item.disabled} className={item.className} onClick={item.onClick}>
            <div className="flex items-center gap-2">
              {item.icon}
              {item.label}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
