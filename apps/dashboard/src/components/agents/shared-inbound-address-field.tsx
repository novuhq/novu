import { RiInformation2Line } from 'react-icons/ri';
import { CopyableEmailAddress } from '@/components/agents/copyable-email-address';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';

type SharedInboundAddressFieldProps = {
  sharedInboundAddress: string;
};

export function SharedInboundAddressField({ sharedInboundAddress }: SharedInboundAddressFieldProps) {
  return (
    <div className="flex w-fit max-w-full flex-col gap-1.5">
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

      <CopyableEmailAddress email={sharedInboundAddress} />

      <p className="text-text-soft text-paragraph-xs flex items-start gap-1 leading-4">
        <RiInformation2Line className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>Custom domain and providers can be setup later.</span>
      </p>
    </div>
  );
}
