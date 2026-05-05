import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useId, useState } from 'react';
import { RiInformationFill, RiLinkUnlinkM, RiPlugLine } from 'react-icons/ri';
import {
  type AgentResponse,
  disconnectSubscriberMcp,
  getSubscriberMcpConnectionsQueryKey,
  listSubscriberMcpConnections,
  type SubscriberMcpConnectionStatus,
} from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';

const STATUS_LABELS: Record<SubscriberMcpConnectionStatus['status'], string> = {
  connected: 'Connected',
  expired: 'Expired',
  failed: 'Failed',
  not_connected: 'Not connected',
};

function StatusPill({ status }: { status: SubscriberMcpConnectionStatus['status'] }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        status === 'connected' && 'bg-success-lighter text-success-base',
        status === 'expired' && 'bg-warning-lighter text-warning-base',
        status === 'failed' && 'bg-error-lighter text-error-base',
        status === 'not_connected' && 'bg-bg-weak text-text-soft'
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

type Props = {
  agent: AgentResponse;
};

/**
 * Admin-facing list of a subscriber's MCP connections for an agent. Lets ops users
 * look up a subscriber by id and see/revoke their per-server credentials. For
 * subscriber self-service, the same data is exposed via /v1/agents/.../mcp/connections/me.
 */
export function AgentMcpConnectionsSection({ agent }: Props) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const subscriberInputId = useId();
  const [subscriberInput, setSubscriberInput] = useState('');
  const [resolvedSubscriberId, setResolvedSubscriberId] = useState<string>();

  const connectionsQuery = useQuery({
    queryKey: getSubscriberMcpConnectionsQueryKey(currentEnvironment?._id, agent.identifier, resolvedSubscriberId),
    queryFn: () =>
      listSubscriberMcpConnections(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        resolvedSubscriberId ?? ''
      ),
    enabled: Boolean(currentEnvironment && resolvedSubscriberId),
  });

  const disconnectMutation = useMutation({
    mutationFn: (mcpServerName: string) =>
      disconnectSubscriberMcp(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        resolvedSubscriberId ?? '',
        mcpServerName
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getSubscriberMcpConnectionsQueryKey(currentEnvironment?._id, agent.identifier, resolvedSubscriberId),
      });
      showSuccessToast('Disconnected.', 'External tools');
    },
    onError: () => {
      showErrorToast('Could not disconnect the credential.', 'External tools');
    },
  });

  const connections = connectionsQuery.data ?? [];
  const hasPerSubscriberServers = (agent.managedRuntime?.mcpServers ?? []).some((s) => s.scope === 'per_subscriber');

  if (!hasPerSubscriberServers) {
    return null;
  }

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          Subscriber MCP connections
        </span>
      </div>
      <div className="bg-bg-white shadow-box-xs flex flex-col gap-3 overflow-hidden rounded-md p-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={subscriberInputId} className="text-text-strong text-label-xs font-medium">
            Subscriber id
          </label>
          <div className="flex gap-2">
            <Input
              id={subscriberInputId}
              size="2xs"
              value={subscriberInput}
              onChange={(e) => setSubscriberInput(e.target.value)}
              placeholder="e.g. user_abc123"
              className="font-mono"
            />
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="xs"
              disabled={!subscriberInput.trim()}
              onClick={() => setResolvedSubscriberId(subscriberInput.trim())}
            >
              View
            </Button>
          </div>
          <Hint className="text-text-soft text-paragraph-xs leading-4">
            <HintIcon as={RiInformationFill} />
            Look up a subscriber to see their per-server connection state and revoke if needed.
          </Hint>
        </div>

        {resolvedSubscriberId ? (
          <div className="flex flex-col divide-y divide-stroke-soft border border-stroke-soft rounded-md">
            {connections.length === 0 ? (
              <div className="text-text-soft text-paragraph-xs px-3 py-2">
                {connectionsQuery.isLoading ? 'Loading…' : 'No per-subscriber MCP servers attached to this agent.'}
              </div>
            ) : (
              connections.map((connection) => (
                <div key={connection.mcpServerName} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-text-strong text-label-xs font-medium">{connection.displayName}</span>
                      <StatusPill status={connection.status} />
                    </div>
                    <span className="text-text-soft text-paragraph-xs leading-4">
                      {connection.connectedAt ? (
                        <>
                          Connected {formatDistanceToNow(new Date(connection.connectedAt), { addSuffix: true })}
                          {connection.lastUsedAt
                            ? ` · last used ${formatDistanceToNow(new Date(connection.lastUsedAt), { addSuffix: true })}`
                            : ''}
                        </>
                      ) : (
                        'Subscriber will be prompted on first use.'
                      )}
                    </span>
                  </div>
                  {connection.status !== 'not_connected' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      mode="outline"
                      size="xs"
                      leadingIcon={RiLinkUnlinkM}
                      isLoading={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate(connection.mcpServerName)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <span className="text-text-soft inline-flex items-center gap-1 text-label-xs">
                      <RiPlugLine className="size-3.5 shrink-0" aria-hidden />
                      Awaiting connect
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
