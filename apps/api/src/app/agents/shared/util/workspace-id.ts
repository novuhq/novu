import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { extractMsTeamsTenantId } from './msteams-activity';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Extracts the Slack workspace/team id from a raw platform payload. Slack carries it in a few
 * shapes depending on the event kind, so we check each in turn:
 *  - message / event-callback: top-level `team_id`, or `event.team`
 *  - `block_actions` (button clicks): `team.id` (object), with `user.team_id` as a fallback
 *
 * The team id identifies the workspace a `ChannelConnection` was created for at connect time.
 */
export function extractSlackTeamId(rawEvent: unknown): string | null {
  const raw = asRecord(rawEvent);

  if (!raw) {
    return null;
  }

  return (
    asNonEmptyString(raw.team_id) ??
    asNonEmptyString(asRecord(raw.team)?.id) ??
    asNonEmptyString(raw.team) ??
    asNonEmptyString(asRecord(raw.event)?.team) ??
    asNonEmptyString(asRecord(raw.user)?.team_id)
  );
}

/**
 * Pulls the platform-native workspace/tenant id out of a raw inbound payload — the value a
 * `ChannelConnection.workspace.id` was keyed by at connect time.
 *
 * Only multi-workspace platforms appear here: one Novu-hosted app/bot is installed across many
 * customer workspaces (Slack) or Azure AD tenants (Teams). Single-tenant platforms with no
 * workspace identity (Telegram, WhatsApp, inbound email) are absent and resolve to `null`.
 */
export const WORKSPACE_ID_EXTRACTORS: Partial<Record<AgentPlatformEnum, (rawEvent: unknown) => string | null>> = {
  [AgentPlatformEnum.SLACK]: extractSlackTeamId,
  [AgentPlatformEnum.TEAMS]: (rawEvent) => extractMsTeamsTenantId(rawEvent) ?? null,
};

/**
 * Resolve the workspace/tenant id for a platform+payload, or `null` when the platform has no
 * workspace identity or the id is absent from the payload.
 */
export function extractWorkspaceId(platform: AgentPlatformEnum, rawEvent: unknown): string | null {
  return WORKSPACE_ID_EXTRACTORS[platform]?.(rawEvent) ?? null;
}
