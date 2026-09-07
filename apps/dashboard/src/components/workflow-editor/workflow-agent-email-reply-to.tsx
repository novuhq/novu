import { RiExpandUpDownLine, RiInformation2Line } from 'react-icons/ri';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useWorkflowAgentInboundAddresses } from '@/components/workflow-editor/use-workflow-agent-inbound-addresses';
import { cn } from '@/utils/ui';

type WorkflowAgentEmailReplyToProps = {
  agentIdentifier: string;
  value: string | undefined;
  onChange: (replyTo: string) => void;
  disabled?: boolean;
};

export function WorkflowAgentEmailReplyTo({
  agentIdentifier,
  value,
  onChange,
  disabled,
}: WorkflowAgentEmailReplyToProps) {
  const { addresses, primaryAddress, isLoading } = useWorkflowAgentInboundAddresses(agentIdentifier);

  if (!isLoading && addresses.length === 0) {
    return null;
  }

  const selectedValue = value && addresses.includes(value) ? value : (primaryAddress ?? '');
  const isStale = Boolean(value) && !addresses.includes(value ?? '');

  return (
    <div className="border-stroke-soft flex flex-col gap-1.5 border-t border-b px-3 py-3">
      <div className="flex items-center">
        <span className="text-text-sub text-label-xs font-medium leading-4">Email Reply-to</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-text-soft inline-flex size-5 items-center justify-center">
              <RiInformation2Line className="size-3" />
              <span className="sr-only">About email reply-to</span>
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Replies to emails sent by this workflow are delivered to the selected agent inbox address. Other channels
            are unaffected.
          </TooltipContent>
        </Tooltip>
      </div>

      <Select value={selectedValue} onValueChange={onChange} disabled={disabled || isLoading || addresses.length === 0}>
        <SelectTrigger
          size="2xs"
          rightIcon={
            <span className="bg-bg-white text-text-soft relative z-10 flex! h-full w-7 shrink-0 items-center justify-center before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-stroke-soft">
              <RiExpandUpDownLine className="size-3" />
            </span>
          }
          className={cn(
            'bg-bg-weak border-stroke-soft text-text-sub shadow-xs relative w-full max-w-[400px] overflow-hidden rounded-md p-0 font-medium after:pointer-events-none after:absolute after:inset-y-0 after:right-7 after:w-11 after:bg-linear-to-r after:from-transparent after:to-bg-weak [&>span:first-child]:min-w-0 [&>span:first-child]:flex-1 [&>span:first-child]:truncate [&>span:first-child]:px-2',
            isStale && 'border-warning-base'
          )}
        >
          <SelectValue placeholder={isLoading ? 'Loading…' : 'Select reply-to address'} />
        </SelectTrigger>
        <SelectContent>
          {addresses.map((address) => (
            <SelectItem key={address} value={address} className="text-label-xs">
              {address}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isStale ? (
        <p className="text-warning-base text-label-2xs leading-4">
          The saved reply-to address is no longer available for this agent. Pick a valid address before publishing.
        </p>
      ) : null}
    </div>
  );
}
