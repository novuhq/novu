import {
  RiAddFill,
  RiArrowDownSLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiSelectBoxCircleFill,
} from 'react-icons/ri';
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
  onAddOverride: (providerId: ToolOverrideProviderOption['providerId']) => void;
  onRemoveOverride: (providerId: ToolOverrideProviderOption['providerId']) => void;
};

export function ToolContentSourceSelector({
  selectedSource,
  providers,
  invalidProviderIds,
  onSelectSource,
  onAddOverride,
  onRemoveOverride,
}: ToolContentSourceSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-foreground-950 hover:bg-neutral-alpha-50 flex h-7 items-center gap-1 rounded-md px-1.5 text-xs font-medium"
        >
          {selectedSource !== DEFAULT_CONTENT_SOURCE && (
            <ProviderIcon
              providerId={selectedSource}
              providerDisplayName={getContentSourceLabel(selectedSource)}
              className="size-3.5"
            />
          )}
          <span>{getContentSourceLabel(selectedSource)}</span>
          <RiArrowDownSLine className="text-foreground-600 size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px] p-1">
        <DropdownMenuItem
          className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1"
          onSelect={() => onSelectSource(DEFAULT_CONTENT_SOURCE)}
        >
          <div className="flex items-center gap-1">
            <span className="text-foreground-600 text-xs font-medium">Default content</span>
            <RiSelectBoxCircleFill className="size-3 text-success" />
          </div>
          {selectedSource === DEFAULT_CONTENT_SOURCE && <RiCheckLine className="text-foreground-600 size-3.5" />}
        </DropdownMenuItem>

        {providers.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <div className="text-foreground-400 px-1.5 py-1 text-[11px] font-medium uppercase tracking-[0.22px]">
              overrides
            </div>
            {providers.map((provider) => {
              const isSelected = selectedSource === provider.providerId;
              const isInvalid = invalidProviderIds?.has(provider.providerId);

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
                      if (provider.hasOverride) {
                        onSelectSource(provider.providerId);
                      } else {
                        onAddOverride(provider.providerId);
                      }
                    }}
                  >
                    <ProviderIcon
                      providerId={provider.providerId}
                      providerDisplayName={provider.displayName}
                      className={cn('size-4', !provider.hasOverride && 'opacity-50')}
                    />
                    <span
                      className={cn(
                        'truncate text-xs font-medium',
                        provider.hasOverride ? 'text-foreground-950' : 'text-foreground-400'
                      )}
                    >
                      {provider.displayName}
                    </span>
                    {isInvalid && <RiErrorWarningFill className="text-destructive size-3 shrink-0" />}
                    {!provider.isConnected && provider.hasOverride && (
                      <span className="text-warning text-[10px] font-medium">disconnected</span>
                    )}
                  </button>

                  {provider.hasOverride ? (
                    <div className="flex items-center gap-1">
                      {isSelected && <RiCheckLine className="text-foreground-600 size-3.5" />}
                      <button
                        type="button"
                        data-override-action="remove"
                        aria-label={`Remove ${provider.displayName} override`}
                        className="text-foreground-400 hover:text-foreground-950 rounded p-0.5"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveOverride(provider.providerId);
                        }}
                      >
                        <RiCloseLine className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-override-action="add"
                      aria-label={`Add ${provider.displayName} override`}
                      className="text-foreground-400 hover:text-foreground-950 rounded p-0.5"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddOverride(provider.providerId);
                      }}
                    >
                      <RiAddFill className="size-3.5" />
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
