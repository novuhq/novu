export {
  AGENT_CHAT_DOCS_URL,
  APPLICATION_IDENTIFIER_PLACEHOLDER,
  buildAgentChatPrompt,
  SUBSCRIBER_ID_PLACEHOLDER,
} from '@novu/shared';

import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { ExternalLink } from '@/components/shared/external-link';
import { AGENT_CHAT_DOCS_URL } from '@novu/shared';

export function AgentChatEmbedResources({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col gap-3 pt-3">
      <PrebuiltPromptBanner
        prompt={prompt}
        source="agent-channel-setup-agent-chat"
        message="Use this prompt to add Agent Chat with your app's styling."
      />
      <ExternalLink href={AGENT_CHAT_DOCS_URL} variant="documentation">
        Agent Chat docs
      </ExternalLink>
    </div>
  );
}
