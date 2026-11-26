import {
  ChannelTypeEnum,
  FeatureFlagsKeysEnum,
  type IIntegration,
  type IProviderConfig,
  isAgentInboxProvider,
  NOVU_PROVIDERS,
  providers as novuProviders,
} from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/primitives/skeleton';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { isChannelVisibleInUi } from '@/utils/channels';
import { useFetchIntegrations } from '../../../hooks/use-fetch-integrations';
import { TableIntegration } from '../types';
import { IntegrationChannelGroup } from './integration-channel-group';
import { IntegrationEmptyChannel } from './integration-empty-channel';
import { IntegrationSearchEmptyState } from './integration-search-empty-state';
import { IntegrationStoreAddCard } from './integration-store-add-card';
import { IntegrationStoreZeroState } from './integration-store-zero-state';
import { EMPTY_CHANNEL_CONTENT } from './utils/empty-channel-content';
import { isDemoIntegration } from './utils/helpers';

type IntegrationsListVariant = 'default' | 'connectSheet';

const INBOX_POLL_INTERVAL_MS = 5000;

type IntegrationsListProps = {
  onItemClick: (item: TableIntegration) => void;
  excludeIntegrationIds?: string[];
  variant?: IntegrationsListVariant;
  /** Case-insensitive match on the integration name or provider name. */
  searchQuery?: string;
  /** Only these channels; omit for every channel. */
  channels?: readonly ChannelTypeEnum[];
  /** Show the getting-started cards while the environment has no real integrations in these channels. */
  showZeroState?: boolean;
};

function IntegrationCardSkeleton() {
  return (
    <div className="bg-card shadow-xs group relative flex min-h-[125px] cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border border-neutral-100 p-3 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative h-6 w-6">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-[16px] w-16 rounded-sm" />
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Skeleton className="h-[26px] w-24" />
        <Skeleton className="h-[26px] w-24" />
      </div>
    </div>
  );
}

