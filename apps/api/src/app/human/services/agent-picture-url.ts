import type { AgentEntity, AgentLook } from '@novu/dal';
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

/** The part of a look a mascot is drawn from. */
export type MascotLook = Pick<AgentLook, 'shape' | 'color'>;

/**
 * The picture of the mascot in this look, as a channel shows it. The Agent Inbox dashboard draws one for every
 * shape and colour: a PNG for an email and a Slack app, a JPEG for a Telegram bot, which takes nothing else.
 */
export function mascotPictureUrl(look: MascotLook, format: 'png' | 'jpg' = 'png'): string {
  return `${resolveHumanDashboardBaseUrl()}/brand/mascot/${look.shape}-${look.color}.${format}`;
}

/**
 * The picture an email, its confirmation page or a new Slack app shows. An agent with no picture of its own gets
 * its mascot in `look`, the look its mascots show (`AgentInboxFeaturesService.mascotLookOf`), and without one the
 * default picture, the mascot as it always was.
 */
export function agentPictureOrDefaultUrl(
  agent: Pick<AgentEntity, '_id' | '_environmentId' | 'picture'>,
  look?: MascotLook | null
): string {
  return (
    agentPictureUrl(agent) ??
    (look ? mascotPictureUrl(look) : `${resolveHumanDashboardBaseUrl()}/brand/agent-avatar.png`)
  );
}
