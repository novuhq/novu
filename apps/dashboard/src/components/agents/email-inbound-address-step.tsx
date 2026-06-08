import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SharedInboundAddressField } from './shared-inbound-address-field';

type EmailInboundAddressStepProps = {
  index: number;
  totalSteps: number;
  firstIncompleteStep: number;
  sharedInboundAddress: string;
};

/**
 * Auto-completed setup step that surfaces the agent's Novu shared inbound
 * address (e.g. `wine-bot-2g3q4q4g@acme.inbound.novu.co`). The address is
 * provisioned at agent creation, so this step is always rendered as
 * `completed` and never participates in `firstIncompleteStep` resolution —
 * it exists purely to advertise the address before the user picks an
 * additional channel.
 */
export function EmailInboundAddressStep({
  index,
  totalSteps,
  firstIncompleteStep,
  sharedInboundAddress,
}: EmailInboundAddressStepProps) {
  return (
    <SetupStep
      index={index}
      status={deriveStepStatus(index, firstIncompleteStep)}
      sectionLabel={`${index}/${totalSteps} SETUP WHERE TO LISTEN`}
      title="Email address to talk to the agent"
      description="Unlike Slack or Telegram, email starts with you sending the first message. Your agent reads it and replies to the same inbox. Configure custom provider and custom domain later in settings."
      rightContent={<SharedInboundAddressField sharedInboundAddress={sharedInboundAddress} />}
    />
  );
}
