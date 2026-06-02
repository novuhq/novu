import { EmailProviderIdEnum, type IIntegration } from '@novu/shared';
import type { AgentIntegrationLink } from '@/api/agents';
import { ProviderCards } from './provider-cards';
import { SetupStep } from './setup-guide-primitives';
import { SharedInboundAddressField } from './shared-inbound-address-field';
import { deriveStepStatus } from './setup-guide-step-utils';

type AgentListenStepProps = {
  index: number;
  totalSteps: number;
  firstIncompleteStep: number;
  sharedInboundAddress: string;
  agentIdentifier: string;
  agentName: string;
  selectedIntegrationId?: string;
  selectedProviderId?: string;
  existingLinks: AgentIntegrationLink[];
  onSelect: (providerId: string, integration?: IIntegration) => void;
};

export function AgentListenStep({
  index,
  totalSteps,
  firstIncompleteStep,
  sharedInboundAddress,
  agentIdentifier,
  agentName,
  selectedIntegrationId,
  selectedProviderId,
  existingLinks,
  onSelect,
}: AgentListenStepProps) {
  const isEmailSelected =
    selectedProviderId === EmailProviderIdEnum.NovuAgent && Boolean(selectedIntegrationId);

  return (
    <SetupStep
      index={index}
      status={deriveStepStatus(index, firstIncompleteStep)}
      sectionLabel={`${index}/${totalSteps} SETUP WHERE TO LISTEN`}
      title="Choose where your agent listens and communicates"
      description="Start with one provider your agent can receive and respond on — you can add more later."
      fullWidthContent={
        <div className="flex w-full flex-col gap-4">
          <ProviderCards
            agentIdentifier={agentIdentifier}
            agentName={agentName}
            selectedIntegrationId={selectedIntegrationId}
            existingLinks={existingLinks}
            showCloudEmailCard
            onSelect={onSelect}
          />
          {isEmailSelected ? <SharedInboundAddressField sharedInboundAddress={sharedInboundAddress} /> : null}
        </div>
      }
    />
  );
}
