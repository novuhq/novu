export {
  AGENT_CHAT_DOCS_URL,
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildAgentChatPrompt,
  NOVU_CONNECT_AGENT_CHAT_TUI_COMMAND,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@novu/shared';

import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';

export function AgentChatEmbedResources({ prompt }: { prompt: string }) {
  return <PrebuiltPromptBanner prompt={prompt} source="agent-channel-setup-agent-chat" layout="actions" />;
}
