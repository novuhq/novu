import { EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { getAgentIntegrationsQueryKey, getAgentsListQueryKey, listAgentIntegrations, listAgents } from '@/api/agents';
import { getApiKeys } from '@/api/environments';
import type { GetVercelConfigurationDetails } from '@/api/partner-integrations';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { Skeleton } from '@/components/primitives/skeleton';
import { ExternalLink } from '@/components/shared/external-link';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildConnectCommandVariants } from '@/utils/build-connect-command';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';

const PRODUCTION_ENVIRONMENT_NAME = 'Production';
const DEVELOPMENT_ENVIRONMENT_NAME = 'Development';
const BRIDGE_STATUS_POLL_INTERVAL_MS = 5000;

function getBridgePollInterval(hasLinkedProject: boolean, agents: Array<{ bridgeUrl?: string }> | undefined) {
  if (!hasLinkedProject) {
    return false;
  }

  const hasBridgeRegistered = agents?.some((agent) => agent.bridgeUrl);

  if (hasBridgeRegistered) {
    return false;
  }

  return BRIDGE_STATUS_POLL_INTERVAL_MS;
}

const FALLBACK_CONNECT_COMMAND = 'npx novu connect';

type VercelProjectLink = {
  id: string;
  name: string;
  dashboardUrl: string;
};

type VercelIntegrationOnboardingProps = {
  vercelIntegrationDetails?: GetVercelConfigurationDetails[];
  vercelProjects?: VercelProjectLink[];
  currentOrganizationId?: string;
  vercelReturnUrl?: string | null;
  hasJustLinkedProject?: boolean;
  linkedProjectIdOverride?: string;
};

type OnboardingStepProps = {
  completed: boolean;
  title: string;
  description: string;
  children?: React.ReactNode;
};

