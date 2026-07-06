import { ChatProviderIdEnum } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';
import { AgentChannelWhatsNextGuide } from './whats-next/agent-channel-whats-next-guide';

const WEB_PROVIDER_LABEL = 'Web Chat';

type WebAgentIntegrationGuideProps = {
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

/**
 * The web channel has no credential setup — the integration is live the moment
 * it is created, and "connected" flips on the first message sent from the
 * customer's app. So the entire guide IS the developer what's-next flow: the
 * copy-paste `useConversation` snippet. Once the guide retires (a user
 * connected a while ago), the fallback section keeps the essentials reachable.
 */
export function WebAgentIntegrationGuide({
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: WebAgentIntegrationGuideProps) {
  const { currentEnvironment } = useEnvironment();

  return (
    <AgentIntegrationGuideLayout
      providerId={ChatProviderIdEnum.NovuWeb}
      providerDisplayName={WEB_PROVIDER_LABEL}
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      <AgentChannelWhatsNextGuide
        agent={agent}
        integrationLink={integrationLink}
        applicationIdentifier={currentEnvironment?.identifier}
      />
      <AgentIntegrationGuideSection title="How it works">
        <p>
          Your app talks to Novu directly — no webhooks or servers to run. Users authenticate with the same subscriber
          session as the Inbox (<span className="text-text-strong">applicationIdentifier</span> +{' '}
          <span className="text-text-strong">subscriberId</span>), and the{' '}
          <span className="text-text-strong">useConversation</span> hook from{' '}
          <span className="text-text-strong">@novu/react</span> handles history, live replies, typing state, and custom
          card actions for <span className="text-text-strong">{agent.name}</span>.
        </p>
      </AgentIntegrationGuideSection>
    </AgentIntegrationGuideLayout>
  );
}
