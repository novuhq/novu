import type { AgentEntity } from '@novu/dal';

/**
 * Name a relay agent is created with. Relay agents cannot be renamed through
 * the agents API, so in practice most carry this placeholder. Invitee-facing
 * copy treats it as "unnamed" and leans on the operator's name instead.
 */
export const DEFAULT_HUMAN_RELAY_NAME = 'Human';

/** Who is asking to reach the invitee, as shown in emails and on the Human website. */
export interface RelaySender {
  /** The agent's own display name; absent while it still has the placeholder name. */
  agentName?: string;
  /** The person who ran `human setup`, when they gave a name. */
  operatorName?: string;
}

export function buildRelayOwnerName(firstName?: string | null, lastName?: string | null): string | undefined {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');

  return full || undefined;
}

/**
 * The operator as the agent's public card names them: their first name and the initial of their last name,
 * "Ada L.". Nothing without a first name, so a card never shows more of a last name than its initial.
 */
export function buildRelayOwnerCardName(firstName?: string | null, lastName?: string | null): string | undefined {
  const first = firstName?.trim();
  if (!first) {
    return undefined;
  }

  // Its first letter: a mark in front of it isn't an initial.
  const initial = lastName?.match(/\p{L}/u)?.[0];

  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}

export function resolveRelayAgentName(agent: Pick<AgentEntity, 'name'> | null | undefined): string | undefined {
  const name = agent?.name?.trim();
  if (!name || name === DEFAULT_HUMAN_RELAY_NAME) {
    return undefined;
  }

  return name;
}

export function resolveRelaySender(params: {
  agent: Pick<AgentEntity, 'name'> | null | undefined;
  operator?: { firstName?: string | null; lastName?: string | null } | null;
}): RelaySender {
  const agentName = resolveRelayAgentName(params.agent);
  const operatorName = buildRelayOwnerName(params.operator?.firstName, params.operator?.lastName);

  return {
    ...(agentName ? { agentName } : {}),
    ...(operatorName ? { operatorName } : {}),
  };
}
