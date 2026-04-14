import { ChannelTypeEnum, providers as novuProviders, PermissionsEnum } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { RiAddLine, RiArrowRightSLine, RiErrorWarningFill } from 'react-icons/ri';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  type AgentIntegrationLink,
  type AgentResponse,
  addAgentIntegration,
  getAgentDetailQueryKey,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
  removeAgentIntegration,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { IntegrationsList } from '@/components/integrations/components/integrations-list';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import type { TableIntegration } from '@/components/integrations/types';
import { PermissionButton } from '@/components/primitives/permission-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ResolveAgentIntegrationGuide } from './agent-integration-guides/resolve-agent-integration-guide';

type AgentIntegrationsTabProps = {
  agent: AgentResponse;
  providerId: string | undefined;
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
  providerId: string | undefined;
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
  providerId,
  agent,
  selectedIntegration,
  canRemoveAgentIntegration,
  onBackFromGuide,
  onRequestRemoveSelected,
  isRemovingIntegration,
  isLoading,
  links,
}: IntegrationsMainPanelProps) {
  if (providerId) {

    return (
      <ResolveAgentIntegrationGuide
        embedded
        providerId={providerId}
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

    return (
      <div className="flex min-h-[320px] flex-col gap-4">
        <Skeleton className="h-12 w-2/3 max-w-md rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
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

export function AgentIntegrationsTab({ agent, providerId }: AgentIntegrationsTabProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const canRemoveAgentIntegration = has({ permission: PermissionsEnum.AGENT_WRITE });

  const integrationsHubPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'integrations',
  })}${location.search}`;

  const integrationsStorePath = ROUTES.INTEGRATIONS;

  const activityTabPath = `${buildRoute(ROUTES.AGENT_DETAILS_TAB, {
    environmentSlug: currentEnvironment?.slug ?? '',
    agentIdentifier: encodeURIComponent(agent.identifier),
    agentTab: 'activity',
  })}${location.search}`;

  const navigateToGuide = (nextProviderId: string) => {
    if (!currentEnvironment?.slug) {
      return;
    }

    navigate(
      `${buildRoute(ROUTES.AGENT_DETAILS_INTEGRATIONS_PROVIDER, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        providerId: encodeURIComponent(nextProviderId),
      })}${location.search}`
    );
  };

  const handleBackFromGuide = () => {
    navigate(integrationsHubPath);
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

  const linkedIntegrationIds = listQuery.data?.data.map((row) => row.integration._id) ?? [];

  const addMutation = useMutation({
    mutationFn: (integrationIdentifier: string) =>
      addAgentIntegration(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        integrationIdentifier,
      }),
    onSuccess: async (data) => {
      showSuccessToast('Integration linked', `${data.integration.name} was added to this agent.`);
      await queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier),
      });
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
      setAddSheetOpen(false);
      navigateToGuide(data.integration.providerId);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not link integration.';

      showErrorToast(message, 'Link failed');
    },
  });

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

  const handlePickIntegration = (item: TableIntegration) => {
    if (addMutation.isPending) {
      return;
    }

    addMutation.mutate(item.identifier);
  };

  const handleLinkedRowClick = (link: AgentIntegrationLink) => {
    navigateToGuide(link.integration.providerId);
  };

  const isLoading = listQuery.isLoading;
  const links = listQuery.data?.data ?? [];
  const grouped = groupLinksByChannel(links);
  const selectedIntegration =
    providerId != null ? links.find((link) => link.integration.providerId === providerId) : undefined;
  const selectedIntegrationUpdatedAtMs =
    selectedIntegration != null ? Date.parse(selectedIntegration.updatedAt) : undefined;
  const lastUpdatedParts = listQuery.isSuccess
    ? formatLastUpdatedParts(selectedIntegrationUpdatedAtMs)
    : { prefix: 'Last updated ', emphasis: '—' };

  if (listQuery.isError) {
    return (
      <div className="text-error-base text-label-sm">Could not load integrations for this agent. Try again later.</div>
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
      providerId={providerId}
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
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
        <aside className="w-full shrink-0 lg:w-[300px]">
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
                        const isSelected = providerId === int.providerId;
                        const showActionNeeded = !int.active;

                        return (
                          <button
                            key={link._id}
                            type="button"
                            onClick={() => handleLinkedRowClick(link)}
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
                            <span className="flex shrink-0 items-center gap-1">
                              {showActionNeeded ? (
                                <RiErrorWarningFill
                                  className="text-error-base size-3 shrink-0"
                                  aria-label="Action needed"
                                />
                              ) : (
                                <div
                                  className="bg-success-base size-1.5 shrink-0 rounded-full"
                                  role="img"
                                  aria-label="Active"
                                />
                              )}
                              <RiArrowRightSLine className="text-text-soft size-4 shrink-0" aria-hidden />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {links.length > 0 ? <div className="bg-stroke-weak h-px" role="presentation" /> : null}

                  <PermissionButton
                    permission={PermissionsEnum.AGENT_WRITE}
                    size="xs"
                    variant="secondary"
                    mode="ghost"
                    type="button"
                    className="bg-bg-white border-stroke-weak hover:border-stroke-soft text-text-sub h-auto w-full justify-between gap-1.5 rounded-md border px-2 py-1.5 font-medium"
                    onClick={() => setAddSheetOpen(true)}
                  >
                    <span className="flex items-center gap-1.5">
                      <RiAddLine className="size-4 shrink-0" aria-hidden />
                      <span className="text-label-sm leading-5">Add provider</span>
                    </span>
                    <RiArrowRightSLine className="text-text-soft size-4 shrink-0" aria-hidden />
                  </PermissionButton>
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
                  to={activityTabPath}
                  className="border-stroke-soft text-text-strong hover:bg-bg-weak text-label-xs inline-flex h-7 items-center rounded-md border bg-transparent px-3 font-medium transition-colors"
                >
                  View activity
                </Link>
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

        <SheetContent side="right" className="border-stroke-soft w-full border-l bg-bg-white sm:max-w-[400px]">
          <SheetHeader className="border-stroke-soft space-y-1.5 border-b px-5 pb-4 pt-6 pr-14 text-left sm:px-6">
            <SheetTitle className="text-text-strong text-paragraph-sm font-semibold leading-5 tracking-tight">
              Connect provider
            </SheetTitle>
            <SheetDescription className="text-text-soft text-label-sm leading-5">
              Choose an integration from this environment to link to this agent.
            </SheetDescription>
          </SheetHeader>
          <SheetMain className="bg-bg-weak/40 p-4 sm:p-5">
            <IntegrationsList
              variant="connectSheet"
              onItemClick={handlePickIntegration}
              excludeIntegrationIds={linkedIntegrationIds}
            />
          </SheetMain>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">{mainPanel}</div>
    </div>
  );
}
