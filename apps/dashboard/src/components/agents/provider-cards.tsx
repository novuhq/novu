import {
  ChatProviderIdEnum,
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  EmailProviderIdEnum,
  type IIntegration,
  providers as novuProviders,
} from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiLoader4Line,
  RiLockStarLine,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED, IS_SELF_HOSTED_CE, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildEdgeFadeMask, useHorizontalScrollEdges } from '@/hooks/use-horizontal-scroll-edges';
import { useIsAgentEmailAvailable } from '@/hooks/use-is-agent-email-available';
import { useLinkAgentIntegration } from '@/hooks/use-link-agent-integration';
import { getAgentChannelDisplayName, getAgentChannelIconFileName } from '@/utils/agent-channel-provider-display';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { openInNewTab } from '@/utils/url';
import { hasAgentInboundConnection } from './is-agent-integration-connected';
import { type ProviderSwitcherStatus, resolveProviderCardDisplayState } from './provider-card-display-state';

/**
 * Estimated time to complete the setup for each provider, displayed as a hint
 * on the card. Keep in sync with provider docs / setup guides.
 */
const PROVIDER_SETUP_TIME: Record<string, string> = {
  [EmailProviderIdEnum.NovuAgent]: '~ 30 seconds',
  [ChatProviderIdEnum.Slack]: '~ 1 minute',
  [ChatProviderIdEnum.MsTeams]: '~ 1 hour',
  [ChatProviderIdEnum.WhatsAppBusiness]: '~ 1 hour',
  [ChatProviderIdEnum.Telegram]: '~ 2 min',
  [ChatProviderIdEnum.Sendblue]: '~ 2 minutes',
  [ChatProviderIdEnum.Discord]: '~ 2 minutes',
  'google-chat': '~ 2 minutes',
  linear: '~ 2 minutes',
  zoom: '~ 2 minutes',
};

function getProviderCardDisplayName(providerId: string, displayName: string): string {
  return getAgentChannelDisplayName(providerId, displayName);
}

const CARD_PROVIDER_ICON_CLASS = 'size-6 shrink-0 object-contain';

function CardProviderIcon({ providerId, displayName }: { providerId: string; displayName: string }) {
  return (
    <ProviderIcon
      providerId={providerId}
      providerDisplayName={displayName}
      iconFileName={getAgentChannelIconFileName(providerId)}
      className={CARD_PROVIDER_ICON_CLASS}
    />
  );
}

function getSetupTimeLabel(providerId: string): string {
  return PROVIDER_SETUP_TIME[providerId] ?? '~ 5 minutes';
}

type ProviderCardItem = {
  providerId: string;
  displayName: string;
  comingSoon: boolean;
  requiresBusinessTier: boolean;
  integrations: IIntegration[];
};

function buildCardItems(
  conversationalProviders: readonly ConversationalProvider[],
  integrations: IIntegration[] | undefined
): ProviderCardItem[] {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const integration of integrations ?? []) {
    const list = integrationsByProvider.get(integration.providerId) ?? [];
    list.push(integration);
    integrationsByProvider.set(integration.providerId, list);
  }

  return conversationalProviders.map((cp) => {
    const providerConfig = novuProviders.find((p) => p.id === cp.providerId);
    const displayName = providerConfig?.displayName || cp.displayName;

    const existing = cp.comingSoon ? [] : (integrationsByProvider.get(cp.providerId) ?? []);

    return {
      providerId: cp.providerId,
      displayName: getProviderCardDisplayName(cp.providerId, displayName),
      comingSoon: Boolean(cp.comingSoon),
      requiresBusinessTier: Boolean(cp.requiresBusinessTier),
      // NovuAgent is 1:1 per agent — never surface existing integrations from other agents.
      integrations: cp.providerId === EmailProviderIdEnum.NovuAgent ? [] : existing,
    };
  });
}

