import { providers } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { AgentIntegrationGuideLayout } from './agent-integration-guide-layout';
import { AgentIntegrationGuideSection } from './agent-integration-guide-section';

type GenericAgentIntegrationGuideProps = {
  providerId: string;
  onBack: () => void;
  embedded?: boolean;
  agent: AgentResponse;
  integrationLink?: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
};

export function GenericAgentIntegrationGuide({
  providerId,
  onBack,
  embedded = false,
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
}: GenericAgentIntegrationGuideProps) {
  const provider = providers.find((p) => p.id === providerId);

  const displayName = provider?.displayName ?? providerId;

  return (
    <AgentIntegrationGuideLayout
      providerId={providerId}
      providerDisplayName={displayName}
      onBack={onBack}
      embedded={embedded}
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
    >
      <AgentIntegrationGuideSection title="Get started">
        <p>
          Follow your provider&apos;s documentation to finish credentials and configuration for{' '}
          <span className="text-text-strong">{displayName}</span> in the integration store. This agent can use the
          linked integration once it is active.
        </p>
      </AgentIntegrationGuideSection>
    </AgentIntegrationGuideLayout>
  );
}
