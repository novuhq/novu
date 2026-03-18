import { RiInformation2Line } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ExternalLink } from '@/components/shared/external-link';

export function NovuSignatureHeader() {
  return (
    <div className="flex cursor-default items-center gap-1">
      <div className="bg-bg-white flex h-7 w-[200px] flex-shrink-0 items-center rounded-md border border-neutral-100 px-2">
        <span className="text-text-sub select-none text-xs">novu-signature</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-foreground-400 ml-1 inline-flex hover:cursor-help">
              <RiInformation2Line className="size-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            HMAC signature header automatically included with every request for secure communication.{' '}
            <ExternalLink href="https://docs.novu.co/framework/deployment/production" target="_blank">
              Learn more
            </ExternalLink>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="bg-bg-white flex h-7 min-w-0 flex-1 items-center rounded-md border border-neutral-100 px-2">
        <span className="text-text-soft select-none text-xs italic">&lt;calculated when request is sent&gt;</span>
      </div>
      <div className="ml-0! h-7 w-7 flex-shrink-0" />
    </div>
  );
}
