import { RiCheckLine, RiExpandUpDownLine } from 'react-icons/ri';

import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/utils/ui';
import type { ChatPreviewProviderOption } from './use-configured-chat-providers';

type PlatformSelectorProps = {
  activeOption?: ChatPreviewProviderOption;
  options: ChatPreviewProviderOption[];
  onSelect: (providerId: string) => void;
};

export function PlatformSelector({ activeOption, options, onSelect }: PlatformSelectorProps) {
  const activeProviderId = activeOption?.providerId;

  return (
    <div className="border-stroke-soft bg-bg-weak flex h-7 w-full shrink-0 items-center border-b">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Select preview platform"
            className="border-stroke-soft bg-bg-white hover:bg-bg-weak flex h-full items-center gap-1 border-r pl-2 pr-1 transition-colors"
          >
            {activeOption && (
              <ProviderIcon
                providerId={activeOption.providerId}
                providerDisplayName={activeOption.displayName}
                className="size-3.5 shrink-0"
              />
            )}
            <span className="text-label-xs text-text-sub">{activeOption?.displayName ?? activeProviderId}</span>
            <RiExpandUpDownLine className="text-text-sub size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-55 p-1">
          {options.map((option) => {
            const isSelected = option.providerId === activeProviderId;

            return (
              <DropdownMenuItem
                key={option.providerId}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1',
                  isSelected && 'bg-neutral-alpha-50'
                )}
                onSelect={() => onSelect(option.providerId)}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <ProviderIcon
                    providerId={option.providerId}
                    providerDisplayName={option.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-foreground-950 truncate text-xs font-medium">{option.displayName}</span>
                </span>
                {isSelected && <RiCheckLine className="text-foreground-600 size-3.5 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="h-full flex-1" />
    </div>
  );
}
