import type { AgentEntity } from '@novu/dal';
import { resolveHumanDashboardBaseUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';

/** Where anyone can load the agent's picture, or nothing when it has none. */
export function agentPictureUrl(agent: Pick<AgentEntity, '_id' | '_environmentId' | 'picture'>): string | undefined {
  if (!agent.picture?.storageKey) {
    return undefined;
  }

  const path = `${agent._environmentId}/${agent._id}/${agent.picture.version}`;

  // Where the Agent Inbox dashboard runs, its API (`/api/v1/agent-pictures/…`) forwards to this one, so the
  // people who see the picture never see this API's address. An API without a dashboard hands out its own address.
  if (process.env.HUMAN_DASHBOARD_URL?.trim()) {
    return `${resolveHumanDashboardBaseUrl()}/api/v1/agent-pictures/${path}`;
  }

  return `${(process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '')}/v1/human/agent-pictures/${path}`;
}

/** The picture an email or its confirmation page shows: an agent with no picture gets the orb from the design. */
export function agentPictureOrDefaultUrl(agent: Pick<AgentEntity, '_id' | '_environmentId' | 'picture'>): string {
  return agentPictureUrl(agent) ?? `${resolveHumanDashboardBaseUrl()}/brand/agent-avatar.png`;
}
