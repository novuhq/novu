import { Command as CommandPrimitive } from 'cmdk';
import { Fragment, type ReactNode, useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiErrorWarningFill,
  RiExpandUpDownLine,
  RiExternalLinkLine,
  RiSearchLine,
} from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Command, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import type { IntegrationOverrideOption, ProviderOverrideOption } from './override-options';
import {
  type ContentSource,
  DEFAULT_CONTENT_SOURCE,
  getOverridePath,
  isSameContentSource,
  type OverrideContentSource,
} from './override-source';
import {
  ALL_INTEGRATIONS_LABEL,
  DEFAULT_CONTENT_LABEL,
  describeOverrideSource,
  getContentSourceLabel,
} from './override-source-description';

/** Below this many provider and integration rows the whole list fits without searching. */
const SEARCH_ROW_THRESHOLD = 8;

const MENU_ROW_CLASS =
  'group flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 data-[selected=true]:bg-bg-muted';

const SEPARATOR = (
  <div className="py-[3px]">
    <div className="bg-stroke-weak h-px" />
  </div>
);

type ContentSourceSelectorProps = {
  selectedSource: ContentSource;
  providers: ProviderOverrideOption[];
  /** Override paths (`getOverridePath`) whose override has errors. */
  invalidSourcePaths?: Set<string>;
  /** Marks providers whose override payload is free-form. Off by default so existing tabs stay untouched. */
  showEscapeHatchBadge?: boolean;
  /** Overrides configured on the step, counted on the trigger while it shows the default content. */
  overrideCount?: number;
  onSelectSource: (source: ContentSource) => void;
  onAddOverride?: (source: OverrideContentSource) => void;
};

type OverrideSourceItemProps = {
  option: ProviderOverrideOption | IntegrationOverrideOption;
  label: string;
  /** Muted monospace text after the label, e.g. an integration's identifier. */
  detail?: string;
  /** Pushes `detail` to the far end of the row instead of right after the label. */
  isDetailTrailing?: boolean;
  icon?: ReactNode;
  /** Label colour of a row that has no override yet. */
  dimmedLabelClassName: string;
  selectedSource: ContentSource;
  invalidSourcePaths?: Set<string>;
  showNoSchemaBadge?: boolean;
  supportsOverrides: boolean;
  canAddOverrides: boolean;
  onPick: (source: OverrideContentSource, canSelectDirectly: boolean) => void;
};

function NoSchemaBadge() {
  return (
    <span
      className="text-text-soft border-stroke-soft shrink-0 rounded-sm border px-1 text-[10px] font-medium uppercase leading-4 tracking-[0.2px]"
      title="No schema — this override is passed through to the provider API without validation."
    >
      no schema
    </span>
  );
}

function OverrideSourceItem({
  option,
  label,
  detail,
  isDetailTrailing = false,
  icon,
  dimmedLabelClassName,
  selectedSource,
  invalidSourcePaths,
  showNoSchemaBadge = false,
  supportsOverrides,
  canAddOverrides,
  onPick,
}: OverrideSourceItemProps) {
  const { source } = option;
  const isSelected = isSameContentSource(selectedSource, source);
  const isInvalid = !!invalidSourcePaths?.has(getOverridePath(source));
  const canSelectDirectly = !supportsOverrides || option.hasOverride;
  const isDimmed = supportsOverrides && !option.hasOverride;
  const detailNode = detail ? <span className="text-code-2xs text-text-soft shrink-0 truncate">{detail}</span> : null;

  return (
    <CommandItem
      value={getOverridePath(source)}
      disabled={!canSelectDirectly && !canAddOverrides}
      className={MENU_ROW_CLASS}
      onSelect={() => onPick(source, canSelectDirectly)}
    >
      {icon}
      <span className={cn('text-label-xs truncate', isDimmed ? dimmedLabelClassName : 'text-text-strong')}>
        {label}
      </span>
      {!isDetailTrailing && detailNode}
      {isInvalid && <RiErrorWarningFill className="text-error-base size-3 shrink-0" />}
      {!option.isConnected && option.hasOverride && (
        <span className="text-warning text-[10px] font-medium">disconnected</span>
      )}
      <div className="h-px min-w-0 flex-1" />
      {showNoSchemaBadge && <NoSchemaBadge />}
      {isDetailTrailing && detailNode}
      {canAddOverrides && !option.hasOverride && (
        <span
          aria-hidden
          className="border-stroke-soft bg-bg-white text-label-2xs text-text-sub hidden shrink-0 items-center gap-0.5 rounded border py-px pl-1 pr-1.5 group-data-[selected=true]:inline-flex"
        >
          <RiAddLine className="size-3" />
          Override
        </span>
      )}
      {isSelected && canSelectDirectly && <RiCheckLine className="text-text-sub size-3.5 shrink-0" />}
    </CommandItem>
  );
}

