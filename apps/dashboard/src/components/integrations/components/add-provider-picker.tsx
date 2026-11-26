import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  FeatureFlagsKeysEnum,
  type IProviderConfig,
  SmsProviderIdEnum,
} from '@novu/shared';
import { type RefObject, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiBracesLine, RiCheckboxCircleFill, RiSearch2Line, RiSearchLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { IS_CLOUD } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { isChannelVisibleInUi } from '@/utils/channels';
import { cn } from '@/utils/ui';
import { INTEGRATION_CHANNELS } from '../utils/channels';
import { useIntegrationList } from './hooks/use-integration-list';
import { ChannelSectionIcon } from './integration-channel-group';
import { ProviderDeprecatedBadge } from './provider-deprecation';
import { ProviderIcon } from './provider-icon';
import { ProviderRequestDialog, useProviderRequest } from './provider-request-dialog';
import { CHANNEL_LABELS } from './utils/helpers';
import { CARD_HOVER_SHADOW, CARD_SHADOW } from './utils/store-styles';

/** Three rows of two; the rest of the channel sits behind "Show all". */
const SECTION_PREVIEW_COUNT = 6;
const SUGGESTION_COUNT = 4;
const HTTP_STEP_DOCS_URL =
  'https://docs.novu.co/platform/workflow/add-and-configure-steps/configure-action-steps/http-step';

type ChannelFilter = 'all' | ChannelTypeEnum;

/** The design's compact 28px buttons: 13px label, 6px corners. */
const COMPACT_BUTTON = 'text-text-strong shrink-0 rounded-md text-[13px] leading-[1.1]';
const NEUTRAL_BUTTON_SHADOW = 'shadow-[0_1px_2px_0_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.08)] ring-0';

function openHttpStepDocs() {
  window.open(HTTP_STEP_DOCS_URL, '_blank', 'noopener,noreferrer');
}

/** How the provider signs in, where its first credential's name doesn't say it well. */
const AUTH_LABEL_OVERRIDES: Partial<Record<string, string>> = {
  [EmailProviderIdEnum.SES]: 'Access keys',
  [SmsProviderIdEnum.SNS]: 'Access keys',
  [EmailProviderIdEnum.Postmark]: 'Server token',
};

/** "Service Account (entire JSON file)" → "Service account"; acronyms such as API or SID keep their case. */
function getAuthLabel(provider: IProviderConfig) {
  const override = AUTH_LABEL_OVERRIDES[provider.id];
  if (override) return override;

  const credential = provider.credentials.find((item) => item.required) ?? provider.credentials[0];
  if (!credential?.displayName) return undefined;

  return credential.displayName
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word, index) => (index === 0 || word === word.toUpperCase() ? word : word.toLowerCase()))
    .join(' ');
}

type AddProviderPickerProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onProviderSelect: (providerId: string) => void;
  /** Channel chip to open on; anything that isn't a chip falls back to "All". */
  defaultChannel?: string | null;
};

