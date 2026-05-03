import { ChannelTypeEnum, type IIntegration, providers as novuProviders, PermissionsEnum } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo } from 'react';
import { RiAddLine, RiArrowRightSLine, RiErrorWarningFill } from 'react-icons/ri';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  type AgentIntegrationLink,
  type AgentResponse,
  getAgentDetailQueryKey,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
  removeAgentIntegration,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { ResolveAgentIntegrationGuide } from './agent-integration-guides/resolve-agent-integration-guide';
import { ProviderDropdown } from './provider-dropdown';

type AgentIntegrationsTabProps = {
  agent: AgentResponse;
  integrationIdentifier: string | undefined;
};

const CHANNEL_GROUP_ORDER: ChannelTypeEnum[] = [
  ChannelTypeEnum.IN_APP,
  ChannelTypeEnum.CHAT,
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.SMS,
];

/** Channel labels for the connected-provider list (matches product / Figma copy). */
const CONNECTED_PROVIDER_CHANNEL_LABEL: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-app',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.SMS]: 'SMS',
};

type LastUpdatedParts = {
  prefix: string;
  emphasis: string;
};

function formatLastUpdatedParts(timestamp: number | undefined): LastUpdatedParts {
  if (timestamp == null || Number.isNaN(timestamp)) {
    return { prefix: 'Last updated ', emphasis: '—' };
  }

  const diffSec = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (diffSec < 60) {
    return { prefix: 'Last updated ', emphasis: 'just now' };
  }

  const diffMin = Math.round(diffSec / 60);

  if (diffMin < 60) {
    const emphasis = `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;

    return { prefix: 'Last updated ', emphasis };
  }

  const diffHr = Math.round(diffMin / 60);

  if (diffHr < 48) {
    const emphasis = `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;

    return { prefix: 'Last updated ', emphasis };
  }

  const diffDay = Math.round(diffHr / 24);
  const emphasis = `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  return { prefix: 'Last updated ', emphasis };
}

function groupLinksByChannel(links: AgentIntegrationLink[]) {
  const map = new Map<ChannelTypeEnum, AgentIntegrationLink[]>();

  for (const link of links) {
    const list = map.get(link.integration.channel) ?? [];
    list.push(link);
    map.set(link.integration.channel, list);
  }

  const groups: { channel: ChannelTypeEnum; items: AgentIntegrationLink[] }[] = [];

  for (const channel of CHANNEL_GROUP_ORDER) {
    const items = map.get(channel);

    if (items?.length) {
      groups.push({ channel, items });
    }
  }

  return groups;
}

function getFirstLinkedIntegrationIdentifier(links: AgentIntegrationLink[]): string | undefined {
  const grouped = groupLinksByChannel(links);
  const first = grouped[0]?.items[0];

  return first?.integration.identifier;
}

type IntegrationsHubPlaceholderProps = {
  title: string;
  description: ReactNode;
};

function IntegrationsHubPlaceholder({ title, description }: IntegrationsHubPlaceholderProps) {
  return (
    <div className="border-stroke-soft bg-bg-weak/30 flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center">
      <p className="text-text-strong text-label-sm font-medium">{title}</p>
      <p className="text-text-soft text-label-sm mt-2 max-w-sm leading-5">{description}</p>
    </div>
  );
}

type IntegrationsMainPanelProps = {
  integrationIdentifier: string | undefined;
  agent: AgentResponse;
  selectedIntegration: AgentIntegrationLink | undefined;
  canRemoveAgentIntegration: boolean;
  onBackFromGuide: () => void;
  onRequestRemoveSelected: () => void;
  isRemovingIntegration: boolean;
  isLoading: boolean;
  links: AgentIntegrationLink[];
};

function IntegrationsMainPanel({
  integrationIdentifier,
  agent,
  selectedIntegration,
  canRemoveAgentIntegration,
  onBackFromGuide,
  onRequestRemoveSelected,
  isRemovingIntegration,
  isLoading,
  links,
}: IntegrationsMainPanelProps) {
  const guideSkeleton = (
    <div className="flex min-h-[320px] flex-col gap-4">
      <Skeleton className="h-12 w-2/3 max-w-md rounded-lg" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );

  if (integrationIdentifier) {
    if (isLoading) {
      return guideSkeleton;
    }

    if (!selectedIntegration) {
      return (
        <IntegrationsHubPlaceholder
          title="Integration not found"
          description="This integration is not linked to this agent or may have been removed."
        />
      );
    }

    return (
      <ResolveAgentIntegrationGuide
        embedded
        onBack={onBackFromGuide}
        agent={agent}
        integrationLink={selectedIntegration}
        canRemoveIntegration={canRemoveAgentIntegration}
        onRequestRemoveIntegration={onRequestRemoveSelected}
        isRemovingIntegration={isRemovingIntegration}
      />
    );
  }

  if (isLoading) {
    return guideSkeleton;
  }

  if (links.length > 0) {
    return (
      <IntegrationsHubPlaceholder
        title="Select a provider"
        description="Choose a connected provider on the left to open its setup guide and finish configuration."
      />
    );
  }

  return (
    <IntegrationsHubPlaceholder
      title="No integrations linked yet"
      description={
        <>
          Use <span className="text-text-strong">Add provider</span> in the list to connect an integration from this
          environment.
        </>
      }
    />
  );
}

export function AgentIntegrationsTab({ agent, integrationIdentifier }: AgentIntegrationsTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const track = useTelemetry();

  const canRemoveAgentIntegration = has({ permission: PermissionsEnum.AGENT_WRITE });

  const integrationsHubPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'integrations',
  })}${location.search}`;

  const integrationsStorePath = ROUTES.INTEGRATIONS;

  const navigateToGuide = (nextIntegrationIdentifier: string) => {
    if (!currentEnvironment?.slug) {
      return;
    }

    navigate(
      `${buildRoute(ROUTES.AGENT_DETAILS_INTEGRATIONS_DETAIL, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        integrationIdentifier: encodeURIComponent(nextIntegrationIdentifier),
      })}${location.search}`
    );
  };

  const handleBackFromGuide = () => {
    navigate(integrationsHubPath, { state: { skipIntegrationsRedirect: true } });
  };

  const listQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: agent.identifier,
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agent.identifier),
  });

  const linkedRows = listQuery.data?.data;

  useEffect(() => {
    if (integrationIdentifier != null) {
      return;
    }

    if (!currentEnvironment?.slug) {
      return;
    }

    const skipRedirect = Boolean(
      (location.state as { skipIntegrationsRedirect?: boolean } | null)?.skipIntegrationsRedirect
    );

    if (skipRedirect) {
      return;
    }

    if (!listQuery.isSuccess || !linkedRows?.length) {
      return;
    }

    const firstIntegrationIdentifier = getFirstLinkedIntegrationIdentifier(linkedRows);

    if (!firstIntegrationIdentifier) {
      return;
    }

    navigate(
      `${buildRoute(ROUTES.AGENT_DETAILS_INTEGRATIONS_DETAIL, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        integrationIdentifier: encodeURIComponent(firstIntegrationIdentifier),
      })}${location.search}`,
      { replace: true }
    );
  }, [
    agent.identifier,
    currentEnvironment?.slug,
    linkedRows,
    listQuery.isSuccess,
    location.search,
    location.state,
    navigate,
    integrationIdentifier,
  ]);

  const linkedIntegrationIdSet = useMemo(
    () => new Set(linkedRows?.map((row) => row.integration._id) ?? []),
    [linkedRows]
  );

  const handleProviderDropdownSelect = (_providerId: string, integration?: IIntegration) => {
    if (integration?.identifier) {
      navigateToGuide(integration.identifier);
    }
  };

  const removeIntegrationMutation = useMutation({
    mutationFn: (agentIntegrationId: string) =>
      removeAgentIntegration(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        agentIntegrationId
      ),
    onSuccess: async (_, agentIntegrationId) => {
      const rows = listQuery.data?.data ?? [];
      const removed = rows.find((row) => row._id === agentIntegrationId);
      const name = removed?.integration.name ?? 'Integration';

      showSuccessToast('Integration removed', `${name} was unlinked from this agent.`);
      track(TelemetryEvent.AGENT_INTEGRATION_REMOVED_FROM_DASHBOARD, {
        agentIdentifier: agent.identifier,
        agentIntegrationId,
        integrationIdentifier: removed?.integration.identifier,
      });
      await queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
      });
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
      handleBackFromGuide();
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not remove integration.';

      showErrorToast(message, 'Remove failed');
    },
  });

  const handleLinkedRowClick = (link: AgentIntegrationLink) => {
    navigateToGuide(link.integration.identifier);
  };

  const isLoading = listQuery.isLoading;
  const links = linkedRows ?? [];
  const grouped = groupLinksByChannel(links);
  const selectedIntegration =
    integrationIdentifier != null
      ? links.find((link) => link.integration.identifier === integrationIdentifier)
      : undefined;
  const selectedIntegrationUpdatedAtMs =
    selectedIntegration != null ? Date.parse(selectedIntegration.updatedAt) : undefined;
  const lastUpdatedParts = listQuery.isSuccess
    ? formatLastUpdatedParts(selectedIntegrationUpdatedAtMs)
    : { prefix: 'Last updated ', emphasis: '—' };

  if (listQuery.isError) {
    return (
      <div className="px-6 pt-4">
        <p className="text-error-base text-label-sm">Could not load integrations for this agent. Try again later.</p>
      </div>
    );
  }

  const handleRequestRemoveSelected = () => {
    if (!selectedIntegration || removeIntegrationMutation.isPending) {
      return;
    }

    removeIntegrationMutation.mutate(selectedIntegration._id);
  };

  const mainPanel = (
    <IntegrationsMainPanel
      integrationIdentifier={integrationIdentifier}
      agent={agent}
      selectedIntegration={selectedIntegration}
      canRemoveAgentIntegration={canRemoveAgentIntegration}
      onBackFromGuide={handleBackFromGuide}
      onRequestRemoveSelected={handleRequestRemoveSelected}
      isRemovingIntegration={removeIntegrationMutation.isPending}
      isLoading={isLoading}
      links={links}
    />
  );

  return (
    <div className="flex min-w-0 w-full gap-6 px-6 pt-4">
      <aside className="w-[300px] shrink-0">
        <div className="flex flex-col gap-4">
          <div className="bg-bg-weak flex flex-col gap-2 rounded-[10px] p-1">
            <p className="text-text-sub px-1 pt-1 text-label-xs font-medium leading-4">Connected providers</p>
            {isLoading ? (
              <>
                <div className="text-text-soft px-1 pt-1 text-label-xs font-medium leading-4">In-app</div>
                {[0, 1].map((key) => (
                  <div
                    key={key}
                    className="bg-bg-white border-stroke-weak flex items-center gap-1.5 rounded-md border px-2 py-1.5"
                  >
                    <Skeleton className="size-4 shrink-0 rounded" />
                    <Skeleton className="h-4 flex-1 rounded" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {grouped.map(({ channel, items }) => (
                  <div key={channel} className="flex flex-col gap-2">
                    <p className="text-text-soft px-1 text-label-xs font-medium leading-4">
                      {CONNECTED_PROVIDER_CHANNEL_LABEL[channel]}
                    </p>
                    {items.map((link) => {
                      const int = link.integration;
                      const providerMeta = novuProviders.find((p) => p.id === int.providerId);
                      const isSelected = integrationIdentifier === int.identifier;
                      const showActionNeeded = !link.connectedAt;

                      const statusLabel = showActionNeeded ? 'Action needed' : 'Active';

                      return (
                        <button
                          key={link._id}
                          type="button"
                          onClick={() => handleLinkedRowClick(link)}
                          aria-label={`${int.name} — ${statusLabel}`}
                          className={cn(
                            'bg-bg-white border-stroke-weak hover:border-stroke-soft flex w-full items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors',
                            isSelected && 'border-stroke-soft'
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <ProviderIcon
                              providerId={int.providerId}
                              providerDisplayName={providerMeta?.displayName ?? int.name}
                              className="size-4 shrink-0"
                            />
                            <span className="text-text-sub text-label-sm min-w-0 truncate font-medium leading-5">
                              {int.name}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1" aria-hidden>
                            {showActionNeeded ? (
                              <RiErrorWarningFill className="text-warning-base size-3 shrink-0" />
                            ) : (
                              <div className="bg-success-base size-1.5 shrink-0 rounded-full" />
                            )}
                            <RiArrowRightSLine className="text-text-soft size-4 shrink-0" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}

                {links.length > 0 ? <div className="bg-stroke-weak h-px" role="presentation" /> : null}

                <ProviderDropdown
                  agentIdentifier={agent.identifier}
                  selectedIntegrationId={selectedIntegration?.integration._id}
                  linkedIntegrationIds={linkedIntegrationIdSet}
                  excludeLinked
                  onSelect={handleProviderDropdownSelect}
                  renderTrigger={({ isBusy }) => (
                    <button
                      type="button"
                      disabled={isBusy}
                      className="bg-bg-white border-stroke-weak hover:border-stroke-soft text-text-sub flex h-auto w-full items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 text-left font-medium transition-colors disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5">
                        <RiAddLine className="size-4 shrink-0" aria-hidden />
                        <span className="text-label-sm leading-5">Add provider</span>
                      </span>
                      <RiArrowRightSLine className="text-text-soft size-4 shrink-0" aria-hidden />
                    </button>
                  )}
                />
              </>
            )}
          </div>

          <p className="text-label-xs px-0.5 leading-4">
            <span className="text-text-soft">{lastUpdatedParts.prefix}</span>
            <span className="text-text-sub font-medium">{lastUpdatedParts.emphasis}</span>
          </p>

          <div className="border-stroke-soft border-t pt-3">
            <p className="text-text-soft text-label-xs font-medium leading-4">Quick actions</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={integrationsStorePath}
                className="border-stroke-soft text-text-strong hover:bg-bg-weak text-label-xs inline-flex h-7 items-center rounded-md border bg-transparent px-3 font-medium transition-colors"
              >
                View integration store
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{mainPanel}</div>
    </div>
  );
}