function matchesQuery(query: string, ...values: Array<string | undefined>): boolean {
  return values.some((value) => value?.toLowerCase().includes(query));
}

type VisibleProvider = {
  provider: ProviderOverrideOption;
  showAllIntegrationsRow: boolean;
};

/**
 * Narrows the picker to the query: a provider whose name matches keeps all its rows, otherwise only
 * the integrations that match are kept and the provider-wide row is dropped.
 */
function filterProviders(providers: ProviderOverrideOption[], rawQuery: string): VisibleProvider[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return providers.map((provider) => ({ provider, showAllIntegrationsRow: true }));
  }

  return providers.flatMap<VisibleProvider>((provider) => {
    if (matchesQuery(query, provider.displayName, provider.soleIntegrationIdentifier)) {
      return [{ provider, showAllIntegrationsRow: true }];
    }

    const integrations = provider.integrations.filter((integration) =>
      matchesQuery(query, integration.name, integration.source.integrationIdentifier)
    );

    return integrations.length > 0 ? [{ provider: { ...provider, integrations }, showAllIntegrationsRow: false }] : [];
  });
}

type ContentSourceTriggerLabelProps = {
  selectedSource: ContentSource;
  providers: ProviderOverrideOption[];
  overrideCount: number;
  hasError: boolean;
};

function ContentSourceTriggerLabel({
  selectedSource,
  providers,
  overrideCount,
  hasError,
}: ContentSourceTriggerLabelProps) {
  if (selectedSource === DEFAULT_CONTENT_SOURCE) {
    return (
      <>
        <span className="text-label-xs text-text-sub truncate">{DEFAULT_CONTENT_LABEL}</span>
        {overrideCount > 0 && (
          <span className="border-stroke-soft bg-bg-white text-label-2xs text-text-sub shrink-0 rounded border px-1.5 py-0.5">
            {overrideCount === 1 ? '1 override' : `${overrideCount} overrides`}
          </span>
        )}
      </>
    );
  }

  const { providerName, ownerLabel, isGrouped } = describeOverrideSource(selectedSource, providers);

  return (
    <>
      <ProviderIcon providerId={selectedSource.providerId} providerDisplayName={providerName} className="size-3.5" />
      {isGrouped ? (
        <>
          <span className="text-label-xs text-text-soft truncate">{providerName}</span>
          <RiArrowRightSLine className="text-text-soft size-3 shrink-0" />
          <span className="text-label-xs text-text-strong truncate">{ownerLabel}</span>
        </>
      ) : (
        <span className="text-label-xs text-text-strong truncate">{providerName}</span>
      )}
      {hasError && <RiErrorWarningFill className="text-error-base size-3 shrink-0" />}
    </>
  );
}