function OnboardingStep({ completed, title, description, children }: OnboardingStepProps) {
  return (
    <div className="border-stroke-soft flex flex-col gap-2 rounded-lg border bg-white p-4">
      <div className="flex items-start gap-3">
        {completed ? (
          <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
        ) : (
          <Circle className="text-foreground-400 mt-0.5 size-4 shrink-0" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-foreground-950 text-sm font-medium">{title}</p>
          <p className="text-foreground-500 text-xs">{description}</p>
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

function getLinkedProjectId(
  vercelIntegrationDetails: GetVercelConfigurationDetails[] | undefined,
  currentOrganizationId: string | undefined
): string | undefined {
  if (!vercelIntegrationDetails?.length) {
    return undefined;
  }

  const orgRow = currentOrganizationId
    ? vercelIntegrationDetails.find((row) => row.organizationId === currentOrganizationId)
    : vercelIntegrationDetails[0];

  return orgRow?.projectIds?.[0];
}

function hasLinkedVercelProject(
  vercelIntegrationDetails: GetVercelConfigurationDetails[] | undefined,
  currentOrganizationId: string | undefined
): boolean {
  if (!vercelIntegrationDetails?.length) {
    return false;
  }

  if (currentOrganizationId) {
    const orgRow = vercelIntegrationDetails.find((row) => row.organizationId === currentOrganizationId);

    return (orgRow?.projectIds?.length ?? 0) > 0;
  }

  return vercelIntegrationDetails.some((row) => row.projectIds.length > 0);
}

function resolveVercelDeploymentsUrl(
  projectId: string | undefined,
  vercelProjects: VercelProjectLink[] | undefined
): string | undefined {
  if (!projectId || !vercelProjects?.length) {
    return undefined;
  }

  const project = vercelProjects.find((item) => item.id === projectId);

  return project?.dashboardUrl;
}

function hasNonEmailChannelConnected(
  integrations: Array<{ connectedAt?: string | null; integration: { providerId: string } }>
): boolean {
  return integrations.some(
    (link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent
  );
}

export function VercelIntegrationOnboarding({
  vercelIntegrationDetails,
  vercelProjects,
  currentOrganizationId,
  vercelReturnUrl,
  hasJustLinkedProject = false,
  linkedProjectIdOverride,
}: VercelIntegrationOnboardingProps) {
  const { environments } = useEnvironment();
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);

  const hasLinkedProject =
    hasJustLinkedProject || hasLinkedVercelProject(vercelIntegrationDetails, currentOrganizationId);

  const productionEnvironment = useMemo(
    () => environments?.find((env) => env.name === PRODUCTION_ENVIRONMENT_NAME),
    [environments]
  );
  const developmentEnvironment = useMemo(
    () => environments?.find((env) => env.name === DEVELOPMENT_ENVIRONMENT_NAME),
    [environments]
  );

  const { data: productionAgentsResponse, isLoading: isProductionAgentsLoading } = useQuery({
    queryKey: getAgentsListQueryKey(productionEnvironment?._id, { limit: 10, identifier: '' }),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(productionEnvironment, 'Production environment not found'),
        limit: 10,
      }),
    enabled: !!productionEnvironment && isAgentsEnabled,
    refetchInterval: (query) => getBridgePollInterval(hasLinkedProject, query.state.data?.data),
  });

  const { data: previewAgentsResponse } = useQuery({
    queryKey: getAgentsListQueryKey(developmentEnvironment?._id, { limit: 10, identifier: '' }),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(developmentEnvironment, 'Development environment not found'),
        limit: 10,
      }),
    enabled: !!developmentEnvironment && isAgentsEnabled && hasLinkedProject,
    refetchInterval: hasLinkedProject ? BRIDGE_STATUS_POLL_INTERVAL_MS : false,
  });

  const productionAgents = productionAgentsResponse?.data ?? [];
  const previewAgents = previewAgentsResponse?.data ?? [];
  const productionAgent = productionAgents.find((agent) => agent.bridgeUrl);
  const previewAgent = previewAgents.find((agent) => agent.devBridgeActive && agent.devBridgeUrl);

  const { data: integrationsResponse } = useQuery({
    queryKey: getAgentIntegrationsQueryKey(productionEnvironment?._id, productionAgent?.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(productionEnvironment, 'Production environment not found'),
        agentIdentifier: productionAgent?.identifier ?? '',
      }),
    enabled: !!productionEnvironment && !!productionAgent?.identifier && isAgentsEnabled,
    refetchInterval: (query) => {
      const integrations = query.state.data?.data ?? [];

      if (hasNonEmailChannelConnected(integrations)) {
        return false;
      }

      return BRIDGE_STATUS_POLL_INTERVAL_MS;
    },
  });

  const { data: productionApiKeysResponse, isLoading: isProductionApiKeysLoading } = useQuery({
    queryKey: [QueryKeys.getApiKeys, productionEnvironment?._id],
    queryFn: () =>
      getApiKeys({
        environment: requireEnvironment(productionEnvironment, 'Production environment not found'),
      }),
    enabled: !!productionEnvironment && !!productionAgent?.identifier && isAgentsEnabled,
  });

  const productionSecretKey = productionApiKeysResponse?.data?.[0]?.key;
  const connectCommand = useMemo(() => {
    if (!productionAgent?.identifier || !productionSecretKey) {
      return null;
    }

    return buildConnectCommandVariants({
      agentIdentifier: productionAgent.identifier,
      secretKey: productionSecretKey,
    });
  }, [productionAgent?.identifier, productionSecretKey]);

  const integrations = integrationsResponse?.data ?? [];
  const hasRedirectedToVercelRef = useRef(false);
  const linkedProjectId =
    linkedProjectIdOverride ?? getLinkedProjectId(vercelIntegrationDetails, currentOrganizationId);
  const hasBridgeRegistered = !!productionAgent?.bridgeUrl;
  const hasConnectedChannel = hasNonEmailChannelConnected(integrations);
  const vercelDeploymentsUrl = resolveVercelDeploymentsUrl(linkedProjectId, vercelProjects);

  useEffect(() => {
    if (!isAgentsEnabled || !hasConnectedChannel || !vercelReturnUrl || hasRedirectedToVercelRef.current) {
      return;
    }

    hasRedirectedToVercelRef.current = true;
    window.location.replace(vercelReturnUrl);
  }, [isAgentsEnabled, hasConnectedChannel, vercelReturnUrl]);

  if (!isAgentsEnabled) {
    return null;
  }

  function handleReturnToVercel() {
    if (!vercelReturnUrl) {
      return;
    }

    window.location.replace(vercelReturnUrl);
  }

  let bridgeStepDescription = 'Select a Vercel project above and click Create Links to inject your Novu credentials.';

  if (hasLinkedProject && !hasBridgeRegistered) {
    bridgeStepDescription =
      'Novu credentials are in Vercel. Trigger a production redeploy — the bridge registers automatically after deploy succeeds.';
  }

  if (isProductionAgentsLoading) {
    bridgeStepDescription = 'Checking Production bridge status...';
  }

  if (hasBridgeRegistered) {
    bridgeStepDescription = `Production bridge connected at ${productionAgent?.bridgeUrl}`;
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-6">
      {hasConnectedChannel && vercelReturnUrl ? (
        <div className="border-stroke-soft flex flex-col gap-2 rounded-lg border bg-neutral-50 p-4">
          <p className="text-foreground-950 text-sm font-medium">Channel connected — completing Vercel installation</p>
          <p className="text-foreground-500 text-xs">Returning you to Vercel to finish setup…</p>
        </div>
      ) : null}

      {hasLinkedProject && vercelReturnUrl && !hasConnectedChannel ? (
        <div className="border-stroke-soft flex flex-col gap-3 rounded-lg border bg-neutral-50 p-4">
          <div>
            <p className="text-foreground-950 text-sm font-medium">Project linked — finish setup before closing</p>
            <p className="text-foreground-500 mt-1 text-xs">
              Novu added your credentials to Vercel. Redeploy production so the agent bridge can register, then connect
              a channel with the CLI. Return to Vercel only when you are ready to close this window.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {vercelDeploymentsUrl ? (
              <Button
                variant="secondary"
                mode="outline"
                size="sm"
                onClick={() => window.open(vercelDeploymentsUrl, '_blank', 'noopener,noreferrer')}
              >
                Redeploy in Vercel
              </Button>
            ) : null}
            <Button variant="primary" mode="filled" size="sm" onClick={handleReturnToVercel}>
              Return to Vercel
            </Button>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-foreground-950 text-sm font-medium">Setup checklist</h2>
        <p className="text-foreground-500 mt-1 text-xs">
          Link your project, redeploy production on Vercel, connect a channel from your terminal, then return to Vercel
          to complete installation.
        </p>
      </div>

      <OnboardingStep
        completed={hasLinkedProject}
        title="Link Vercel project & inject credentials"
        description={
          hasLinkedProject
            ? 'Your Novu secret key and application identifier were added to the linked Vercel project.'
            : 'Choose a Novu organization and Vercel project above, then click Create Links.'
        }
      />

      <OnboardingStep
        completed={hasBridgeRegistered}
        title="Deploy & register agent bridge"
        description={bridgeStepDescription}
      >
        {hasLinkedProject && !hasBridgeRegistered && vercelDeploymentsUrl ? (
          <ExternalLink href={vercelDeploymentsUrl} target="_blank" className="text-xs">
            Redeploy in Vercel
          </ExternalLink>
        ) : null}
        {hasBridgeRegistered ? (
          <div className="text-foreground-500 flex flex-col gap-1 text-xs">
            <p>
              Production bridge: <span className="text-success">connected</span>
            </p>
            <p>
              Preview bridge:{' '}
              <span className={cn(previewAgent ? 'text-success' : 'text-foreground-400')}>
                {previewAgent ? 'connected' : 'pending'}
              </span>
            </p>
          </div>
        ) : null}
      </OnboardingStep>

      <OnboardingStep
        completed={hasConnectedChannel}
        title="Connect a channel"
        description={
          hasBridgeRegistered
            ? 'Run the CLI from your linked Vercel project directory to connect Slack, Telegram, or email to your deployed agent.'
            : 'Available after your agent bridge is registered.'
        }
      >
        {hasBridgeRegistered ? (
          <>
            <div className="border-stroke-soft flex items-center justify-between gap-2 rounded-md border bg-neutral-50 px-3 py-2">
              {isProductionApiKeysLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <>
                  <code className="text-foreground-950 text-xs break-all">
                    {connectCommand?.display ?? FALLBACK_CONNECT_COMMAND}
                  </code>
                  <CopyButton valueToCopy={connectCommand?.copy ?? FALLBACK_CONNECT_COMMAND} size="xs" />
                </>
              )}
            </div>
            <p className="text-foreground-500 mt-2 text-xs">
              Need help?{' '}
              <ExternalLink href="https://docs.novu.co/agents/quickstart" target="_blank">
                Read the agent quickstart
              </ExternalLink>
            </p>
          </>
        ) : null}
      </OnboardingStep>
    </div>
  );
}
