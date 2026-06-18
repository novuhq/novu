import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle } from 'lucide-react';
import { getAgentIntegrationsQueryKey, getAgentsListQueryKey, listAgentIntegrations, listAgents } from '@/api/agents';
import { CopyButton } from '@/components/primitives/copy-button';
import { ExternalLink } from '@/components/shared/external-link';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '@/utils/ui';

const CONNECT_COMMAND = 'npx novu connect';

type VercelIntegrationOnboardingProps = {
  linkedProjectId?: string;
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

export function VercelIntegrationOnboarding({ linkedProjectId }: VercelIntegrationOnboardingProps) {
  const { currentEnvironment } = useEnvironment();
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const environment = currentEnvironment ?? undefined;
  const { data: agentsResponse, isLoading } = useQuery({
    queryKey: getAgentsListQueryKey(environment?._id, { limit: 10, identifier: '' }),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(environment, 'No environment selected'),
        limit: 10,
      }),
    enabled: !!environment && isAgentsEnabled,
  });

  const agents = agentsResponse?.data ?? [];
  const productionAgent = agents.find((agent) => agent.bridgeUrl);
  const previewAgent = agents.find((agent) => agent.devBridgeActive && agent.devBridgeUrl);

  const { data: integrations = [] } = useQuery({
    queryKey: getAgentIntegrationsQueryKey(environment?._id, productionAgent?.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(environment, 'No environment selected'),
        agentIdentifier: productionAgent?.identifier ?? '',
      }),
    enabled: !!environment && !!productionAgent?.identifier && isAgentsEnabled,
  });

  if (!isAgentsEnabled) {
    return null;
  }

  const hasDeployedAgent = !!productionAgent?.bridgeUrl;
  const hasConnectedChannel = integrations.some((integration) => integration.active);
  const agentDetailUrl = productionAgent ? `/env/${environment?.slug}/agents/${productionAgent.identifier}` : undefined;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div>
        <h2 className="text-foreground-950 text-sm font-medium">Finish setting up your Vercel agent</h2>
        <p className="text-foreground-500 mt-1 text-xs">
          Deploy once on Vercel, then connect channels from your terminal with the Novu CLI.
        </p>
      </div>

      <OnboardingStep
        completed={hasDeployedAgent}
        title="Agent deployed and bridge registered"
        description={
          isLoading
            ? 'Checking bridge status...'
            : hasDeployedAgent
              ? `Production bridge connected at ${productionAgent?.bridgeUrl}`
              : 'Waiting for your first Vercel production deploy to register the agent bridge.'
        }
      >
        <div className="text-foreground-500 flex flex-col gap-1 text-xs">
          <p>
            Production bridge:{' '}
            <span className={cn(hasDeployedAgent ? 'text-success' : 'text-foreground-400')}>
              {hasDeployedAgent ? 'connected' : 'pending'}
            </span>
          </p>
          <p>
            Preview bridge:{' '}
            <span className={cn(previewAgent ? 'text-success' : 'text-foreground-400')}>
              {previewAgent ? 'connected' : 'pending'}
            </span>
          </p>
        </div>
      </OnboardingStep>

      <OnboardingStep
        completed={hasConnectedChannel}
        title="Connect a channel"
        description="Run the CLI from your project directory to connect Slack, Telegram, or email."
      >
        <div className="border-stroke-soft flex items-center justify-between gap-2 rounded-md border bg-neutral-50 px-3 py-2">
          <code className="text-foreground-950 text-xs">{CONNECT_COMMAND}</code>
          <CopyButton valueToCopy={CONNECT_COMMAND} size="xs" />
        </div>
        <p className="text-foreground-500 mt-2 text-xs">
          Need help?{' '}
          <ExternalLink href="https://docs.novu.co/agents/quickstart" target="_blank">
            Read the agent quickstart
          </ExternalLink>
        </p>
      </OnboardingStep>

      <OnboardingStep
        completed={false}
        title="Customize your agent"
        description="Edit the agent handler in your deployed Vercel repository and push to redeploy."
      >
        {linkedProjectId ? (
          <ExternalLink
            href={`https://vercel.com/dashboard/projects/${linkedProjectId}`}
            target="_blank"
            className="text-xs"
          >
            Open linked Vercel project
          </ExternalLink>
        ) : null}
        {agentDetailUrl ? (
          <ExternalLink href={agentDetailUrl} className="text-xs">
            View agent in Novu
          </ExternalLink>
        ) : null}
      </OnboardingStep>
    </div>
  );
}
