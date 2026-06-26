import { type IIntegration } from '@novu/shared';
import type { AgentIntegrationLink } from '@/api/agents';
import { ProviderCards } from './provider-cards';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentListenStepProps = {
  index: number;
  totalSteps: number;
  firstIncompleteStep: number;
  agentIdentifier: string;
  agentName: string;
  selectedIntegrationId?: string;
  existingLinks: AgentIntegrationLink[];
  onSelect: (providerId: string, integration?: IIntegration) => void;
};

export function AgentListenStep({
  index,
  totalSteps,
  firstIncompleteStep,
  agentIdentifier,
  agentName,
  selectedIntegrationId,
  existingLinks,
  onSelect,
}: AgentListenStepProps) {
  return (
    <SetupStep
      index={index}
      status={deriveStepStatus(index, firstIncompleteStep)}
      sectionLabel={`${index}/${totalSteps} SETUP WHERE TO LISTEN`}
      title="Choose where your agent listens and communicates"
      description="Start with one provider your agent can receive and respond on — you can add more later."
      fullWidthContent={
        <ProviderCards
          agentIdentifier={agentIdentifier}
          agentName={agentName}
          selectedIntegrationId={selectedIntegrationId}
          existingLinks={existingLinks}
          onSelect={onSelect}
        />
      }
    />
  );
}