/** Provider catalog in the "Add a provider" drawer: search, channel chips, suggestions and one section per channel. */
export function AddProviderPicker({
  searchQuery,
  onSearchChange,
  searchInputRef,
  onProviderSelect,
  defaultChannel,
}: AddProviderPickerProps) {
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const { integrations } = useFetchIntegrations();
  const { integrationsByChannel: providersByChannel } = useIntegrationList(searchQuery);
  const { integrationsByChannel: allProvidersByChannel } = useIntegrationList();

  // In-app only has Novu Inbox, which every environment gets on its own, so it has no chip.
  const channels = useMemo(
    () =>
      INTEGRATION_CHANNELS.filter(
        (channel) => isChannelVisibleInUi(channel, isToolChannelEnabled) && allProvidersByChannel[channel]?.length > 0
      ),
    [isToolChannelEnabled, allProvidersByChannel]
  );

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(
    () => channels.find((channel) => channel === defaultChannel) ?? 'all'
  );

  const installedProviderIds = useMemo(
    () =>
      new Set(
        (integrations ?? [])
          .filter((integration) => integration._environmentId === currentEnvironment?._id)
          .map((integration) => integration.providerId)
      ),
    [integrations, currentEnvironment?._id]
  );

  const isSearching = searchQuery.trim().length > 0;
  const visibleChannels = channelFilter === 'all' ? channels : channels.filter((channel) => channel === channelFilter);
  const sections = visibleChannels.filter((channel) => providersByChannel[channel]?.length > 0);
  const showSuggestions = channelFilter === 'all' && !isSearching;

  const suggestions = useMemo(
    () => (showSuggestions ? getSuggestions(channels, allProvidersByChannel, installedProviderIds) : []),
    [showSuggestions, channels, allProvidersByChannel, installedProviderIds]
  );

  const { isOpen: isRequestOpen, setIsOpen: setIsRequestOpen, requestProvider } = useProviderRequest();
  const hasNoMatches = isSearching && sections.length === 0;

  // The fade hints at more providers below, so it goes away once the list is scrolled to the end.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const updateHasMoreBelow = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setHasMoreBelow(element.scrollHeight - element.scrollTop - element.clientHeight > 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the list's height changes with the filter and the search.
  useLayoutEffect(() => {
    updateHasMoreBelow();
  }, [updateHasMoreBelow, channelFilter, searchQuery, suggestions.length]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(updateHasMoreBelow);
    observer.observe(element);

    return () => observer.disconnect();
  }, [updateHasMoreBelow]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-3 px-5 pb-3 pt-5">
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && searchQuery) {
              event.stopPropagation();
              onSearchChange('');
            }
          }}
          placeholder="Search channel providers"
          aria-label="Search channel providers"
          leadingIcon={RiSearchLine}
          size="sm"
        />
        {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would add a border and legend the design doesn't have. */}
        <div role="group" aria-label="Filter by channel" className="flex flex-wrap items-center gap-1.5">
          <ChannelChip isActive={channelFilter === 'all'} onClick={() => setChannelFilter('all')}>
            All
          </ChannelChip>
          {channels.map((channel) => (
            <ChannelChip key={channel} isActive={channelFilter === channel} onClick={() => setChannelFilter(channel)}>
              <ChannelSectionIcon channel={channel} size="sm" />
              {CHANNEL_LABELS[channel]}
            </ChannelChip>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={updateHasMoreBelow}
          className="scrollbar-custom flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-2"
        >
          {suggestions.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-label-sm text-text-strong">Suggested for you</h3>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    description={[CHANNEL_LABELS[provider.channel], getAuthLabel(provider)].filter(Boolean).join(' · ')}
                    onClick={() => onProviderSelect(provider.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {sections.map((channel) => {
            const providers = providersByChannel[channel];
            // Searching or filtering to one channel lists everything; "All" previews each channel.
            const isPreview = channelFilter === 'all' && !isSearching;
            const shownProviders = isPreview ? providers.slice(0, SECTION_PREVIEW_COUNT) : providers;

            return (
              <section key={channel} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <ChannelSectionIcon channel={channel} size="sm" />
                  <h3 className="text-label-sm text-text-strong">{CHANNEL_LABELS[channel]}</h3>
                  <span className="text-paragraph-sm text-text-soft">{providers.length}</span>
                  {isPreview && providers.length > shownProviders.length && (
                    <button
                      type="button"
                      onClick={() => setChannelFilter(channel)}
                      className="text-label-xs text-text-strong hover:text-text-sub ml-auto flex items-center gap-0.5 transition-colors"
                    >
                      Show all {providers.length}
                      <RiArrowRightSLine className="size-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shownProviders.map((provider) => {
                    const isInstalled = installedProviderIds.has(provider.id);

                    return (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        description={isInstalled ? 'Installed' : getAuthLabel(provider)}
                        isInstalled={isInstalled}
                        onClick={() => onProviderSelect(provider.id)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}

          {hasNoMatches && (
            <NoProvidersMatch
              query={searchQuery.trim()}
              onRequestProvider={requestProvider}
              onClearSearch={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
            />
          )}
          {!isSearching && sections.length === 0 && (
            <div className="text-paragraph-sm text-text-soft flex min-h-[200px] items-center justify-center text-center">
              No providers available
            </div>
          )}
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-b from-transparent to-bg-white transition-opacity duration-200',
            hasMoreBelow ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      {/* The empty state already offers both ways out, so the footer would only repeat them. */}
      {!hasNoMatches && <PickerFooter onRequestProvider={requestProvider} />}

      {IS_CLOUD && (
        <ProviderRequestDialog
          open={isRequestOpen}
          onOpenChange={setIsRequestOpen}
          defaultProviderName={searchQuery.trim()}
        />
      )}
    </div>
  );
}

/** Ways out when the provider isn't in the catalog: ask for it, or call its API from an HTTP Request step. */
function PickerFooter({ onRequestProvider }: { onRequestProvider: () => void }) {
  return (
    <div className="bg-bg-weak border-stroke-soft flex items-center gap-2 border-t px-5 py-3">
      <p className="text-label-xs flex min-w-0 flex-1 items-center gap-1 whitespace-nowrap">
        <span className="text-text-sub">Can’t find yours?</span>
        <button type="button" onClick={onRequestProvider} className="text-primary-base hover:underline">
          Request a provider
        </button>
      </p>
      {/* Button's `asChild` doesn't render a wrapped <a>, so the docs open on click instead. */}
      <Button
        variant="secondary"
        mode="outline"
        size="2xs"
        className={cn(COMPACT_BUTTON, NEUTRAL_BUTTON_SHADOW)}
        onClick={openHttpStepDocs}
      >
        Use an HTTP Request step
      </Button>
    </div>
  );
}

/** Search found nothing: ask for the provider by name, clear the search, or call its API with an HTTP Request step. */
function NoProvidersMatch({
  query,
  onRequestProvider,
  onClearSearch,
}: {
  query: string;
  onRequestProvider: () => void;
  onClearSearch: () => void;
}) {
  const providerName = query.charAt(0).toUpperCase() + query.slice(1);

  return (
    <div className="flex flex-col items-center gap-1.5 pb-14 pt-24 text-center">
      <span
        className={cn(
          'bg-bg-white text-text-strong flex size-10 items-center justify-center rounded-[10px]',
          CARD_SHADOW
        )}
      >
        <RiSearch2Line className="size-[18px]" />
      </span>
      <h3 className="text-label-md text-text-strong mt-1.5 max-w-full truncate">No providers match “{query}”</h3>
      <p className="text-paragraph-sm text-text-sub w-[380px] max-w-full">
        Check the spelling or browse by channel. Still missing? Ask us to add it.
      </p>
      <div className="flex max-w-full items-start gap-2 pt-3">
        <Button
          variant="secondary"
          mode="outline"
          size="2xs"
          className={cn(COMPACT_BUTTON, NEUTRAL_BUTTON_SHADOW, 'min-w-0 max-w-[240px]')}
          onClick={onRequestProvider}
        >
          <span className="truncate">Request {providerName}</span>
        </Button>
        <Button variant="secondary" mode="ghost" size="2xs" className={COMPACT_BUTTON} onClick={onClearSearch}>
          Clear search
        </Button>
      </div>
      <button
        type="button"
        onClick={openHttpStepDocs}
        className={cn(
          'bg-bg-white mt-3 flex w-[400px] max-w-full flex-col gap-3 rounded-[10px] py-3 pl-3 pr-3.5 text-left transition-shadow',
          CARD_SHADOW,
          CARD_HOVER_SHADOW,
          'focus-visible:ring-stroke-strong outline-none focus-visible:ring-2'
        )}
      >
        <span className="flex w-full items-start justify-between">
          <span className="bg-bg-weak border-stroke-soft text-text-sub flex size-8 items-center justify-center rounded-lg border">
            <RiBracesLine className="size-3.5" />
          </span>
          <RiArrowRightSLine className="text-text-soft size-4" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-label-sm text-text-strong">Use an HTTP Request step</span>
          <span className="text-paragraph-xs text-text-soft">
            Call any API from a workflow with your own URL, headers and body. For logic in code, use a Custom step.
          </span>
        </span>
      </button>
    </div>
  );
}

/**
 * Popular providers the environment doesn't have yet, one per channel in turn.
 * Channels with nothing installed go first, since that's where a provider is missing.
 */
function getSuggestions(
  channels: readonly ChannelTypeEnum[],
  providersByChannel: Record<string, IProviderConfig[]>,
  installedProviderIds: Set<string>
) {
  const candidates = channels.map((channel) =>
    (providersByChannel[channel] ?? []).filter((provider) => !installedProviderIds.has(provider.id))
  );
  const isChannelEmpty = channels.map((channel) =>
    (providersByChannel[channel] ?? []).every((provider) => !installedProviderIds.has(provider.id))
  );
  const order = channels.map((_, index) => index).sort((a, b) => Number(isChannelEmpty[b]) - Number(isChannelEmpty[a]));

  const picked: IProviderConfig[] = [];
  for (let round = 0; picked.length < SUGGESTION_COUNT; round++) {
    const roundPicks = order.flatMap((index) => candidates[index][round] ?? []);
    if (roundPicks.length === 0) break;
    picked.push(...roundPicks);
  }

  return picked.slice(0, SUGGESTION_COUNT);
}

function ChannelChip({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        'text-label-sm flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-shadow',
        isActive
          ? 'bg-bg-strong text-text-white'
          : cn('bg-bg-white text-text-sub hover:text-text-strong', CARD_SHADOW, CARD_HOVER_SHADOW),
        // The chip holds a channel tile; tighten the left side so the tile sits like an icon.
        !isActive && 'has-[span]:pl-1.5'
      )}
    >
      {children}
    </button>
  );
}

function ProviderCard({
  provider,
  description,
  isInstalled,
  onClick,
}: {
  provider: IProviderConfig;
  description?: string;
  isInstalled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-test-id={`add-provider-${provider.id}`}
      className={cn(
        'bg-bg-white flex min-w-0 items-center gap-2.5 rounded-[10px] py-2.5 pl-2.5 pr-3 text-left transition-shadow',
        CARD_SHADOW,
        CARD_HOVER_SHADOW,
        'focus-visible:ring-stroke-strong outline-none focus-visible:ring-2'
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
        <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-[19px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-label-sm text-text-strong truncate">{provider.displayName}</span>
          <ProviderDeprecatedBadge provider={provider} className="shrink-0" />
        </span>
        {description && <span className="text-paragraph-xs text-text-soft truncate">{description}</span>}
      </span>
      {isInstalled && <RiCheckboxCircleFill className="text-success size-4 shrink-0" aria-label="Installed" />}
    </button>
  );
}
