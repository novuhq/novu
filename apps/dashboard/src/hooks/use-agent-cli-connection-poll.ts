import { DirectionEnum, EmailProviderIdEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  type AgentIntegrationLink,
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  getAgentsListQueryKey,
  listAgentIntegrations,
  listAgents,
} from '@/api/agents';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

const POLL_INTERVAL_MS = 5000;

// Mirrors the param shape baked into `getAgentsListQueryKey` so the polling query key stays stable.
const LATEST_AGENT_PARAMS = { after: undefined, before: undefined, limit: 1, identifier: '' };

export type CliConnectionResult = {
  connectedAgentIdentifier: string;
  connectedLink: AgentIntegrationLink;
};

type Baseline = {
  latestAgentId: string | undefined;
  hadConnectedChannel: boolean;
};

/**
 * A "real" connected channel is a link with `connectedAt` stamped whose provider is not the
 * auto-provisioned Novu email integration — the same exclusion used across the agent setup UI.
 */
function findConnectedChannelLink(links: AgentIntegrationLink[] | undefined): AgentIntegrationLink | undefined {
  return links?.find(
    (link) => Boolean(link.connectedAt) && link.integration.providerId !== EmailProviderIdEnum.NovuAgent
  );
}

/**
 * Polls for an agent connected via the CLI path (Open in Cursor / Copy prompt). The poll watches
 * the most recently created agent and its channel links; when a non-email channel becomes
 * connected it returns the agent identifier + connected link so the page can render the success
 * view.
 *
 * The baseline is session-only: it's captured on the first resolved poll so a returning user who
 * already has a connected agent is never shown the success view — only a connection that appears
 * while the page is open triggers it. Polling stops as soon as `enabled` flips to false (the user
 * created an agent from the UI) or a connection is detected.
 */
export function useAgentCliConnectionPoll({ enabled }: { enabled: boolean }): CliConnectionResult | null {
  const { currentEnvironment } = useEnvironment();
  const baselineRef = useRef<Baseline | null>(null);
  const [detected, setDetected] = useState<CliConnectionResult | null>(null);

  const pollingActive = enabled && !detected;

  const latestAgentQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, LATEST_AGENT_PARAMS),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: 1,
        orderBy: 'createdAt',
        orderDirection: DirectionEnum.DESC,
      }),
    enabled: pollingActive && Boolean(currentEnvironment),
    refetchInterval: pollingActive ? POLL_INTERVAL_MS : false,
  });

  const latestAgent: AgentResponse | undefined = latestAgentQuery.data?.data?.[0];

  const integrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, latestAgent?.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: latestAgent?.identifier ?? '',
        limit: 100,
      }),
    enabled: pollingActive && Boolean(currentEnvironment && latestAgent?.identifier),
    refetchInterval: pollingActive ? POLL_INTERVAL_MS : false,
  });

  useEffect(() => {
    if (!pollingActive) return;
    // Wait for the latest-agent fetch so the baseline reflects the real starting state.
    if (!latestAgentQuery.isSuccess) return;

    // No agents yet (fresh onboarding) — record an empty baseline and keep polling. Any agent that
    // later appears connected will read as a new agent and trigger the success view.
    if (!latestAgent) {
      if (!baselineRef.current) {
        baselineRef.current = { latestAgentId: undefined, hadConnectedChannel: false };
      }

      return;
    }

    if (!integrationsQuery.isSuccess) return;

    const connectedLink = findConnectedChannelLink(integrationsQuery.data?.data);
    const hasConnectedChannel = Boolean(connectedLink);

    if (!baselineRef.current) {
      baselineRef.current = { latestAgentId: latestAgent._id, hadConnectedChannel: hasConnectedChannel };

      return;
    }

    if (!connectedLink) return;

    const baseline = baselineRef.current;
    const isNewAgent = latestAgent._id !== baseline.latestAgentId;
    const baselineAgentNewlyConnected = latestAgent._id === baseline.latestAgentId && !baseline.hadConnectedChannel;

    if (isNewAgent || baselineAgentNewlyConnected) {
      setDetected({ connectedAgentIdentifier: latestAgent.identifier, connectedLink });
    }
  }, [
    pollingActive,
    latestAgentQuery.isSuccess,
    integrationsQuery.isSuccess,
    integrationsQuery.data?.data,
    latestAgent,
  ]);

  return detected;
}
