import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentChatSetupGuide } from '@/components/agents/agent-chat-setup-guide';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';

const AGENT_CHAT_DISPLAY_NAME = 'Agent Chat';

type AgentChatAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function AgentChatAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: AgentChatAgentIntegrationGuideProps) {
  const integrationId = integrationLink?.integration?._id;

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.NovuAgentChat}
      providerDisplayName={AGENT_CHAT_DISPLAY_NAME}
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      {integrationId ? (
        <AgentChatSetupGuide agent={agent} integrationId={integrationId} embedded />
      ) : (
        <p className="text-text-soft text-label-sm leading-5">Connect Agent Chat to see the embed snippet.</p>
      )}
    </AgentIntegrationGuideLayout>
  );
}
