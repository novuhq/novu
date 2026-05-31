import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiRobot2Line } from 'react-icons/ri';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AGENTS_LIST_QUERY_KEY,
  type AgentResponse,
  deleteAgent,
  getAgent,
  getAgentDetailQueryKey,
  getAgentIntegrationsQueryKey,
  listAgentIntegrations,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { AgentDetailsHeader } from '@/components/agents/agent-details-header';
import { AgentIntegrationsTab } from '@/components/agents/agent-integrations-tab';
import { AgentOverviewTab } from '@/components/agents/agent-overview-tab';
import { AgentSetupModal } from '@/components/agents/agent-setup-modal';
import { DeleteAgentDialog } from '@/components/agents/delete-agent-dialog';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useSetConnectBreadcrumbLeaf } from '@/components/dashboard-shell/use-connect-breadcrumb';
import { PageMeta } from '@/components/page-meta';
import { Badge } from '@/components/primitives/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { CompactButton } from '@/components/primitives/button-compact';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useAgentRoutes } from '@/hooks/use-agent-routes';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS } from '@/utils/apps';
import {
  AGENT_DETAILS_DEFAULT_TAB,
  AGENT_DETAILS_TABS,
  type AgentDetailsTab,
  buildRoute,
  parseAgentDetailsTab,
} from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

function isValidAgentDetailsTab(tab: string): tab is AgentDetailsTab {
  return (AGENT_DETAILS_TABS as readonly string[]).includes(tab);
}

function getBreadcrumbCurrentLabel(isNotFound: boolean, error: unknown, agent: AgentResponse | undefined): string {
  if (isNotFound) {
    return 'Not found';
  }

  if (error) {
    return 'Agent';
  }

  return agent?.name ?? 'Agent';
}

function AgentDetailsTabsSkeleton() {
  return (
    <div className="flex w-full flex-col">
      <div className="border-stroke-soft -mx-2 border-b px-4 py-3 md:px-6">
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="mx-auto max-w-3xl px-3 py-4 md:px-6">
        <Skeleton className="h-24 w-full max-w-xl" />
      </div>
    </div>
  );
}

