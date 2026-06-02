import {
  ChatProviderIdEnum,
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  EmailProviderIdEnum,
  type IIntegration,
  providers as novuProviders,
} from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useIsAgentEmailAvailable } from '@/hooks/use-is-agent-email-available';
import { useLinkAgentIntegration } from '@/hooks/use-link-agent-integration';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { openInNewTab } from '@/utils/url';
import { isAgentIntegrationConnected } from './is-agent-integration-connected';

/**
 * Estimated time to complete the setup for each provider, displayed as a hint
 * on the card. Keep in sync with provider docs / setup guides.
 */
const PROVIDER_SETUP_TIME: Record<string, string> = {
  [ChatProviderIdEnum.Slack]: '~ 1 min',
  [ChatProviderIdEnum.MsTeams]: '~ 1 hour',
  [ChatProviderIdEnum.WhatsAppBusiness]: '~ 10 min',
  [ChatProviderIdEnum.Telegram]: '~ 2 min',
  [ChatProviderIdEnum.Discord]: '~ 2 minutes',
  'google-chat': '~ 2 minutes',
  linear: '~ 2 minutes',
  zoom: '~ 2 minutes',
  imessages: '~ 2 minutes',
};

function getSetupTimeLabel(providerId: string): string {
  return PROVIDER_SETUP_TIME[providerId] ?? '~ 5 minutes';
}

const FADE_WIDTH_PX = 32;

/**
 * Builds a horizontal mask gradient that fades out the edges with overflowing content.
 * `none` is returned when neither edge has overflow, so the cards stay fully opaque.
 */
function buildEdgeFadeMask(canScrollLeft: boolean, canScrollRight: boolean): string | undefined {
  if (!canScrollLeft && !canScrollRight) return undefined;

  const leftStop = canScrollLeft ? `transparent 0, black ${FADE_WIDTH_PX}px` : 'black 0';
  const rightStop = canScrollRight ? `black calc(100% - ${FADE_WIDTH_PX}px), transparent 100%` : 'black 100%';

  return `linear-gradient(to right, ${leftStop}, ${rightStop})`;
}

function useHorizontalScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [edges, setEdges] = useState({ canScrollLeft: false, canScrollRight: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      // Allow a 1px tolerance for sub-pixel rounding.
      const canScrollLeft = node.scrollLeft > 1;
      const canScrollRight = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;

      setEdges((prev) =>
        prev.canScrollLeft === canScrollLeft && prev.canScrollRight === canScrollRight
          ? prev
          : { canScrollLeft, canScrollRight }
      );
    };

    update();
    node.addEventListener('scroll', update, { passive: true });

    // Observe both the container and its children so we react to viewport resizes,
    // children being added/removed, and individual child size changes.
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(node);

    const observeChildren = () => {
      for (const child of Array.from(node.children)) {
        resizeObserver.observe(child);
      }
    };

    observeChildren();

    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      update();
    });
    mutationObserver.observe(node, { childList: true });

    return () => {
      node.removeEventListener('scroll', update);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const node = ref.current;
    if (!node) return;

    // Scroll by ~80% of the visible width so the next batch of cards becomes the focus
    // while keeping one card of context visible from the previous view.
    const delta = Math.max(node.clientWidth * 0.8, 160);
    node.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' });
  }, []);

  return { ref, ...edges, scrollBy };
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
      displayName,
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

