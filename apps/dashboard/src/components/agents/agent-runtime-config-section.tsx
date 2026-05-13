import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { RiExternalLinkLine, RiRefreshLine, RiRobot2Line } from 'react-icons/ri';
import { type AgentRuntimeConfig, getAgentRuntimeConfig, getAgentRuntimeConfigQueryKey } from '@/api/agent-runtime';
import type { AgentResponse } from '@/api/agents';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { agentRuntimeRetryDecision, agentRuntimeRetryDelay, getProviderStatusUrl } from '@/utils/agent-runtime-errors';

type AgentRuntimeConfigSectionProps = {
  agent: AgentResponse;
  onDrift?: () => void;
  onUnauthorized?: () => void;
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center px-2 py-1.5">
      <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
        {children}
      </span>
    </div>
  );
}

function RuntimeErrorPanel({
  error,
  onRetry,
  providerId,
}: {
  error: unknown;
  onRetry: () => void;
  providerId: string;
}) {
  const err = error as Record<string, unknown> | null;
  const code = typeof err?.code === 'string' ? err.code : 'AGENT_RUNTIME_UNKNOWN';
  const statusUrl = getProviderStatusUrl(providerId);

  const messages: Record<string, { title: string; description: string }> = {
    AGENT_RUNTIME_UNAUTHORIZED: {
      title: 'API key invalid',
      description: 'The Anthropic API key is invalid. Update the integration to continue.',
    },
    AGENT_RUNTIME_FORBIDDEN: {
      title: 'Access denied',
      description: "This key doesn't have access to the required workspace.",
    },
    AGENT_RUNTIME_SERVICE_UNAVAILABLE: {
      title: 'Provider unavailable',
      description: "Anthropic is currently unavailable. Some settings can't be loaded.",
    },
    AGENT_RUNTIME_RATE_LIMITED: {
      title: 'Rate limited',
      description: 'Anthropic is rate-limiting requests.',
    },
  };

  const msg = messages[code] ?? {
    title: 'Something went wrong',
    description: 'Could not load runtime config from Anthropic.',
  };

  return (
    <div className="bg-warning-50 border-warning-200 flex flex-col gap-2 rounded-md border p-3">
      <p className="text-warning-700 text-label-sm font-semibold">{msg.title}</p>
      <p className="text-warning-600 text-label-xs">{msg.description}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="xs" onClick={onRetry}>
          <RiRefreshLine className="mr-1 size-3" />
          Retry
        </Button>
        {statusUrl && (
          <a
            href={statusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-soft hover:text-text-sub flex items-center gap-0.5 text-xs"
          >
            View status
            <RiExternalLinkLine className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}

export function AgentRuntimeConfigSection({ agent, onDrift, onUnauthorized }: AgentRuntimeConfigSectionProps) {
  const { currentEnvironment } = useEnvironment();
  const providerId = agent.managedRuntime?.providerId ?? 'anthropic';

  const configQuery = useQuery({
    queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: ({ signal }) =>
      getAgentRuntimeConfig(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        signal
      ),
    enabled: Boolean(currentEnvironment && agent.identifier && agent.runtime === 'managed'),
    retry: (failureCount, error) => agentRuntimeRetryDecision(failureCount, error),
    retryDelay: (failureCount, error) => agentRuntimeRetryDelay(failureCount, error),
    placeholderData: keepPreviousData,
  });

  const config: AgentRuntimeConfig | undefined = configQuery.data;
  const error = configQuery.error;

  useEffect(() => {
    if (!error) return;
    const code = (error as unknown as Record<string, unknown>)?.code;
    if (code === 'AGENT_RUNTIME_DRIFT') onDrift?.();
    if (code === 'AGENT_RUNTIME_UNAUTHORIZED') onUnauthorized?.();
  }, [error, onDrift, onUnauthorized]);

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>
        <span className="flex items-center gap-1.5">
          <RiRobot2Line className="size-3" />
          Managed runtime config
        </span>
      </SectionHeader>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {configQuery.isLoading && (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-bg-weak h-4 animate-pulse rounded" />
            ))}
          </div>
        )}

        {error && !configQuery.isLoading && (
          <div className="p-3">
            <RuntimeErrorPanel error={error} onRetry={() => configQuery.refetch()} providerId={providerId} />
          </div>
        )}

        {config && !error && (
          <div className="flex flex-col gap-0 divide-y divide-gray-100">
            <ConfigRow label="Model" value={config.model} />
            <ConfigRow label="System prompt" value={config.systemPrompt ? truncate(config.systemPrompt, 80) : '—'} />
            <ConfigRow
              label="MCP servers"
              value={
                config.mcpServers.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {config.mcpServers.map((s) => (
                      <Badge key={s.externalId} color="gray" size="sm" variant="lighter">
                        {s.name}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-text-soft">None</span>
                )
              }
            />
            <ConfigRow
              label="Tools"
              value={
                config.tools.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {config.tools.map((t) => (
                      <Badge key={t.externalId} color="purple" size="sm" variant="lighter">
                        {t.name}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-text-soft">None</span>
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2">
      <span className="text-text-soft text-label-xs w-28 shrink-0 font-medium">{label}</span>
      <span className="text-text-sub text-label-xs min-w-0 flex-1 text-right">{value}</span>
    </div>
  );
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;

  return `${str.slice(0, maxLen)}…`;
}
