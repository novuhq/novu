import { FeatureFlagsKeysEnum, providers as novuProviders } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { RiArrowLeftSLine, RiRobot2Line } from 'react-icons/ri';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getAgent, getAgentDetailQueryKey } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { PageMeta } from '@/components/page-meta';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { formatDateSimple } from '@/utils/format-date';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

function getProviderDisplayName(providerId: string): string {
  return novuProviders.find((p) => p.id === providerId)?.displayName ?? providerId;
}

function AgentDetailsSkeleton() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 py-2">
      <Skeleton className="h-8 w-[min(100%,24ch)]" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-[min(100%,32ch)] font-mono" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function AgentDetailsPage() {
  const { agentIdentifier = '' } = useParams<{ agentIdentifier?: string }>();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const isConversationalAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);

  const agentsListPath = buildRoute(ROUTES.AGENTS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const agentQuery = useQuery({
    queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agentIdentifier),
    queryFn: () => getAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agentIdentifier),
    enabled: Boolean(currentEnvironment && agentIdentifier && isConversationalAgentsEnabled),
  });

  if (!isConversationalAgentsEnabled) {
    return <Navigate to={agentsListPath} replace />;
  }

  if (!agentIdentifier) {
    return <Navigate to={agentsListPath} replace />;
  }

  const isLoading = agentQuery.isLoading;
  const agent = agentQuery.data;
  const error = agentQuery.error;
  const isNotFound = error instanceof NovuApiError && error.status === 404;

  const headerStartItems = (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      <CompactButton
        size="lg"
        className="mr-1 shrink-0"
        variant="ghost"
        icon={RiArrowLeftSLine}
        type="button"
        aria-label="Back to agents"
        onClick={() => navigate(agentsListPath)}
      />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={agentsListPath}>Agents</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            {isLoading ? (
              <Skeleton className="inline-block h-5 w-[min(100%,16ch)]" />
            ) : (
              <BreadcrumbPage className="truncate">{agent?.name ?? 'Agent'}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );

  let pageTitle = 'Agent';

  if (isNotFound) {
    pageTitle = 'Agent not found';
  } else if (error && !isNotFound) {
    pageTitle = 'Agent';
  } else if (agent) {
    pageTitle = agent.name;
  }

  return (
    <>
      <PageMeta title={pageTitle} />
      <DashboardLayout headerStartItems={headerStartItems}>
        {isNotFound ? (
          <div className="text-text-soft text-label-sm max-w-3xl py-2">
            <p>This agent does not exist or was removed.</p>
            <Link to={agentsListPath} className="text-primary-base mt-3 inline-block text-label-sm font-medium">
              Back to agents
            </Link>
          </div>
        ) : null}

        {error && !isNotFound ? (
          <div className="text-error-base text-label-sm max-w-3xl py-2">
            Could not load this agent. Try again later.
          </div>
        ) : null}

        {!error && (isLoading || !agent) ? <AgentDetailsSkeleton /> : null}

        {!error && !isLoading && agent ? (
          <div className="flex w-full max-w-3xl flex-col gap-8 py-2">
            <div className="flex items-start gap-4">
              <span
                className="text-text-sub bg-neutral-alpha-100 flex size-10 shrink-0 items-center justify-center rounded-lg"
                aria-hidden
              >
                <RiRobot2Line className="size-5" />
              </span>
              <div className="min-w-0 flex-1 flex-col gap-1">
                <h1 className="text-text-strong text-[20px] font-semibold leading-7 tracking-tight">{agent.name}</h1>
                <p className="text-text-soft font-mono text-label-sm">{agent.identifier}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-text-sub text-label-xs font-medium uppercase tracking-wide">Last updated</span>
              <span className="text-text-strong text-label-sm">{formatDateSimple(agent.updatedAt)}</span>
            </div>

            {agent.description ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-text-sub text-label-xs font-medium uppercase tracking-wide">Description</span>
                <p className="text-text-strong text-label-sm whitespace-pre-wrap">{agent.description}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <span className="text-text-sub text-label-xs font-medium uppercase tracking-wide">Integrations</span>
              {(agent.integrations ?? []).length === 0 ? (
                <p className="text-text-soft text-label-sm italic">No integrations linked yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {(agent.integrations ?? []).map((integration) => {
                    return (
                      <li
                        key={integration.integrationId}
                        className="border-stroke-soft flex items-center gap-3 rounded-lg border px-3 py-2"
                      >
                        <ProviderIcon
                          providerId={integration.providerId}
                          providerDisplayName={getProviderDisplayName(integration.providerId)}
                          className={cn('size-5 shrink-0', !integration.active && 'opacity-60 grayscale')}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-text-strong text-label-sm font-medium">{integration.name}</p>
                          <p className="text-text-soft font-mono text-label-xs">{integration.identifier}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                'text-label-xs shrink-0 rounded-full px-2 py-0.5 font-medium',
                                integration.active
                                  ? 'bg-success/10 text-success'
                                  : 'bg-neutral-alpha-100 text-text-soft'
                              )}
                            >
                              {integration.active ? 'Active' : 'Inactive'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {integration.active ? 'Integration is active' : 'Integration is inactive'}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </DashboardLayout>
    </>
  );
}
