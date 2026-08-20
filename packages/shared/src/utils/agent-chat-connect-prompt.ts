export const AGENT_CHAT_DOCS_URL = 'https://docs.novu.co/agents/channels/agent-chat';
export {
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  SUBSCRIBER_ID_PLACEHOLDER,
} from './connect-embed-prompt-constants';

/** Dashboard / legacy UI-only prompt (handler assumed done). */
export function buildAgentChatPrompt(
  agentName: string,
  agentIdentifier: string,
  applicationIdentifier: string,
  subscriberId: string
): string {
  return `Add Novu Agent Chat to my app with useAgentChat from @novu/react so end users can chat with the "${agentName}" agent in-product.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" Agent Chat integration is linked (agent id: ${agentIdentifier}). npx novu connect already wrote the Novu env vars into my project — do NOT run the Novu CLI, the agent onboarding flow, or keyless mode.

Docs (follow this integration guide): ${AGENT_CHAT_DOCS_URL}/quickstart.md

Environment (already in .env.local when present — read from process.env, do not hardcode):
- NEXT_PUBLIC_NOVU_APP_ID
- NEXT_PUBLIC_NOVU_SUBSCRIBER_ID (use "${subscriberId}" only for a smoke test if my app has no auth yet)
- NEXT_PUBLIC_NOVU_AGENT_ID
- NEXT_PUBLIC_NOVU_BACKEND_URL (only if set — omit apiUrl on NovuProvider for US Cloud)
- NEXT_PUBLIC_NOVU_SOCKET_URL (only if set — required for EU, staging, and local dev)

Requirements:
- Install @novu/react with my project's package manager.
- Wrap the chat UI in <NovuProvider> with applicationIdentifier, subscriberId, apiUrl, and socketUrl from the env vars above.
- Use useAgentChat({ agentId: process.env.NEXT_PUBLIC_NOVU_AGENT_ID }) and render message.parts, a composer, and tool approvals via respondToAction.
- Match my app's existing framework, routing, styling, and TypeScript conventions. Place the chat where it fits my product — do not copy a generic template wholesale.
- If my app enables Novu subscriber HMAC, pass the matching subscriber hash into NovuProvider (same pattern as Inbox).`;
}

export { buildAgentChatEmbedPromptForAuth } from './connect-embed-prompt';