export function ContentSourceSelector({
  selectedSource,
  providers,
  invalidSourcePaths,
  showEscapeHatchBadge = false,
  overrideCount = 0,
  onSelectSource,
  onAddOverride,
}: ContentSourceSelectorProps) {
  const { isReadOnly } = useStepEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const supportsOverrides = !!onAddOverride;
  // Existing overrides stay browsable in read-only environments; only creating new ones is blocked.
  const canAddOverrides = supportsOverrides && !isReadOnly;
  const hasIntegrationRows = providers.some((provider) => provider.integrations.length > 0);
  const rowCount = providers.reduce((count, provider) => count + 1 + provider.integrations.length, 0);
  const isSearchable = rowCount >= SEARCH_ROW_THRESHOLD;
  const visibleProviders = useMemo(
    () => filterProviders(providers, isSearchable ? query : ''),
    [isSearchable, providers, query]
  );
  const hasSelectedSourceError =
    selectedSource !== DEFAULT_CONTENT_SOURCE && !!invalidSourcePaths?.has(getOverridePath(selectedSource));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setQuery('');
    }
  };

  const select = (source: ContentSource) => {
    onSelectSource(source);
    handleOpenChange(false);
  };

  const handlePick = (source: OverrideContentSource, canSelectDirectly: boolean) => {
    if (canSelectDirectly) {
      select(source);
    } else if (canAddOverrides) {
      onAddOverride?.(source);
      handleOpenChange(false);
    }
  };

  const itemProps = {
    selectedSource,
    invalidSourcePaths,
    supportsOverrides,
    canAddOverrides,
    onPick: handlePick,
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Content source: ${getContentSourceLabel(selectedSource, providers)}`}
          className="border-stroke-soft bg-bg-white hover:bg-bg-weak flex h-7 min-w-0 items-center gap-1 border-r pl-2 pr-1.5 transition-colors"
        >
          <ContentSourceTriggerLabel
            selectedSource={selectedSource}
            providers={providers}
            overrideCount={supportsOverrides ? overrideCount : 0}
            hasError={hasSelectedSourceError}
          />
          <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'min-w-0 rounded-lg border-none p-0 shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_4px_8px_0px_rgba(0,0,0,0.08),0px_8px_16px_0px_rgba(0,0,0,0.08)]',
          hasIntegrationRows ? 'w-[300px]' : 'w-[260px]'
        )}
      >
        <Command shouldFilter={false} className="rounded-lg">
          {isSearchable && (
            <div className="border-stroke-soft flex items-center gap-1.5 border-b px-2 py-1.5">
              <RiSearchLine className="text-text-soft size-[13px] shrink-0" />
              <CommandPrimitive.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search integrations"
                className="text-paragraph-xs text-text-strong placeholder:text-text-soft w-full bg-transparent outline-none"
              />
            </div>
          )}
          <CommandList className="max-h-[360px] p-1">
            <CommandItem
              value="default"
              className={cn(MENU_ROW_CLASS, 'pl-1')}
              onSelect={() => select(DEFAULT_CONTENT_SOURCE)}
            >
              <span className="text-label-xs text-text-strong flex-1">{DEFAULT_CONTENT_LABEL}</span>
              {selectedSource === DEFAULT_CONTENT_SOURCE && <RiCheckLine className="text-text-sub size-3.5 shrink-0" />}
            </CommandItem>

            {providers.length > 0 && (
              <>
                {SEPARATOR}
                <div className="text-subheading-2xs text-text-soft pb-0.5 pl-1.5 pt-1 uppercase">
                  {supportsOverrides ? 'Overrides' : 'Providers'}
                </div>
                {visibleProviders.length === 0 && (
                  <div className="text-paragraph-xs text-text-soft px-1.5 py-2">No integrations match "{query}"</div>
                )}
                {visibleProviders.map(({ provider, showAllIntegrationsRow }) => {
                  const icon = (
                    <ProviderIcon
                      providerId={provider.providerId}
                      providerDisplayName={provider.displayName}
                      className="size-4 shrink-0"
                    />
                  );
                  const showNoSchemaBadge = showEscapeHatchBadge && provider.isEscapeHatch;

                  if (provider.integrations.length === 0) {
                    return (
                      <OverrideSourceItem
                        {...itemProps}
                        key={provider.providerId}
                        option={provider}
                        label={provider.displayName}
                        detail={provider.soleIntegrationIdentifier}
                        isDetailTrailing
                        icon={icon}
                        dimmedLabelClassName="text-text-sub"
                        showNoSchemaBadge={showNoSchemaBadge}
                      />
                    );
                  }

                  return (
                    <Fragment key={provider.providerId}>
                      <div className="flex min-h-7 items-center gap-1.5 px-1.5 py-1">
                        {icon}
                        <span className="text-label-xs text-text-strong min-w-0 flex-1 truncate">
                          {provider.displayName}
                        </span>
                        {showNoSchemaBadge && <NoSchemaBadge />}
                        <span className="text-paragraph-xs text-text-soft shrink-0">
                          {provider.integrations.length === 1
                            ? '1 integration'
                            : `${provider.integrations.length} integrations`}
                        </span>
                      </div>
                      <div className="flex pl-[13px]">
                        <div className="bg-stroke-soft w-px shrink-0 self-stretch" />
                        <div className="flex min-w-0 flex-1 flex-col gap-px pl-1.5">
                          {showAllIntegrationsRow && (
                            <OverrideSourceItem
                              {...itemProps}
                              option={provider}
                              label={ALL_INTEGRATIONS_LABEL}
                              dimmedLabelClassName="text-text-soft"
                            />
                          )}
                          {provider.integrations.map((integration) => (
                            <OverrideSourceItem
                              {...itemProps}
                              key={integration.source.integrationIdentifier}
                              option={integration}
                              label={integration.name}
                              detail={
                                integration.name === integration.source.integrationIdentifier
                                  ? undefined
                                  : integration.source.integrationIdentifier
                              }
                              dimmedLabelClassName="text-text-soft"
                            />
                          ))}
                        </div>
                      </div>
                    </Fragment>
                  );
                })}
              </>
            )}

            {SEPARATOR}
            <CommandItem
              value="manage-integrations"
              className={MENU_ROW_CLASS}
              onSelect={() => {
                window.open(ROUTES.INTEGRATIONS, '_blank', 'noopener,noreferrer');
                handleOpenChange(false);
              }}
            >
              <span className="text-label-xs text-text-sub flex-1">Manage integrations</span>
              <RiExternalLinkLine className="text-text-soft size-3 shrink-0" />
            </CommandItem>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