function ConnectSheetTileSkeleton() {
  return (
    <div className="flex min-w-0 flex-1 basis-[calc(50%-0.5rem)] flex-col gap-1.5">
      <Skeleton className="border-stroke-soft h-20 w-full rounded-lg border" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function IntegrationChannelGroupSkeleton({ variant }: { variant?: IntegrationsListVariant }) {
  if (variant === 'connectSheet') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded" />
        <div className="flex flex-wrap gap-4 p-1.5">
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
          <ConnectSheetTileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
        <IntegrationCardSkeleton />
      </div>
    </div>
  );
}

/** A store provider that matches the search and that the environment doesn't have yet. */
function isAddableProvider(
  provider: IProviderConfig,
  {
    query,
    installedProviderIds,
    isToolChannelEnabled,
    channelFilter,
  }: {
    query: string;
    installedProviderIds: Set<string>;
    isToolChannelEnabled: boolean;
    channelFilter?: readonly ChannelTypeEnum[];
  }
) {
  return (
    !NOVU_PROVIDERS.includes(provider.id) &&
    !isAgentInboxProvider(provider.id) &&
    !installedProviderIds.has(provider.id) &&
    isChannelVisibleInUi(provider.channel, isToolChannelEnabled) &&
    (!channelFilter || channelFilter.includes(provider.channel)) &&
    [provider.displayName, provider.id].some((field) => field.toLowerCase().includes(query))
  );
}

/** Adds the integration to its channel's group; integrations without a channel (e.g. agent runtimes) are skipped. */
function addToChannelGroup(groups: Record<ChannelTypeEnum, IIntegration[]>, integration: IIntegration) {
  const { channel } = integration;
  if (!channel) return groups;

  groups[channel] = [...(groups[channel] ?? []), integration];

  return groups;
}

/** Case-insensitive match on the integration's name, identifier or provider name; an empty query matches all. */
function integrationMatchesSearch(integration: IIntegration, query: string, providers: IProviderConfig[]) {
  if (!query) return true;

  const providerName = providers.find((provider) => provider.id === integration.providerId)?.displayName ?? '';

  return [integration.name, providerName, integration.identifier].some((field) => field?.toLowerCase().includes(query));
}

/** Store channels in a fixed order; with no search, channels with nothing connected stay for their empty state. */
function getStoreChannels({
  groupedIntegrations,
  hasActiveFilter,
  isToolChannelEnabled,
  channelFilter,
}: {
  groupedIntegrations?: Partial<Record<ChannelTypeEnum, IIntegration[]>>;
  hasActiveFilter: boolean;
  isToolChannelEnabled: boolean;
  channelFilter?: readonly ChannelTypeEnum[];
}) {
  return (Object.keys(EMPTY_CHANNEL_CONTENT) as ChannelTypeEnum[]).filter(
    (channel) =>
      !!groupedIntegrations?.[channel]?.length ||
      (!hasActiveFilter &&
        isChannelVisibleInUi(channel, isToolChannelEnabled) &&
        (!channelFilter || channelFilter.includes(channel)))
  );
}

/** Demo providers and an Inbox that isn't set up yet don't count as real integrations. */
function isRealIntegration(
  integration: IIntegration,
  environmentId: string | undefined,
  channelFilter?: readonly ChannelTypeEnum[]
) {
  return (
    integration._environmentId === environmentId &&
    !isAgentInboxProvider(integration.providerId) &&
    !!integration.channel &&
    (!channelFilter || channelFilter.includes(integration.channel)) &&
    !isDemoIntegration(integration.providerId) &&
    !(integration.channel === ChannelTypeEnum.IN_APP && !integration.connected)
  );
}

/**
 * The environment's saved Inbox HMAC setting. Members who can't read credentials get them empty, so it is unknown
 * (undefined) to them.
 */
function getInboxHmacSetting(integrations: IIntegration[] | undefined, environmentId: string | undefined) {
  const inbox = integrations?.find(
    (integration) =>
      integration._environmentId === environmentId &&
      integration.channel === ChannelTypeEnum.IN_APP &&
      !isAgentInboxProvider(integration.providerId)
  );
  const hmac = inbox?.credentials?.hmac;

  return typeof hmac === 'boolean' ? hmac : undefined;
}

export function IntegrationsList({
  onItemClick,
  excludeIntegrationIds,
  variant = 'default',
  searchQuery = '',
  channels: channelFilter,
  showZeroState = false,
}: IntegrationsListProps) {
  const { currentEnvironment, environments } = useEnvironment();
  const [isWaitingForInbox, setIsWaitingForInbox] = useState(false);
  // While the getting-started cards wait for the Inbox, poll so they notice it connect.
  const { integrations, isLoading } = useFetchIntegrations({
    refetchInterval: isWaitingForInbox ? INBOX_POLL_INTERVAL_MS : undefined,
  });
  const environmentId = currentEnvironment?._id;

  const hasRealIntegration = useMemo(
    () => (integrations ?? []).some((integration) => isRealIntegration(integration, environmentId, channelFilter)),
    [integrations, environmentId, channelFilter]
  );
  const isInboxConnected = (integrations ?? []).some(
    (integration) =>
      integration._environmentId === environmentId &&
      integration.channel === ChannelTypeEnum.IN_APP &&
      !isAgentInboxProvider(integration.providerId) &&
      !!integration.connected
  );
  const isInboxHmacEnabled = getInboxHmacSetting(integrations, environmentId);

  // Whether this visit opened with no real integrations is decided once per environment, so the cards stay
  // (and flip to "Inbox connected") when the user connects something here; a reload shows the regular store.
  const [decision, setDecision] = useState<{ environmentId: string; openedInZeroState: boolean } | null>(null);
  const isDecided = !!environmentId && decision?.environmentId === environmentId;
  const openedInZeroState = isDecided && decision ? decision.openedInZeroState : !hasRealIntegration;

  useEffect(() => {
    if (!showZeroState || isLoading || !integrations || !environmentId || isDecided) return;
    setDecision({ environmentId, openedInZeroState: !hasRealIntegration });
  }, [showZeroState, isLoading, integrations, environmentId, isDecided, hasRealIntegration]);

  useEffect(() => {
    setIsWaitingForInbox(showZeroState && isDecided && openedInZeroState && !isInboxConnected);
  }, [showZeroState, isDecided, openedInZeroState, isInboxConnected]);
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);
  const availableIntegrations = novuProviders;

  const groupedIntegrations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = (integration: IIntegration) =>
      integrationMatchesSearch(integration, query, availableIntegrations);

    return (
      integrations
        ?.filter((i) => !isAgentInboxProvider(i.providerId))
        .filter((i) => isChannelVisibleInUi(i.channel, isToolChannelEnabled))
        .filter((i) => !channelFilter || (!!i.channel && channelFilter.includes(i.channel)))
        // The store shows the environment picked in the sidebar; the connect sheet keeps every environment.
        .filter((i) => variant !== 'default' || i._environmentId === currentEnvironment?._id)
        .filter(matchesSearch)
        // In the store, the primary leads its channel.
        .sort((a, b) => (variant === 'default' ? Number(!!b.primary) - Number(!!a.primary) : 0))
        .reduce(addToChannelGroup, {} as Record<ChannelTypeEnum, IIntegration[]>)
    );
  }, [
    integrations,
    isToolChannelEnabled,
    searchQuery,
    availableIntegrations,
    variant,
    currentEnvironment?._id,
    channelFilter,
  ]);

  // With a search, store providers this environment doesn't have yet are listed so they can be added.
  const addableProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (variant !== 'default' || !query) return [];

    const installedProviderIds = new Set(
      (integrations ?? [])
        .filter((integration) => integration._environmentId === currentEnvironment?._id)
        .map((integration) => integration.providerId)
    );

    return availableIntegrations.filter((provider) =>
      isAddableProvider(provider, { query, installedProviderIds, isToolChannelEnabled, channelFilter })
    );
  }, [
    searchQuery,
    variant,
    integrations,
    currentEnvironment?._id,
    availableIntegrations,
    isToolChannelEnabled,
    channelFilter,
  ]);

  if (isLoading || !currentEnvironment) {
    return (
      <div className={variant === 'connectSheet' ? 'space-y-4' : 'space-y-6'}>
        <IntegrationChannelGroupSkeleton variant={variant} />
        {variant === 'default' ? <IntegrationChannelGroupSkeleton variant={variant} /> : null}
      </div>
    );
  }

  const hasActiveFilter = !!searchQuery.trim();

  // With no real integrations, the getting-started cards lead the page; the demo and unfinished
  // integrations still list below them, without per-channel empty states (the cards cover those).
  const isZeroState = variant === 'default' && showZeroState && !hasActiveFilter && openedInZeroState;
  // The store lists channels in a fixed order; with no search, a channel with nothing connected shows its
  // empty state. The connect sheet keeps the order integrations arrive in and skips empty channels.
  const channels =
    variant === 'default'
      ? getStoreChannels({ groupedIntegrations, hasActiveFilter, isToolChannelEnabled, channelFilter })
      : (Object.keys(groupedIntegrations || {}) as ChannelTypeEnum[]);

  const hasNoMatch =
    hasActiveFilter && Object.keys(groupedIntegrations || {}).length === 0 && addableProviders.length === 0;

  if (hasNoMatch) return <NoSearchMatch variant={variant} query={searchQuery.trim()} />;

  return (
    <div className={variant === 'connectSheet' ? 'space-y-4' : 'space-y-6'}>
      {isZeroState && (
        <IntegrationStoreZeroState isInboxConnected={isInboxConnected} isInboxHmacEnabled={isInboxHmacEnabled} />
      )}
      {channels.map((channel) => {
        const channelIntegrations = groupedIntegrations?.[channel] ?? [];

        if (channelIntegrations.length === 0) {
          return isZeroState ? null : <IntegrationEmptyChannel key={channel} channel={channel} />;
        }

        return (
          <IntegrationChannelGroup
            key={channel}
            channel={channel}
            integrations={channelIntegrations}
            providers={availableIntegrations}
            environments={environments}
            onItemClick={onItemClick}
            excludeIntegrationIds={excludeIntegrationIds}
            variant={variant}
          />
        );
      })}
      <AvailableToAddSection providers={addableProviders} />
    </div>
  );
}

/** A search that matches nothing installed and nothing in the store. */
function NoSearchMatch({ variant, query }: { variant: IntegrationsListVariant; query: string }) {
  if (variant === 'default') return <IntegrationSearchEmptyState query={query} />;

  return (
    <div className="text-text-soft text-paragraph-sm flex min-h-[200px] items-center justify-center text-center">
      No integrations match your filters.
    </div>
  );
}

/** Store providers found by search that the environment doesn't have yet. */
function AvailableToAddSection({ providers }: { providers: IProviderConfig[] }) {
  if (providers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex h-7 items-center gap-2">
        <h2 className="text-label-sm text-text-strong">Available to add</h2>
        <span className="text-paragraph-sm text-text-soft">{providers.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {providers.map((provider) => (
          <IntegrationStoreAddCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}