type ProviderCardsProps = {
  agentIdentifier: string;
  agentName?: string;
  /** When set, the matching card is highlighted as selected. */
  selectedIntegrationId?: string;
  /**
   * Full list of agent-integration links currently attached to this agent. Used to:
   *  1. Skip the link API call when the user re-selects an already-linked integration.
   *  2. Unlink the previously selected integration when the user picks a different one
   *     (single-select picker behaviour). Integrations created during this session are deleted;
   *     pre-existing integrations are only unlinked.
   */
  existingLinks?: AgentIntegrationLink[];
  onSelect: (providerId: string, integration?: IIntegration) => void;
  /**
   * When true, the cards render as a compact, persistent "switcher" rail instead of the full grid.
   * Every connectable/linked channel stays visible with its own status chip, the active channel is
   * highlighted, and clicking a different channel switches its setup guide in one click. Used on the
   * agent details page once a channel has been picked and its guide is showing below.
   */
  showChannelSwitcherRail?: boolean;
  /**
   * Renders the cards as a non-interactive, dimmed preview — every card button and the scroll
   * arrows are disabled. Used in the onboarding connect phase to show the channel step before the
   * agent exists, then flips back on once the agent is created.
   */
  disabled?: boolean;
  dimmed?: boolean;
};

function LockedBadge() {
  return (
    <div className="flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5">
      <RiLockStarLine className="size-2.5 text-pink-600" />
      <span
        className="text-[9px] font-semibold uppercase leading-none"
        style={{
          background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Team+
      </span>
    </div>
  );
}

function ProviderPill({
  loading,
  comingSoon,
  locked,
  connected,
  connecting,
  inSetup,
}: {
  loading: boolean;
  comingSoon: boolean;
  locked: boolean;
  connected: boolean;
  connecting: boolean;
  inSetup: boolean;
}) {
  let label: string;
  if (comingSoon) {
    label = 'Coming soon';
  } else if (locked) {
    label = 'Upgrade';
  } else if (connected) {
    label = 'Connected';
  } else if (inSetup) {
    label = 'In setup';
  } else if (connecting) {
    label = 'Connecting...';
  } else {
    label = 'Connect';
  }

  return (
    <div
      className={cn(
        'cursor-pointer flex w-full items-center justify-center rounded-[4px] p-1 text-text-sub',
        'shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea]',
        comingSoon && 'opacity-60'
      )}
      style={{
        backgroundImage:
          'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
      }}
    >
      <span className="px-1 text-label-xs font-medium leading-4">{label}</span>
      {loading ? (
        <RiLoader4Line className="size-4 shrink-0 animate-spin text-text-soft" aria-hidden />
      ) : (
        <RiArrowRightSLine className="size-4 shrink-0 text-text-soft" aria-hidden />
      )}
    </div>
  );
}

function SelectedStatusBadge() {
  return <RiCheckboxCircleFill className="text-success-base size-4 shrink-0" aria-hidden />;
}

function InSetupBadge() {
  return <span className="bg-warning-base size-2 shrink-0 rounded-full" aria-hidden />;
}

function ScrollEdgeButton({
  direction,
  visible,
  onClick,
}: {
  direction: 'left' | 'right';
  visible: boolean;
  onClick: () => void;
}) {
  // Avoid the aria-hidden focus warning by unmounting the button entirely when it would be
  // visually hidden. A click on the button is the typical trigger for visibility flipping, so
  // keeping the element around with `aria-hidden` traps focus on a hidden control.
  if (!visible) return null;

  const isRight = direction === 'right';
  const Icon = isRight ? RiArrowRightSLine : RiArrowLeftSLine;
  const label = isRight ? 'Scroll right to see more channels' : 'Scroll left to see more channels';

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'cursor-pointer pointer-events-auto absolute bottom-1 top-px z-10 flex w-4 items-center justify-center rounded-[4px]',
        'bg-bg-white bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.02)_100%)] text-text-sub',
        'shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea] transition-colors hover:text-text-strong',
        isRight ? '-right-1' : '-left-1'
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function TopRightIndicator({
  isLocked,
  showCheck,
  showInSetup,
  comingSoon,
  setupTime,
}: {
  isLocked: boolean;
  showCheck: boolean;
  showInSetup: boolean;
  comingSoon: boolean;
  setupTime: string;
}) {
  if (isLocked) return <LockedBadge />;
  if (showCheck) return <SelectedStatusBadge />;
  if (showInSetup) return <InSetupBadge />;

  return (
    <span className="text-text-soft shrink-0 whitespace-nowrap text-[10px] font-medium leading-[14px]">
      {comingSoon ? 'Soon' : setupTime}
    </span>
  );
}

function ProviderCard({
  item,
  isSelected,
  isConnected,
  isLoading,
  isAgentEmailAvailable,
  disabled,
  switcherStatus,
  onClick,
}: {
  item: ProviderCardItem;
  isSelected: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isAgentEmailAvailable: boolean;
  disabled?: boolean;
  /**
   * Set only when this card is rendered inside the persistent switcher rail (after a channel has
   * been picked). It enriches the shared card design with an explicit per-channel status ("In setup"
   * for a linked-but-not-yet-connected channel) plus an active border on the selected channel. Left
   * undefined in the pre-pick grid, where the original connect/connecting/connected state is used.
   */
  switcherStatus?: ProviderSwitcherStatus;
  onClick: () => void;
}) {
  const { effectiveConnected, showCheck, showConnecting, showInSetup, showActiveBorder, isActive } =
    resolveProviderCardDisplayState({
      isConnected,
      isSelected,
      switcherStatus,
    });

  const isLocked = item.requiresBusinessTier && !isAgentEmailAvailable && !effectiveConnected;
  const setupTime = getSetupTimeLabel(item.providerId);
  const isInteractionDisabled = item.comingSoon || disabled;

  const card = (
    <button
      type="button"
      onClick={onClick}
      disabled={isInteractionDisabled}
      aria-disabled={isInteractionDisabled || undefined}
      aria-pressed={isActive || undefined}
      aria-current={showActiveBorder || undefined}
      className={cn(
        'group relative flex min-w-[175px] flex-1 shrink-0 items-start overflow-hidden rounded-[8px] border bg-bg-white p-2 text-left shadow-xs transition-colors',
        showActiveBorder ? 'border-stroke-strong' : 'border-stroke-weak hover:border-stroke-soft',
        item.comingSoon && 'cursor-not-allowed opacity-60',
        disabled && 'cursor-default',
        !isLocked && !disabled && 'cursor-pointer!'
      )}
    >
      <div className="flex min-w-px flex-1 flex-col gap-2">
        <div className="flex w-full items-start justify-between">
          <div className="flex size-6 shrink-0 items-center justify-center">
            <CardProviderIcon providerId={item.providerId} displayName={item.displayName} />
          </div>
          <TopRightIndicator
            isLocked={isLocked}
            showCheck={showCheck}
            showInSetup={showInSetup}
            comingSoon={item.comingSoon}
            setupTime={setupTime}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <span className="text-label-xs text-text-sub font-medium leading-4">{item.displayName}</span>
        </div>

        <ProviderPill
          loading={isLoading}
          comingSoon={item.comingSoon}
          locked={isLocked}
          connected={effectiveConnected}
          connecting={showConnecting}
          inSetup={showInSetup}
        />
      </div>
    </button>
  );

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          variant="light"
          size="lg"
          className="flex w-64 flex-col items-start gap-3 border border-neutral-100 p-2 shadow-md"
        >
          <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1">
            <RiLockStarLine className="h-3 w-3 text-pink-600" />
            <span
              className="text-[10px] font-medium uppercase leading-normal"
              style={{
                background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Team feature
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Agent email requires the Team plan. Upgrade to connect an inbound email address.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}

/**
 * Shared horizontal scroller shell for the channel cards: edge-fade mask, scroll-affordance buttons,
 * and the no-scrollbar flex row. Both the pre-pick grid and the switcher rail render their item maps
 * inside it so the scroll/mask behavior lives in exactly one place.
 */
function CardScroller({
  dimmed,
  showScrollControls = true,
  footer,
  children,
}: {
  dimmed?: boolean;
  showScrollControls?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { ref: scrollRef, canScrollLeft, canScrollRight, scrollBy } = useHorizontalScrollEdges<HTMLDivElement>();
  const maskImage = buildEdgeFadeMask(canScrollLeft, canScrollRight);

  return (
    <div className={cn('relative w-full', dimmed && 'opacity-30')}>
      {showScrollControls && (
        <>
          <ScrollEdgeButton direction="left" visible={canScrollLeft} onClick={() => scrollBy('left')} />
          <ScrollEdgeButton direction="right" visible={canScrollRight} onClick={() => scrollBy('right')} />
        </>
      )}
      <div
        ref={scrollRef}
        className="nv-no-scrollbar -mx-1 flex items-stretch gap-2.5 overflow-x-auto px-1 pb-1 pt-px"
        style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

export function ProviderCards({
  agentIdentifier,
  agentName,
  selectedIntegrationId,
  existingLinks,
  onSelect,
  showChannelSwitcherRail,
  disabled,
  dimmed,
}: ProviderCardsProps) {
  const { integrations } = useFetchIntegrations();
  const isAgentEmailAvailable = useIsAgentEmailAvailable();
  const navigate = useNavigate();

  // Email (NovuAgent) renders like every other connectable channel card; its integration + link
  // are only provisioned when the user clicks Connect.
  const items = useMemo(() => {
    const built = buildCardItems(CONVERSATIONAL_PROVIDERS, integrations).filter(
      // Agent email is Enterprise/Cloud-only — never surface the card on Community.
      (item) => !(IS_SELF_HOSTED_CE && item.providerId === EmailProviderIdEnum.NovuAgent)
    );

    return [...built].sort((left, right) => {
      if (left.providerId === EmailProviderIdEnum.NovuAgent) return -1;
      if (right.providerId === EmailProviderIdEnum.NovuAgent) return 1;

      return 0;
    });
  }, [integrations]);

  const linkedIntegrationIds = useMemo(
    () => new Set(existingLinks?.map((link) => link.integration._id) ?? []),
    [existingLinks]
  );

  const connectedProviderIds = useMemo(() => {
    const ids = new Set<string>();

    for (const link of existingLinks ?? []) {
      if (hasAgentInboundConnection(link.connectedAt)) {
        ids.add(link.integration.providerId);
      }
    }

    return ids;
  }, [existingLinks]);

  const { pendingItemKey, isBusy, linkProvider } = useLinkAgentIntegration({
    agentIdentifier,
    linkedIntegrationIds,
    existingLinks,
    replaceExisting: true,
    onLinked: onSelect,
  });

  const selectedProviderId = useMemo(() => {
    if (!selectedIntegrationId) return undefined;

    const found = integrations?.find((i) => i._id === selectedIntegrationId);

    return found?.providerId;
  }, [integrations, selectedIntegrationId]);

  // Per-provider status for the switcher rail, built in one pass over existingLinks. A provider is
  // "connected" only once a real inbound message has landed (`connectedAt`); otherwise "in-setup"
  // while a link exists. Providers with no link are "connectable" (absent from the map). Every
  // provider's link — including Novu email — is only created when the user clicks "Connect", so
  // link existence uniformly signals engagement.
  const switcherStatusByProvider = useMemo(() => {
    const statuses = new Map<string, ProviderSwitcherStatus>();

    for (const link of existingLinks ?? []) {
      const providerId = link.integration.providerId;

      if (statuses.get(providerId) === 'connected') {
        continue;
      }

      statuses.set(providerId, hasAgentInboundConnection(link.connectedAt) ? 'connected' : 'in-setup');
    }

    return statuses;
  }, [existingLinks]);

  // The switcher rail keeps every connectable/linked channel visible; coming-soon channels are
  // dropped so the compact rail stays tight (they still appear in the full grid before a pick).
  const switcherItems = useMemo(() => items.filter((item) => !item.comingSoon), [items]);

  const handleUpgradeClick = () => {
    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=agent_email_integration`);

      return;
    }

    void navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=agent_provider_cards`);
  };

  const handleCreateAndLink = (item: ProviderCardItem) => {
    void linkProvider(
      {
        providerId: item.providerId,
        displayName: item.displayName,
        newIntegrationName: agentName ?? agentIdentifier,
      },
      `${item.providerId}-new`
    );
  };

  // Re-select a channel that is already linked to the agent (connected or still in setup) without
  // re-creating it, so switching between channels never destroys in-progress setup. Returns false
  // when the provider has no existing link yet (caller then falls back to create + link).
  const selectExistingLink = (item: ProviderCardItem): boolean => {
    const existingLink = existingLinks?.find((link) => link.integration.providerId === item.providerId);

    if (!existingLink) {
      return false;
    }

    const integration =
      integrations?.find((i) => i._id === existingLink.integration._id) ??
      (existingLink.integration as unknown as IIntegration);
    onSelect(item.providerId, integration);

    return true;
  };

  // Shared activation for both the full grid and the switcher rail: re-select an already-linked
  // channel in place, then provision on first Connect via the link hook (Novu email routes by
  // providerId inside the hook; chat providers go through create-integration-then-link).
  const activateProvider = (item: ProviderCardItem) => {
    if (isBusy) return;

    if (selectExistingLink(item)) {
      return;
    }

    handleCreateAndLink(item);
  };

  if (showChannelSwitcherRail) {
    return (
      <CardScroller
        dimmed={dimmed}
        footer={
          <p className="text-text-soft mt-2 px-1 text-label-xs leading-4">Set up multiple channels: switch anytime.</p>
        }
      >
        {switcherItems.map((item) => {
          const status = switcherStatusByProvider.get(item.providerId) ?? 'connectable';
          const isSelected = item.providerId === selectedProviderId;
          const isConnected = status === 'connected';
          const isLocked = item.requiresBusinessTier && !isAgentEmailAvailable && !isConnected;
          const isLoadingThis = pendingItemKey?.startsWith(`${item.providerId}-`) ?? false;

          return (
            <ProviderCard
              key={item.providerId}
              item={item}
              isSelected={isSelected}
              isConnected={isConnected}
              isLoading={isLoadingThis}
              isAgentEmailAvailable={isAgentEmailAvailable}
              switcherStatus={status}
              onClick={() => {
                if (isLocked) {
                  handleUpgradeClick();

                  return;
                }

                if (isSelected) return;

                activateProvider(item);
              }}
            />
          );
        })}
      </CardScroller>
    );
  }

  return (
    <CardScroller dimmed={dimmed} showScrollControls={!disabled}>
      {items.map((item) => {
        const isSelected = item.providerId === selectedProviderId;
        const isConnected = connectedProviderIds.has(item.providerId);
        const isLocked = item.requiresBusinessTier && !isAgentEmailAvailable;
        const isLoadingThis = pendingItemKey?.startsWith(`${item.providerId}-`) ?? false;

        if (item.comingSoon) {
          return (
            <ProviderCard
              key={item.providerId}
              item={item}
              isSelected={false}
              isConnected={false}
              isLoading={false}
              isAgentEmailAvailable={isAgentEmailAvailable}
              disabled={disabled}
              onClick={() => {}}
            />
          );
        }

        if (isLocked) {
          return (
            <ProviderCard
              key={item.providerId}
              item={item}
              isSelected={isSelected}
              isConnected={isConnected}
              isLoading={isLoadingThis}
              isAgentEmailAvailable={isAgentEmailAvailable}
              disabled={disabled}
              onClick={handleUpgradeClick}
            />
          );
        }

        return (
          <ProviderCard
            key={item.providerId}
            item={item}
            isSelected={isSelected}
            isConnected={isConnected}
            isLoading={isLoadingThis}
            isAgentEmailAvailable={isAgentEmailAvailable}
            disabled={disabled}
            onClick={() => {
              if (disabled) return;

              if (isSelected) return;

              activateProvider(item);
            }}
          />
        );
      })}
    </CardScroller>
  );
}
