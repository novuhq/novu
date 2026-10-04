import { Fragment, type ReactNode } from 'react';
import { RiAddFill, RiCheckLine, RiErrorWarningFill, RiExpandUpDownLine } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { cn } from '@/utils/ui';
import {
  type ContentSource,
  DEFAULT_CONTENT_SOURCE,
  getContentSourceLabel,
  getOverridePath,
  getOverrideProviderDisplayName,
  getProviderOptionLabel,
  type IntegrationOverrideOption,
  isSameContentSource,
  type OverrideContentSource,
  type ProviderOverrideOption,
  toOverrideSource,
} from './content-source';

type ContentSourceSelectorProps = {
  selectedSource: ContentSource;
  providers: ProviderOverrideOption[];
  /** Override paths (`getOverridePath`) whose override has errors. */
  invalidSourcePaths?: Set<string>;
  /** Marks providers whose override payload is free-form. Off by default so existing tabs stay untouched. */
  showEscapeHatchBadge?: boolean;
  onSelectSource: (source: ContentSource) => void;
  onAddOverride?: (source: OverrideContentSource) => void;
};

type OverrideSourceItemProps = {
  option: ProviderOverrideOption | IntegrationOverrideOption;
  label: string;
  /** Muted text after the label, e.g. an integration's identifier. */
  detail?: string;
  icon?: ReactNode;
  selectedSource: ContentSource;
  invalidSourcePaths?: Set<string>;
  showEscapeHatchBadge: boolean;
  supportsOverrides: boolean;
  canAddOverrides: boolean;
  onSelectSource: (source: ContentSource) => void;
  onAddOverride?: (source: OverrideContentSource) => void;
};

function OverrideSourceItem({
  option,
  label,
  detail,
  icon,
  selectedSource,
  invalidSourcePaths,
  showEscapeHatchBadge,
  supportsOverrides,
  canAddOverrides,
  onSelectSource,
  onAddOverride,
}: OverrideSourceItemProps) {
  const source = toOverrideSource(option);
  const isSelected = isSameContentSource(selectedSource, source);
  const isInvalid = !!invalidSourcePaths?.has(getOverridePath(source));
  const canSelectDirectly = !supportsOverrides || option.hasOverride;
  const isDimmed = supportsOverrides && !option.hasOverride;

  return (
    <DropdownMenuItem
      disabled={!canSelectDirectly && !canAddOverrides}
      className={cn(
        'flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1',
        !icon && 'pl-[26px]',
        isSelected && 'bg-neutral-alpha-50'
      )}
      onSelect={() => {
        if (canSelectDirectly) {
          onSelectSource(source);
        } else if (canAddOverrides) {
          onAddOverride?.(source);
        }
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {icon}
        <span className={cn('truncate text-xs font-medium', isDimmed ? 'text-foreground-400' : 'text-foreground-950')}>
          {label}
        </span>
        {detail && <span className="text-foreground-400 min-w-0 truncate text-[11px]">{detail}</span>}
        {isInvalid && <RiErrorWarningFill className="text-destructive size-3 shrink-0" />}
        {!option.isConnected && option.hasOverride && (
          <span className="text-warning text-[10px] font-medium">disconnected</span>
        )}
      </div>

      {showEscapeHatchBadge && option.isEscapeHatch && (
        <span
          className="text-foreground-400 border-stroke-soft shrink-0 rounded-sm border px-1 text-[10px] font-medium uppercase leading-4 tracking-[0.2px]"
          title="No schema — this override is passed through to the provider API without validation."
        >
          no schema
        </span>
      )}
      {canAddOverrides && !option.hasOverride && (
        <button
          type="button"
          aria-label={`Add ${label} override`}
          className="text-foreground-400 hover:text-foreground-950 rounded p-0.5"
          onPointerDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            onAddOverride?.(source);
          }}
        >
          <RiAddFill className="size-3.5" />
        </button>
      )}
      {isSelected && canSelectDirectly && <RiCheckLine className="text-foreground-600 size-3.5 shrink-0" />}
    </DropdownMenuItem>
  );
}

export function ContentSourceSelector({
  selectedSource,
  providers,
  invalidSourcePaths,
  showEscapeHatchBadge = false,
  onSelectSource,
  onAddOverride,
}: ContentSourceSelectorProps) {
  const { isReadOnly } = useStepEditor();
  const supportsOverrides = !!onAddOverride;
  // Existing overrides stay browsable in read-only environments; only creating new ones is blocked.
  const canAddOverrides = supportsOverrides && !isReadOnly;
  const hasIntegrationRows = providers.some((provider) => provider.integrations.length > 0);
  const selectedLabel = getContentSourceLabel(selectedSource, providers);

  const itemProps = {
    selectedSource,
    invalidSourcePaths,
    supportsOverrides,
    canAddOverrides,
    onSelectSource,
    onAddOverride,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="border-stroke-soft bg-bg-white hover:bg-bg-weak flex h-7 min-w-0 items-center gap-0.5 border-r pl-2 pr-1 transition-colors"
        >
          {selectedSource !== DEFAULT_CONTENT_SOURCE && (
            <ProviderIcon
              providerId={selectedSource.providerId}
              providerDisplayName={getOverrideProviderDisplayName(selectedSource.providerId)}
              className="size-3.5"
            />
          )}
          <span className="text-label-xs text-text-sub truncate">{selectedLabel}</span>
          <RiExpandUpDownLine className="text-text-sub ml-0.5 size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={cn('w-[220px] p-1', hasIntegrationRows && 'w-[280px]')}>
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
              {supportsOverrides ? 'overrides' : 'providers'}
            </div>
            {providers.map((provider) => (
              <Fragment key={provider.providerId}>
                <OverrideSourceItem
                  {...itemProps}
                  option={provider}
                  label={getProviderOptionLabel(provider)}
                  icon={
                    <ProviderIcon
                      providerId={provider.providerId}
                      providerDisplayName={provider.displayName}
                      className={cn('size-4', !provider.hasOverride && supportsOverrides && 'grayscale opacity-50')}
                    />
                  }
                  showEscapeHatchBadge={showEscapeHatchBadge}
                />
                {provider.integrations.map((integration) => (
                  <OverrideSourceItem
                    {...itemProps}
                    key={integration.integrationIdentifier}
                    option={integration}
                    label={integration.name}
                    detail={integration.integrationIdentifier}
                    showEscapeHatchBadge={false}
                  />
                ))}
              </Fragment>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
