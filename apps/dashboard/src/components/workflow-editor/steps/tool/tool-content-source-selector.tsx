import { RiAddFill, RiCheckLine, RiErrorWarningFill, RiExpandUpDownLine } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { cn } from '@/utils/ui';
import {
  DEFAULT_CONTENT_SOURCE,
  getContentSourceLabel,
  type ToolContentSource,
  type ToolOverrideProviderOption,
} from './tool-content-source';

type ToolContentSourceSelectorProps = {
  selectedSource: ToolContentSource;
  providers: ToolOverrideProviderOption[];
  invalidProviderIds?: Set<string>;
  onSelectSource: (source: ToolContentSource) => void;
  /** When provided, providers without overrides show an add affordance; when omitted, every provider is selectable. */
  onAddOverride?: (providerId: ToolOverrideProviderOption['providerId']) => void;
};

export function ToolContentSourceSelector({
  selectedSource,
  providers,
  invalidProviderIds,
  onSelectSource,
  onAddOverride,
}: ToolContentSourceSelectorProps) {
  const canAddOverrides = !!onAddOverride;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="border-stroke-soft bg-bg-white hover:bg-bg-weak flex h-7 items-center gap-0.5 border-r pl-2 pr-1 transition-colors"
        >
          {selectedSource !== DEFAULT_CONTENT_SOURCE && (
            <ProviderIcon
              providerId={selectedSource}
              providerDisplayName={getContentSourceLabel(selectedSource)}
              className="size-3.5"
            />
          )}
          <span className="text-label-xs text-text-sub">{getContentSourceLabel(selectedSource)}</span>
          <RiExpandUpDownLine className="text-text-sub ml-0.5 size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px] p-1">
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1"
          onSelect={() => onSelectSource(DEFAULT_CONTENT_SOURCE)}
        >
          <span className="text-foreground-600 text-xs font-medium">Default content</span>
          {selectedSource === DEFAULT_CONTENT_SOURCE && <RiCheckLine className="text-foreground-600 size-3.5" />}
        </DropdownMenuItem>

        {providers.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <div className="text-foreground-400 px-1.5 py-1 text-[11px] font-medium uppercase tracking-[0.22px]">
              {canAddOverrides ? 'overrides' : 'providers'}
            </div>
            {providers.map((provider) => {
              const isSelected = selectedSource === provider.providerId;
              const isInvalid = invalidProviderIds?.has(provider.providerId);
              const canSelectDirectly = !canAddOverrides || provider.hasOverride;

              return (
                <DropdownMenuItem
                  key={provider.providerId}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1',
                    isSelected && 'bg-neutral-alpha-50'
                  )}
                  onSelect={(event) => {
                    if ((event.target as HTMLElement).closest('[data-override-action]')) {
                      event.preventDefault();
                    }
                  }}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1"
                    onClick={() => {
                      if (canSelectDirectly) {
                        onSelectSource(provider.providerId);
                      } else {
                        onAddOverride?.(provider.providerId);
                      }
                    }}
                  >
                    <ProviderIcon
                      providerId={provider.providerId}
                      providerDisplayName={provider.displayName}
                      className={cn('size-4', !provider.hasOverride && canAddOverrides && 'grayscale opacity-50')}
                    />
                    <span
                      className={cn(
                        'truncate text-xs font-medium',
                        provider.hasOverride || !canAddOverrides ? 'text-foreground-950' : 'text-foreground-400'
                      )}
                    >
                      {provider.displayName}
                    </span>
                    {isInvalid && <RiErrorWarningFill className="text-destructive size-3 shrink-0" />}
                    {!provider.isConnected && provider.hasOverride && (
                      <span className="text-warning text-[10px] font-medium">disconnected</span>
                    )}
                  </button>

                  {canAddOverrides && !provider.hasOverride && (
                    <button
                      type="button"
                      data-override-action="add"
                      aria-label={`Add ${provider.displayName} override`}
                      className="text-foreground-400 hover:text-foreground-950 rounded p-0.5"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddOverride?.(provider.providerId);
                      }}
                    >
                      <RiAddFill className="size-3.5" />
                    </button>
                  )}
                  {isSelected && canSelectDirectly && <RiCheckLine className="text-foreground-600 size-3.5 shrink-0" />}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
