import { CredentialExpiredError, McpServerError } from '@novu/thalamus';

/**
 * User-facing copy and detectors for managed-agent turn failures that must
 * reach Slack/email/etc. instead of silently aborting the inbound turn.
 *
 * Errors that cross the Thalamus observer webhook boundary arrive as plain
 * `{ message, name }` objects (JSON-serialized), so detectors must match on
 * message text rather than `instanceof`.
 */

export const MISSING_READ_TOOL_FOR_SKILLS_REPLY =
  'This agent has skills enabled but the **Read** tool is disabled. ' +
  'Enable the Read tool in the agent settings, then send your message again.';

/**
 * Anthropic Managed Agents reject sessions/agents when skills are attached
 * without a usable `read` builtin on `agent_toolset`:
 *   "Missing required tool: skills require the read tool to be usable
 *    (enabled and not always_deny) on the session's `agent_toolset`"
 */
export function isMissingReadToolForSkillsError(err: unknown): boolean {
  const message = extractErrorMessage(err);

  if (!message) {
    return false;
  }

  return /skills require the read tool/i.test(message);
}

export function extractErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) {
    return err.message;
  }

  // Errors that cross the webhook boundary are JSON-serialized and arrive as
  // plain objects, so `instanceof Error` is false — read `message` directly.
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;

    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
}

export function parseMcpInitFailureServerName(err: unknown): string | undefined {
  const message = extractErrorMessage(err);

  if (!message) {
    return undefined;
  }

  const mcpInitMatch = message.match(/MCP server ['"]([^'"]+)['"] initialize failed/i);

  return mcpInitMatch?.[1];
}

export function buildMcpInitFailureMessage(serverName: string): string {
  return (
    `I couldn't connect to the **${serverName}** MCP server yet. ` +
    `Use Connect to authorize ${serverName}, then send your message again.`
  );
}

export function buildErrorMessage(err: unknown): string {
  if (err instanceof CredentialExpiredError) {
    return `Agent error: Credentials for "${err.serverName}" have expired. Please update them in your integration settings.`;
  }
  if (err instanceof McpServerError) {
    return `Agent error: MCP server "${err.serverName}" is unavailable (${err.statusCode ?? 'unknown status'}).`;
  }

  if (isMissingReadToolForSkillsError(err)) {
    return MISSING_READ_TOOL_FOR_SKILLS_REPLY;
  }

  const failedMcpServerName = parseMcpInitFailureServerName(err);

  if (failedMcpServerName) {
    return buildMcpInitFailureMessage(failedMcpServerName);
  }

  return 'The agent is temporarily unavailable. Please try again later.';
}
