import { RiInformation2Line } from 'react-icons/ri';
import { CopyButton } from '@/components/primitives/copy-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

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
      description="Your agent is reachable via the email address, to receive and send emails. Configure custom provider and custom domain later in settings."
      rightContent={
        <div className="flex w-full flex-col gap-1.5">
          <div className="text-text-strong text-label-xs flex items-center gap-1 font-medium leading-4">
            <span>Agent email address</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="More info" className="inline-flex">
                  <RiInformation2Line className="text-text-soft size-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Inbound mail sent to this address is delivered to this agent.
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="border-stroke-soft bg-bg-white flex h-8 items-center overflow-hidden rounded-lg border shadow-xs">
            <span className="text-text-soft flex h-full items-center pl-2 pr-1 text-paragraph-xs font-mono leading-4">
              @
            </span>
            <span className="text-text-sub text-paragraph-xs min-w-0 flex-1 truncate font-mono leading-4">
              {sharedInboundAddress}
            </span>
            <CopyButton
              size="2xs"
              valueToCopy={sharedInboundAddress}
              className="border-stroke-soft h-full w-8 shrink-0 justify-center border-l"
            />
          </div>

          <p className="text-text-soft text-paragraph-xs flex items-start gap-1 leading-4">
            <RiInformation2Line className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>Custom domain and providers can be setup later.</span>
          </p>
        </div>
      }
    />
  );
}
