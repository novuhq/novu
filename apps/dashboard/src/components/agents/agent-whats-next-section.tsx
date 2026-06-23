import { FeatureFlagsKeysEnum, providers as novuProviders } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { CircleDashed } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  type AgentIntegrationLink,
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
} from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import TruncatedText from '@/components/truncated-text';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { isUserFacingConnectedAgentIntegration } from './is-agent-integration-connected';
import { SetupGuideCard } from './setup-guide-card';
import { SetupStep } from './setup-guide-primitives';

const FADE_HEIGHT_PX = 43;
const COLLAPSED_VISIBLE_CHANNEL_COUNT = 4;
// Collapsed height fits exactly 4 rows (matches the Figma "What's next" spec).
const COLLAPSED_LIST_MAX_HEIGHT_PX = 150;

type AgentWhatsNextSectionProps = {
  agent: AgentResponse;
};

function buildVerticalFadeMask(
  showTopFade: boolean,
  showBottomFade: boolean,
  listHeightPx: number
): string | undefined {
  if (!showTopFade && !showBottomFade) {
    return undefined;
  }

  const topStart = showTopFade ? 'transparent 0' : 'black 0';
  const topStop = showTopFade ? `black ${FADE_HEIGHT_PX}px` : '';
  const bottomStop = showBottomFade ? `black ${Math.max(0, listHeightPx - FADE_HEIGHT_PX)}px` : '';
  const bottomEnd = showBottomFade ? 'transparent 100%' : 'black 100%';

  const stops = [topStart, topStop, bottomStop, bottomEnd].filter(Boolean).join(', ');

  return `linear-gradient(to bottom, ${stops})`;
}

function ConfigureChannelButton({
  link,
  onConfigure,
}: {
  link: AgentIntegrationLink;
  onConfigure: (link: AgentIntegrationLink) => void;
}) {
  const providerMeta = novuProviders.find((p) => p.id === link.integration.providerId);
  const displayName = providerMeta?.displayName ?? link.integration.name;

  return (
    <button
      type="button"
      onClick={() => onConfigure(link)}
      className={cn(
        'flex w-full max-w-[210px] shrink-0 items-center gap-0.5 overflow-hidden rounded-md p-1.5',
        'bg-bg-white bg-[linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.02)_100%)]',
        'shadow-[0px_1px_3px_0px_rgba(14,18,27,0.12),0px_0px_0px_1px_#e1e4ea]',
        'transition-shadow hover:shadow-[0px_1px_3px_0px_rgba(14,18,27,0.16),0px_0px_0px_1px_#cdd0d8]'
      )}
    >
      <CircleDashed className="text-text-sub size-4 shrink-0" />
      <span className="text-text-sub text-label-xs flex min-w-0 flex-1 items-center gap-1 px-1 font-medium">
        <span className="shrink-0">Configure</span>
        <span className="bg-bg-weak border-stroke-soft/50 flex min-w-0 shrink items-center gap-1 rounded border px-1 py-0.5">
          <ProviderIcon
            providerId={link.integration.providerId}
            providerDisplayName={displayName}
            className="size-[15px] shrink-0"
          />
          <TruncatedText className="text-text-strong min-w-0">{displayName}</TruncatedText>
        </span>
      </span>
      <RiArrowRightSLine className="text-text-sub size-4 shrink-0" />
    </button>
  );
}

