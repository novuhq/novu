export const AGENT_CHAT_DOCS_URL = 'https://docs.novu.co/agents/channels/agent-chat';
export const AGENT_ONBOARDING_PLAYBOOK_URL = 'https://novu.co/agents.md';
/** Interactive TUI — pick the existing dashboard agent, then embed or scaffold. */
export const NOVU_CONNECT_AGENT_CHAT_TUI_COMMAND = 'npx novu@latest connect --channel agent-chat';

export {
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  SUBSCRIBER_ID_PLACEHOLDER,
} from './connect-embed-prompt-constants';

/**
 * Dashboard Copy prompt / Open in Cursor text. Same shape as the onboarding
 * `PREBUILT_AGENT_PROMPT`: signed-in line + intent + agents.md. The playbook
 * owns `--ci`, questions, and flags.
 */
export function buildAgentChatPrompt(agentName: string, agentIdentifier: string): string {
  return `I'm signed in to the Novu dashboard, so use dashboard login (not keyless mode). Add Agent Chat to my app following instructions from this markdown file: ${AGENT_ONBOARDING_PLAYBOOK_URL}

The dashboard already has "${agentName}" (id: ${agentIdentifier}) with Agent Chat linked for preview.`;
}

export { buildAgentChatEmbedPromptForAuth } from './connect-embed-prompt';
