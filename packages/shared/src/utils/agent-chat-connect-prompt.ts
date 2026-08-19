export const AGENT_CHAT_DOCS_URL = 'https://docs.novu.co/agents/channels/agent-chat';
export const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';
export const SUBSCRIBER_ID_PLACEHOLDER = 'YOUR_SUBSCRIBER_ID';

export function buildAgentChatPrompt(
  agentName: string,
  agentIdentifier: string,
  applicationIdentifier: string,
  subscriberId: string
): string {
  return `Add Novu Agent Chat to my app with useAgentChat from @novu/react so end users can chat with the "${agentName}" agent in-product.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" Agent Chat integration already exists (agent id: ${agentIdentifier}). This is purely a frontend code integration: do NOT run the Novu CLI, the agent-onboarding flow, or keyless mode.

Requirements:
- Install @novu/react with my project's package manager.
- Follow the Agent Chat docs: ${AGENT_CHAT_DOCS_URL}
- Render a production-quality chat UI (message list from message.parts, composer, tool approvals via respondToAction). Match my app's styling — do not dump raw JSON.
- Wrap that UI in <NovuProvider> configured for the currently signed-in end user.
- Use applicationIdentifier="${applicationIdentifier}". Store applicationIdentifier in an environment variable rather than hardcoding it.
- Pass the authenticated user's id as subscriberId: source it from my app's existing auth (Clerk, NextAuth, Firebase, Supabase, or custom). If no auth system exists yet, use "${subscriberId}" for a quick smoke test.
- If my app enables Novu subscriber HMAC, pass the matching subscriber hash into NovuProvider (same pattern as Inbox).
- Follow my app's existing framework, routing, styling, and TypeScript conventions, place the chat in a sensible spot in the UI, and add no unnecessary wrappers.`;
}

export function buildAgentChatEmbedPromptForAuth(input: {
  agentName: string;
  agentIdentifier: string;
  applicationIdentifier?: string | null;
  subscriberId?: string | null;
}): string {
  return buildAgentChatPrompt(
    input.agentName,
    input.agentIdentifier,
    input.applicationIdentifier?.trim() || APPLICATION_IDENTIFIER_PLACEHOLDER,
    input.subscriberId?.trim() || SUBSCRIBER_ID_PLACEHOLDER
  );
}