export function AgentDetailsPage() {
  const {
    agentIdentifier = '',
    agentTab: agentTabParam,
    integrationIdentifier: integrationIdentifierParam,
  } = useParams<{
    agentIdentifier?: string;
    agentTab?: string;
    integrationIdentifier?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currentEnvironment, readOnly } = useEnvironment();
  const isConversationalAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const currentApp = useCurrentApp();
  const isConnectApp = currentApp === APP_IDS.CONNECT;
  const agentRoutes = useAgentRoutes();
  const [agentToDelete, setAgentToDelete] = useState<AgentResponse | null>(null);
  const [setupModalDismissed, setSetupModalDismissed] = useState(false);
  const track = useTelemetry();
  const lastAgentDetailsTelemetryKey = useRef<string | null>(null);

  const agentsListPath = buildRoute(agentRoutes.list, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const agentQuery = useQuery({
    queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agentIdentifier),
    queryFn: () => getAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agentIdentifier),
    enabled: Boolean(currentEnvironment && agentIdentifier && isConversationalAgentsEnabled),
  });

  let agentBreadcrumbLabel: string | null = null;

  if (agentQuery.error instanceof NovuApiError && agentQuery.error.status === 404) {
    agentBreadcrumbLabel = 'Not found';
  } else if (agentQuery.data) {
    agentBreadcrumbLabel = agentQuery.data.name;
  }

  const connectBreadcrumbLeaf = useMemo(() => {
    if (!isConnectApp || !agentBreadcrumbLabel) return null;

    return {
      label: agentBreadcrumbLabel,
      icon: <RiRobot2Line className="text-text-sub size-4 shrink-0" aria-hidden />,
    };
  }, [isConnectApp, agentBreadcrumbLabel]);

  useSetConnectBreadcrumbLeaf(connectBreadcrumbLeaf);

  const deleteMutation = useMutation({
    mutationFn: ({ identifier, deleteFromProvider }: { identifier: string; deleteFromProvider?: boolean }) =>
      deleteAgent(requireEnvironment(currentEnvironment, 'No environment selected'), identifier, { deleteFromProvider }),
    onSuccess: async (_, { identifier }) => {
      setAgentToDelete(null);
      showSuccessToast('Agent deleted', 'The agent was removed.');
      track(
        isConnectApp
          ? TelemetryEvent.CONNECT_AGENT_DELETED_FROM_DASHBOARD
          : TelemetryEvent.AGENT_DELETED_FROM_DASHBOARD,
        { agentIdentifier: identifier }
      );
      await queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });
      navigate(agentsListPath);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not delete agent.';

      showErrorToast(message, 'Delete failed');
    },
  });

  const agentIntegrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agentIdentifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier,
        limit: 100,
      }),
    enabled: Boolean(currentEnvironment && agentIdentifier && isConversationalAgentsEnabled),
  });

  const hasConnectedIntegration = useMemo(() => {
    const links = agentIntegrationsQuery.data?.data;
    if (!links?.length) return false;

    return links.some((link) => Boolean(link.connectedAt));
  }, [agentIntegrationsQuery.data?.data]);

  const isProductionEnv = readOnly;
  const agent = agentQuery.data;
  const showSetupModal =
    isProductionEnv &&
    agent != null &&
    agentIntegrationsQuery.isSuccess &&
    !agent.active &&
    !hasConnectedIntegration &&
    !setupModalDismissed;

  const integrationIdentifier = integrationIdentifierParam ? decodeURIComponent(integrationIdentifierParam) : undefined;
  const currentTab = integrationIdentifier ? 'integrations' : parseAgentDetailsTab(agentTabParam);

  useEffect(() => {
    if (!isConversationalAgentsEnabled || !agentIdentifier || !agentQuery.data) {
      return;
    }

    const dedupeKey = `${agentQuery.data.identifier}:${currentTab}:${integrationIdentifier ?? ''}`;
    if (lastAgentDetailsTelemetryKey.current === dedupeKey) {
      return;
    }

    lastAgentDetailsTelemetryKey.current = dedupeKey;

    track(
      isConnectApp ? TelemetryEvent.CONNECT_AGENT_DETAILS_PAGE_VISITED : TelemetryEvent.AGENT_DETAILS_PAGE_VISITED,
      {
        agentIdentifier: agentQuery.data.identifier,
        tab: currentTab,
        integrationIdentifier: integrationIdentifier ?? undefined,
      }
    );

    if (integrationIdentifier) {
      track(
        isConnectApp
          ? TelemetryEvent.CONNECT_AGENT_INTEGRATION_GUIDE_VIEWED
          : TelemetryEvent.AGENT_INTEGRATION_GUIDE_VIEWED,
        {
          agentIdentifier: agentQuery.data.identifier,
          integrationIdentifier,
        }
      );
    }
  }, [
    agentIdentifier,
    agentQuery.data,
    currentTab,
    integrationIdentifier,
    isConnectApp,
    isConversationalAgentsEnabled,
    track,
  ]);

  if (!isConversationalAgentsEnabled) {
    return <Navigate to={agentsListPath} replace />;
  }

  if (!agentIdentifier) {
    return <Navigate to={agentsListPath} replace />;
  }

  if (agentTabParam && currentEnvironment?.slug && !isValidAgentDetailsTab(agentTabParam)) {
    return (
      <Navigate
        replace
        to={`${buildRoute(agentRoutes.detailsTab, {
          environmentSlug: currentEnvironment.slug,
          agentIdentifier: encodeURIComponent(agentIdentifier),
          agentTab: AGENT_DETAILS_DEFAULT_TAB,
        })}${location.search}`}
      />
    );
  }

  const isLoading = agentQuery.isLoading;
  const error = agentQuery.error;
  const isNotFound = error instanceof NovuApiError && error.status === 404;

  let pageTitle = 'Agent';

  if (isNotFound) {
    pageTitle = 'Agent not found';
  } else if (error && !isNotFound) {
    pageTitle = 'Agent';
  } else if (agent) {
    pageTitle = agent.name;
  }

  const handleTabChange = (value: string) => {
    if (!agent || !currentEnvironment?.slug) {
      return;
    }

    navigate(
      `${buildRoute(agentRoutes.detailsTab, {
        environmentSlug: currentEnvironment.slug,
        agentIdentifier: encodeURIComponent(agent.identifier),
        agentTab: value,
      })}${location.search}`
    );
  };

  const handleBack = () => navigate(agentsListPath);

  const breadcrumbCurrentLabel = getBreadcrumbCurrentLabel(isNotFound, error, agent);

  const headerStartItems = (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      <CompactButton
        size="lg"
        className="mr-1 shrink-0"
        variant="ghost"
        icon={RiArrowLeftSLine}
        type="button"
        aria-label="Back to agents"
        onClick={handleBack}
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink to={agentsListPath}>Agents</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            {isLoading ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <Skeleton className="inline-block h-5 w-[min(100%,16ch)]" />
                <Badge color="gray" size="sm" variant="lighter" className="shrink-0">
                  BETA
                </Badge>
              </div>
            ) : (
              <BreadcrumbPage className="flex min-w-0 items-center gap-1.5">
                <RiRobot2Line className="text-text-sub size-4 shrink-0" aria-hidden />
                <span className="truncate">{breadcrumbCurrentLabel}</span>
                <Badge color="gray" size="sm" variant="lighter" className="shrink-0">
                  BETA
                </Badge>
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );

  return (
    <>
      <PageMeta title={pageTitle} />
      <DashboardLayout headerStartItems={headerStartItems}>
        {isNotFound ? (
          <div className="text-text-soft text-label-sm max-w-3xl px-4 py-6 md:px-6">
            <p>This agent does not exist or was removed.</p>
            <Link to={agentsListPath} className="text-primary-base mt-3 inline-block text-label-sm font-medium">
              Back to agents
            </Link>
          </div>
        ) : null}

        {error && !isNotFound ? (
          <div className="text-error-base text-label-sm max-w-3xl px-4 py-6 md:px-6">
            Could not load this agent. Try again later.
          </div>
        ) : null}

        {!error && isLoading ? (
          <>
            <AgentDetailsHeader agent={undefined} isLoading />
            <AgentDetailsTabsSkeleton />
          </>
        ) : null}

        {!error && !isLoading && agent ? (
          <>
            <AgentDetailsHeader agent={agent} isLoading={false} onRequestDelete={setAgentToDelete} />

            <Tabs value={currentTab} onValueChange={handleTabChange} className="-mx-2 w-full">
              <TabsList align="start" variant="regular" className="border-t-transparent px-4 py-0! md:px-6">
                <TabsTrigger variant="regular" value="overview" size="xl">
                  Overview
                </TabsTrigger>
                <TabsTrigger variant="regular" value="integrations" size="xl">
                  Channels
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="outline-none">
                <AgentOverviewTab agent={agent} />
              </TabsContent>
              <TabsContent value="integrations" className="outline-none">
                {currentTab === 'integrations' ? (
                  <AgentIntegrationsTab agent={agent} integrationIdentifier={integrationIdentifier} />
                ) : null}
              </TabsContent>
            </Tabs>

            <DeleteAgentDialog
              open={Boolean(agentToDelete)}
              onOpenChange={(open) => {
                if (!open) {
                  setAgentToDelete(null);
                }
              }}
              onConfirm={({ deleteFromProvider }) => {
                if (agentToDelete) {
                  deleteMutation.mutate({ identifier: agentToDelete.identifier, deleteFromProvider });
                }
              }}
              agentName={agentToDelete?.name ?? ''}
              agentIdentifier={agentToDelete?.identifier ?? ''}
              isDeleting={deleteMutation.isPending}
              isManagedRuntime={agentToDelete?.runtime === 'managed'}
            />

            <AgentSetupModal
              isOpen={showSetupModal}
              onClose={() => setSetupModalDismissed(true)}
              onSetupClick={() => {
                setSetupModalDismissed(true);
                handleTabChange('integrations');
              }}
            />
          </>
        ) : null}
      </DashboardLayout>
    </>
  );
}