function ChannelList({
  links,
  onConfigure,
}: {
  links: AgentIntegrationLink[];
  onConfigure: (link: AgentIntegrationLink) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const isCollapsible = links.length > COLLAPSED_VISIBLE_CHANNEL_COUNT;
  // Collapsed: bounded + scrollable. Expanded: unbounded so the full list is revealed.
  const listMaxHeightPx = isExpanded ? undefined : COLLAPSED_LIST_MAX_HEIGHT_PX;

  const updateFades = useCallback(() => {
    const node = listRef.current;

    if (!node || !isCollapsible) {
      setShowTopFade(false);
      setShowBottomFade(false);

      return;
    }

    const hasOverflow = node.scrollHeight > node.clientHeight + 1;
    const isScrolledToTop = node.scrollTop <= 1;
    const isScrolledToBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;

    setShowTopFade(hasOverflow && !isScrolledToTop);
    setShowBottomFade(hasOverflow && !isScrolledToBottom);
  }, [isCollapsible]);

  useEffect(() => {
    updateFades();
  }, [links.length, isExpanded, updateFades]);

  useEffect(() => {
    const node = listRef.current;

    if (!node) {
      return;
    }

    node.addEventListener('scroll', updateFades, { passive: true });

    const resizeObserver = new ResizeObserver(updateFades);
    resizeObserver.observe(node);

    return () => {
      node.removeEventListener('scroll', updateFades);
      resizeObserver.disconnect();
    };
  }, [updateFades]);

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="flex w-full max-w-[210px] flex-col gap-2.5">
      <div
        ref={listRef}
        className={cn(
          'flex w-full flex-col gap-2.5',
          // 1px padding keeps each row's box-shadow border ring from being clipped by the overflow container.
          isCollapsible && 'overflow-y-auto p-px'
        )}
        style={{
          maxHeight: isCollapsible ? listMaxHeightPx : undefined,
          maskImage: buildVerticalFadeMask(showTopFade, showBottomFade, COLLAPSED_LIST_MAX_HEIGHT_PX),
          WebkitMaskImage: buildVerticalFadeMask(showTopFade, showBottomFade, COLLAPSED_LIST_MAX_HEIGHT_PX),
        }}
      >
        {links.map((link) => (
          <ConfigureChannelButton key={link._id} link={link} onConfigure={onConfigure} />
        ))}
      </div>
      {isCollapsible ? (
        <button
          type="button"
          onClick={handleToggle}
          className="text-text-sub hover:text-text-strong flex items-center gap-0.5 self-start transition-colors"
        >
          <span className="text-label-xs font-medium">{isExpanded ? 'Show less' : `Show all (${links.length})`}</span>
          <RiArrowRightSLine className={cn('size-4 transition-transform', isExpanded && '-rotate-90')} />
        </button>
      ) : null}
    </div>
  );
}

function AddChannelButton({ onAddChannel }: { onAddChannel: () => void }) {
  return (
    <Button
      variant="secondary"
      mode="outline"
      size="xs"
      type="button"
      className="text-text-sub max-w-[210px] gap-1 px-1.5 py-1.5"
      onClick={onAddChannel}
      trailingIcon={RiArrowRightSLine}
    >
      Add channel
    </Button>
  );
}

export function AgentWhatsNextSection({ agent }: AgentWhatsNextSectionProps) {
  const isWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_WHATS_NEXT_ENABLED);
  const { currentEnvironment } = useEnvironment();
  const location = useLocation();
  const navigate = useNavigate();
  const agentRoutes = useAgentRoutes();

  const integrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agent.identifier,
        limit: 100,
      }),
    enabled: Boolean(isWhatsNextEnabled && currentEnvironment && agent.identifier),
  });

  const links = integrationsQuery.data?.data ?? [];
  const connectedLinks = useMemo(() => links.filter(isUserFacingConnectedAgentIntegration), [links]);

  const integrationsTabPath = `${buildRoute(agentRoutes.detailsTab, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'integrations',
  })}${location.search}`;

  const handleConfigureChannel = useCallback(
    (link: AgentIntegrationLink) => {
      const integrationDetailPath = `${buildRoute(agentRoutes.integrationDetail, {
        environmentSlug: currentEnvironment?.slug ?? '',
        agentIdentifier: encodeURIComponent(agent.identifier),
        integrationIdentifier: encodeURIComponent(link.integration.identifier),
      })}${location.search}`;

      navigate(integrationDetailPath);
    },
    [agent.identifier, agentRoutes.integrationDetail, currentEnvironment?.slug, location.search, navigate]
  );

  const handleAddChannel = useCallback(() => {
    navigate(integrationsTabPath);
  }, [integrationsTabPath, navigate]);

  if (!isWhatsNextEnabled) {
    return null;
  }

  if (integrationsQuery.isLoading || integrationsQuery.isError || connectedLinks.length === 0) {
    return null;
  }

  const persistKey = `agent-whats-next:${currentEnvironment?.slug ?? ''}:${agent.identifier}`;

  return (
    <SetupGuideCard label="What's next" persistKey={persistKey} className="min-w-0 flex-1">
      <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
        <div
          className="absolute bottom-0 left-[22px] top-0 w-px"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
          }}
        />
        <SetupStep
          index={1}
          status="current"
          sectionLabel="FOR YOUR USERS"
          title="Setup channels for your users"
          description="Setup the channels to let your users easily connect to this agent on wherever they are."
          rightContent={<ChannelList links={connectedLinks} onConfigure={handleConfigureChannel} />}
        />
        <SetupStep
          index={2}
          status="current"
          title="Add another channel"
          description="Add another channel provider for your users to message and interact with your agent."
          rightContent={<AddChannelButton onAddChannel={handleAddChannel} />}
        />
      </div>
    </SetupGuideCard>
  );
}
