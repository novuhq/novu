'use-client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '../../../utils/tw';
import { Archive, ArrowDropDown, Check, InboxIcon, Unread } from './icons';
import { Show } from './show';
import { useStatus } from './status-context';

const STATUS_TEXT: Record<string, string> = {
  all: 'Inbox',
  unread: 'Unread',
  archived: 'Archived',
};

const STATUS_OPTIONS_TEXT: Record<string, string> = {
  all: 'Unread & read',
  unread: 'Unread only',
  archived: 'Archived',
};

const dropdownItemVariants = () =>
  'focus:outline-none rounded-lg items-center hover:bg-neutral-alpha-50 focus-visible:bg-neutral-alpha-50 py-1 px-3';

export const StatusItem = (props: {
  onClick: () => void;
  isSelected?: boolean;
  icon: React.ReactNode;
  label: string;
}) => {
  return (
    <DropdownMenuItem
      className={cn(dropdownItemVariants(), 'flex gap-8 justify-between hover:bg-[#E9E9E8]')}
      onClick={props.onClick}
    >
      <span className={'flex gap-2 items-center flex-nowrap'}>
        <span>{props.icon}</span>
        <span>{props.label}</span>
      </span>
      <Show when={props.isSelected}>
        <span>
          <Check />
        </span>
      </Show>
    </DropdownMenuItem>
  );
};

export const StatusDropdown = () => {
  const { status, setStatus } = useStatus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={'gap-2 flex'}>
        <span className={'text-md font-semibold'}>{STATUS_TEXT[status]}</span>
        <span className={'text-foreground-alpha-600'}>
          <ArrowDropDown />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#f5f5f4] text-[#726F77] min-w-content">
        <StatusItem
          onClick={() => setStatus('all')}
          icon={<InboxIcon />}
          isSelected={status === 'all'}
          label={STATUS_OPTIONS_TEXT.all}
        />
        <StatusItem
          onClick={() => setStatus('unread')}
          icon={<Unread />}
          isSelected={status === 'unread'}
          label={STATUS_OPTIONS_TEXT.unread}
        />
        <StatusItem
          onClick={() => setStatus('archived')}
          icon={<Archive />}
          isSelected={status === 'archived'}
          label={STATUS_OPTIONS_TEXT.archived}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
