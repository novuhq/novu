import {
  buildNovuConnectStagingHint,
  getNovuConnectInvocation,
  getNovuConnectTargetFlags,
  isNovuStagingApiUrl,
} from './novu-connect-cli';

export const AGENT_CHAT_DOCS_URL = 'https://docs.novu.co/agents/channels/agent-chat';
export const AGENT_ONBOARDING_PLAYBOOK_URL = 'https://novu.co/agents.md';

export function buildAgentChatTuiCommand(apiUrl?: string | null): string {
  const parts = [`${getNovuConnectInvocation(apiUrl)} --channel agent-chat`, ...getNovuConnectTargetFlags(apiUrl)];

  return parts.join(' ');
}

/** Production TUI command. Prefer `buildAgentChatTuiCommand(apiUrl)` in the dashboard. */
export const NOVU_CONNECT_AGENT_CHAT_TUI_COMMAND = buildAgentChatTuiCommand();

export {
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  SUBSCRIBER_ID_PLACEHOLDER,
} from './connect-embed-prompt-constants';

function signedInDashboardLine(apiUrl?: string | null): string {
  if (isNovuStagingApiUrl(apiUrl)) {
    return `I'm signed in to the Novu staging dashboard, so use dashboard login (not keyless mode).`;
  }

  return `I'm signed in to the Novu dashboard, so use dashboard login (not keyless mode).`;
}

/**
 * Dashboard Copy prompt / Open in Cursor text. Same shape as the onboarding
 * prompt: signed-in line + intent + agents.md. The playbook owns `--ci`,
 * questions, and flags. Staging adds `novu@rc` + `--region staging`.
 */
export function buildAgentChatPrompt(agentName: string, agentIdentifier: string, apiUrl?: string | null): string {
  const lines = [
    `${signedInDashboardLine(apiUrl)} Add Agent Chat to my app following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}`,
    buildNovuConnectStagingHint(apiUrl),
    `The dashboard already has "${agentName}" (id: ${agentIdentifier}) with Agent Chat linked for preview.`,
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n\n');
}

export function buildOnboardingAgentPrompt(apiUrl?: string | null): string {
  const lines = [
    `${signedInDashboardLine(apiUrl)} Add Agent Chat to my app following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}`,
    buildNovuConnectStagingHint(apiUrl),
  ].filter((line): line is string => Boolean(line));

  return lines.join('\n\n');
}

export { buildAgentChatEmbedPromptForAuth } from './connect-embed-prompt';
