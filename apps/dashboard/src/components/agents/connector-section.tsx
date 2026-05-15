import { AGENT_RUNTIME_PROVIDERS } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiEditLine, RiInformationFill, RiLoopRightLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type AgentResponse, getAgentRuntimeConfig } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { AnimatedBadgeDot, Badge } from '@/components/primitives/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ClaudeIcon } from '../icons/claude';

type ConnectorSectionProps = {
  agent: AgentResponse;
};

function shortenIdentifier(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 24) return value;

  return `${value.slice(0, 16)}…${value.slice(-4)}`;
}

function ProviderBrand({ providerId }: { providerId: string }) {
  if (providerId === 'anthropic') {
    return (
      <span className="text-text-sub inline-flex items-center gap-1 text-label-xs font-medium">
        <ClaudeIcon className="size-3.5 shrink-0" aria-hidden />
        <span>Claude</span>
      </span>
    );
  }

  const provider = AGENT_RUNTIME_PROVIDERS.find((p) => p.providerId === providerId);

  return <span className="text-text-sub text-label-xs font-medium">{provider?.displayName ?? providerId}</span>;
}

function Row({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between gap-2 px-1.5">
      <span className="text-text-soft text-label-xs flex shrink-0 items-center gap-0.5 font-medium">
        {label}
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tooltip}
                className="text-foreground-400 inline-flex cursor-help rounded-sm"
              >
                <RiInformationFill className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function ConnectorSection({ agent }: ConnectorSectionProps) {
  const { currentEnvironment } = useEnvironment();
  const managed = agent.managedRuntime;
  const { integrations } = useFetchIntegrations();
  const [connectionState, setConnectionState] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const integration = useMemo(() => {
    if (!managed?.integrationId) return undefined;

    return integrations?.find((item) => item._id === managed.integrationId);
  }, [integrations, managed?.integrationId]);

  const integrationUpdateRoute = useMemo(() => {
    if (!managed?.integrationId) return undefined;

    return buildRoute(ROUTES.INTEGRATIONS_UPDATE, { integrationId: managed.integrationId });
  }, [managed?.integrationId]);

  const testConnectionMutation = useMutation({
    mutationFn: () =>
      getAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    onSuccess: () => {
      setConnectionState('connected');
      setConnectionError(null);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not reach the provider.';
      setConnectionState('disconnected');
      setConnectionError(message);
    },
  });

  if (!managed) {
    return null;
  }

  const isProvisioned = Boolean(managed.externalAgentId);
  const showDisconnected = connectionState === 'disconnected';

  return (
    <>
      <Row label="Connector">
        <ProviderBrand providerId={managed.providerId} />
      </Row>

      <Row label="API key">
        <span className="text-text-sub min-w-0 truncate text-label-xs font-medium">
          {integration?.name ?? 'Loading…'}
        </span>
        {integrationUpdateRoute ? (
          <Link
            to={integrationUpdateRoute}
            aria-label="Edit integration"
            className="text-text-soft hover:text-text-sub inline-flex shrink-0 items-center rounded-sm transition-colors"
          >
            <RiEditLine className="size-3.5" />
          </Link>
        ) : null}
      </Row>

      <Row label="Workspace ID">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-text-sub font-code text-label-xs cursor-default tracking-tight">
              {shortenIdentifier(managed.externalWorkspaceId || 'default')}
            </span>
          </TooltipTrigger>
          <TooltipContent>{managed.externalWorkspaceId || 'default (Default Workspace)'}</TooltipContent>
        </Tooltip>
      </Row>

      <Row label="Connector ID">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-text-sub font-code text-label-xs cursor-default tracking-tight">
              {shortenIdentifier(managed.externalAgentId)}
            </span>
          </TooltipTrigger>
          <TooltipContent>{managed.externalAgentId}</TooltipContent>
        </Tooltip>
      </Row>

      {managed.externalEnvironmentId ? (
        <Row label="Environment ID">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-text-sub font-code text-label-xs cursor-default tracking-tight">
                {shortenIdentifier(managed.externalEnvironmentId)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{managed.externalEnvironmentId}</TooltipContent>
          </Tooltip>
        </Row>
      ) : null}

      <div className="flex h-8 items-center justify-between gap-2 px-1.5">
        <div className="flex items-center gap-1.5">
          {showDisconnected ? (
            <Badge variant="lighter" color="red" size="sm">
              <AnimatedBadgeDot color="red" />
              Disconnected
            </Badge>
          ) : (
            <Badge variant="lighter" color="green" size="sm">
              <AnimatedBadgeDot color="green" />
              Connected
            </Badge>
          )}
          <button
            type="button"
            disabled={!isProvisioned || testConnectionMutation.isPending}
            onClick={() => testConnectionMutation.mutate()}
            className={cn(
              'text-text-sub hover:text-text-strong inline-flex items-center gap-1 text-label-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
              testConnectionMutation.isPending && 'opacity-60'
            )}
          >
            <span>·</span>
            <span>Test connection</span>
            <RiLoopRightLine
              className={cn('size-3.5', testConnectionMutation.isPending && 'animate-spin')}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {showDisconnected && connectionError ? (
        <p className="text-destructive-base text-label-xs px-1.5 pt-1" role="alert">
          {connectionError}
        </p>
      ) : null}
    </>
  );
}