function ConnectPill({ loading, comingSoon, locked }: { loading: boolean; comingSoon: boolean; locked: boolean }) {
  let label: string;
  if (comingSoon) {
    label = 'Coming soon';
  } else if (locked) {
    label = 'Upgrade';
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

function SelectedPill({ loading, connected }: { loading: boolean; connected: boolean }) {
  const label = connected ? 'Connected' : 'Connecting...';

  return (
    <div className="bg-bg-weak flex w-full items-center justify-center gap-1 rounded-[4px] p-1">
      <span className="px-1 text-label-xs text-text-soft font-medium leading-4">{label}</span>
      {loading ? <RiLoader4Line className="text-text-soft size-4 shrink-0 animate-spin" aria-hidden /> : null}
    </div>
  );
}

function SelectedStatusBadge() {
  return <RiCheckboxCircleFill className="text-success-base size-4 shrink-0" aria-hidden />;
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
  isSelected,
  comingSoon,
  setupTime,
}: {
  isLocked: boolean;
  isSelected: boolean;
  comingSoon: boolean;
  setupTime: string;
}) {
  if (isLocked) return <LockedBadge />;
  if (isSelected) return <SelectedStatusBadge />;

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
  onClick,
}: {
  item: ProviderCardItem;
  isSelected: boolean;
  isConnected: boolean;
  isLoading: boolean;
  isAgentEmailAvailable: boolean;
  onClick: () => void;
}) {
  const isLocked = item.requiresBusinessTier && !isAgentEmailAvailable;
  const setupTime = getSetupTimeLabel(item.providerId);

  const card = (
    <button
      type="button"
      onClick={onClick}
      disabled={item.comingSoon}
      aria-disabled={item.comingSoon || undefined}
      aria-pressed={isSelected || undefined}
      className={cn(
        'group relative flex min-w-[175px] flex-1 shrink-0 items-start overflow-hidden rounded-[8px] border bg-bg-white p-2 text-left shadow-xs',
        'transition-colors border-stroke-weak hover:border-stroke-soft',
        item.comingSoon && 'cursor-not-allowed opacity-60',
        isLocked && 'cursor-pointer!'
      )}
    >
      <div className="flex min-w-px flex-1 flex-col gap-2">
        <div className="flex w-full items-start justify-between">
          <div className="flex shrink-0 items-center rounded p-0.5">
            <ProviderIcon
              providerId={item.providerId}
              providerDisplayName={item.displayName}
              className="size-6 shrink-0"
            />
          </div>
          <TopRightIndicator
            isLocked={isLocked}
            isSelected={isSelected}
            comingSoon={item.comingSoon}
            setupTime={setupTime}
          />
        </div>

        <div className="flex w-full flex-col items-start">
          <span className="text-label-xs text-text-sub font-medium leading-4">{item.displayName}</span>
        </div>

        {isSelected ? (
          <SelectedPill loading={isLoading} connected={isConnected} />
        ) : (
          <ConnectPill loading={isLoading} comingSoon={item.comingSoon} locked={isLocked} />
        )}
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

export function ProviderCards({
  agentIdentifier,
  agentName,
  selectedIntegrationId,
  existingLinks,
  onSelect,
}: ProviderCardsProps) {
  const { integrations } = useFetchIntegrations();
  const isAgentEmailAvailable = useIsAgentEmailAvailable();
  const navigate = useNavigate();

  const conversationalProviders = useMemo(() => {
    if (IS_SELF_HOSTED) {
      return CONVERSATIONAL_PROVIDERS;
    }

    return CONVERSATIONAL_PROVIDERS.filter((cp) => cp.providerId !== EmailProviderIdEnum.NovuAgent);
  }, []);

  const items = useMemo(
    () => buildCardItems(conversationalProviders, integrations),
    [conversationalProviders, integrations]
  );

  const linkedIntegrationIds = useMemo(
    () => new Set(existingLinks?.map((link) => link.integration._id) ?? []),
    [existingLinks]
  );

  const connectedProviderIds = useMemo(() => {
    const ids = new Set<string>();

    for (const link of existingLinks ?? []) {
      if (isAgentIntegrationConnected(link)) {
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

  const handleUpgradeClick = () => {
    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=agent_email_integration`);

      return;
    }

    navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=agent_provider_cards`);
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

  const handleNovuAgentLink = (item: ProviderCardItem) => {
    void linkProvider(
      {
        providerId: item.providerId,
        displayName: item.displayName,
      },
      `${item.providerId}-novu-agent`
    );
  };

  const { ref: scrollRef, canScrollLeft, canScrollRight, scrollBy } = useHorizontalScrollEdges<HTMLDivElement>();
  const maskImage = buildEdgeFadeMask(canScrollLeft, canScrollRight);

  return (
    <div className="relative w-full">
      <ScrollEdgeButton direction="left" visible={canScrollLeft} onClick={() => scrollBy('left')} />
      <ScrollEdgeButton direction="right" visible={canScrollRight} onClick={() => scrollBy('right')} />
      <div
        ref={scrollRef}
        className="nv-no-scrollbar -mx-1 flex items-stretch gap-2.5 overflow-x-auto px-1 pb-1 pt-px"
        style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
      >
        {items.map((item) => {
          const isSelected = item.providerId === selectedProviderId;
          const isConnected = connectedProviderIds.has(item.providerId);
          const isLocked = item.requiresBusinessTier && !isAgentEmailAvailable;
          const isNovuAgent = item.providerId === EmailProviderIdEnum.NovuAgent;

          const itemKeyPrefix = `${item.providerId}-`;
          const isLoadingThis = pendingItemKey?.startsWith(itemKeyPrefix) ?? false;

          if (item.comingSoon) {
            return (
              <ProviderCard
                key={item.providerId}
                item={item}
                isSelected={false}
                isConnected={false}
                isLoading={false}
                isAgentEmailAvailable={isAgentEmailAvailable}
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
              onClick={() => {
                if (isBusy) return;
                if (isSelected) return;

                if (isNovuAgent) {
                  handleNovuAgentLink(item);

                  return;
                }

                handleCreateAndLink(item);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
