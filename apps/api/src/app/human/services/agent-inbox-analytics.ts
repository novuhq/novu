import type { AnalyticsService } from '@novu/application-generic';
import type { EnvironmentRepository } from '@novu/dal';
import { AGENT_INBOX_EVENTS, type AgentAnalyticsSource, isAgentAnalyticsSource } from '@novu/shared';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';

/**
 * Whose event it is: the person who owns the agent, by the id of the hidden Novu user behind their Agent Inbox
 * account. A request made with the account's key carries that user, so it is the owner even when the agent
 * made the request. The dashboard identifies the operator with the same id, so both land on one profile.
 */
export type AgentInboxOwner = { userId: string; organizationId: string };

/**
 * The owner of an Agent Inbox environment, for events that come without a session, such as a chat linked from
 * Telegram or Slack: the user the environment has its key from, the same user every request with that key
 * carries. Null for a setup made without an account.
 */
export async function findAgentInboxOwner(
  environmentRepository: EnvironmentRepository,
  scope: { environmentId: string; organizationId: string }
): Promise<AgentInboxOwner | null> {
  if (isKeylessOrganization(scope.organizationId)) {
    return null;
  }

  const environment = await environmentRepository.findOne(
    { _id: scope.environmentId, _organizationId: scope.organizationId },
    ['apiKeys']
  );
  const userId = environment?.apiKeys?.[0]?._userId;

  return userId ? { userId: String(userId), organizationId: scope.organizationId } : null;
}

/** The app a request came from, by its `Novu-Analytics-Source` header: `cli`, `mcp` or `dashboard`. */
export function readAnalyticsSource(header: unknown): AgentAnalyticsSource | undefined {
  return isAgentAnalyticsSource(header) ? header : undefined;
}

/** A new Agent Inbox account: its backing organization was just set up. */
export function trackAgentInboxSignedUp(analytics: AnalyticsService, owner: AgentInboxOwner): void {
  track(analytics, AGENT_INBOX_EVENTS.SIGNED_UP, owner);
}

/** The agent got its inbox and address. A setup claimed into an account was made in the CLI. */
export function trackAgentInboxCreated(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; source?: AgentAnalyticsSource }
): void {
  track(analytics, AGENT_INBOX_EVENTS.INBOX_CREATED, owner, {
    agentId: params.agentId,
    source: params.source ?? 'api',
  });
}

/** Email, Telegram or Slack was set up for the agent. */
export function trackAgentInboxChannelConnected(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; channel: string }
): void {
  track(analytics, AGENT_INBOX_EVENTS.CHANNEL_CONNECTED, owner, { agentId: params.agentId, channel: params.channel });
}

/** An invite link was made for a contact. */
export function trackAgentInboxContactInvited(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; source?: AgentAnalyticsSource }
): void {
  track(analytics, AGENT_INBOX_EVENTS.CONTACT_INVITED, owner, {
    agentId: params.agentId,
    source: params.source ?? 'api',
  });
}

/** The invited person picked a channel on the invite page and started connecting it. */
export function trackAgentInboxInviteAccepted(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; channel: string }
): void {
  track(analytics, AGENT_INBOX_EVENTS.INVITE_ACCEPTED, owner, { agentId: params.agentId, channel: params.channel });
}

/** The agent sent a message to one person or thread: a new one or a reply, and asking or only telling. */
export function trackAgentInboxMessageSent(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; type: string; channel: string; source?: AgentAnalyticsSource }
): void {
  track(analytics, AGENT_INBOX_EVENTS.MESSAGE_SENT, owner, {
    agentId: params.agentId,
    type: params.type,
    channel: params.channel,
    source: params.source ?? 'api',
  });
}

/** The agent listed its inbox. The operator doing so on the dashboard isn't the agent, so it doesn't count. */
export function trackAgentInboxListed(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; source?: AgentAnalyticsSource }
): void {
  if (isAgentReading(params.source)) {
    track(analytics, AGENT_INBOX_EVENTS.INBOX_LISTED, owner, {
      agentId: params.agentId,
      source: params.source ?? 'api',
    });
  }
}

/** The agent opened one thread of its inbox. The operator doing so on the dashboard doesn't count either. */
export function trackAgentInboxItemRead(
  analytics: AnalyticsService,
  owner: AgentInboxOwner,
  params: { agentId: string; source?: AgentAnalyticsSource }
): void {
  if (isAgentReading(params.source)) {
    track(analytics, AGENT_INBOX_EVENTS.INBOX_ITEM_READ, owner, {
      agentId: params.agentId,
      source: params.source ?? 'api',
    });
  }
}

/**
 * The dashboard reads the inbox for the operator, and checks an open thread every few seconds. That is not the
 * agent reading, and the operator's visits count as page views already, so only the other apps count here.
 */
function isAgentReading(source: AgentAnalyticsSource | undefined): boolean {
  return source !== 'dashboard';
}

/**
 * A setup made without an account belongs to nobody yet, so it sends nothing; claiming it into an account
 * counts its inbox and channels then. Sending never waits for Mixpanel and never fails the request.
 */
function track(
  analytics: AnalyticsService,
  event: string,
  owner: AgentInboxOwner,
  properties: Record<string, unknown> = {}
): void {
  if (!owner.userId || isKeylessOrganization(owner.organizationId)) {
    return;
  }

  analytics.track(event, owner.userId, { _organization: owner.organizationId, ...properties });
}
