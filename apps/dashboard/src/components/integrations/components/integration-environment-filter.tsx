import { EnvironmentTypeEnum, IEnvironment } from '@novu/shared';
import { RiArrowDownSLine } from 'react-icons/ri';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Separator } from '@/components/primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import TruncatedText from '@/components/truncated-text';
import { cn } from '@/utils/ui';

export const ALL_ENVIRONMENTS = 'all';

const MAX_STACKED_ENVIRONMENTS = 3;

type IntegrationEnvironmentFilterProps = {
  environments: IEnvironment[];
  /** An environment id, or `ALL_ENVIRONMENTS`. */
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function IntegrationEnvironmentFilter({
  environments,
  value,
  onChange,
  className,
}: IntegrationEnvironmentFilterProps) {
  const selectedEnvironment = environments.find((env) => env._id === value);
  const developmentEnvironments = environments.filter((env) => env.type === EnvironmentTypeEnum.DEV);
  const liveEnvironments = environments.filter((env) => env.type === EnvironmentTypeEnum.PROD);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn('bg-bg-white ring-stroke-soft h-8 w-auto gap-2 border-0 px-2 py-0 ring-1 ring-inset', className)}
        rightIcon={<RiArrowDownSLine className="text-text-sub size-4 shrink-0" />}
        aria-label="Filter integrations by environment"
      >
        <SelectValue asChild>
          {selectedEnvironment ? (
            <div className="flex items-center gap-2">
              <EnvironmentBranchIcon size="xs" environment={selectedEnvironment} />
              <TruncatedText className="text-text-sub text-label-sm max-w-[160px]">
                {selectedEnvironment.name}
              </TruncatedText>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <EnvironmentStack environments={environments} />
              <span className="text-text-sub text-label-sm">All environments</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL_ENVIRONMENTS}>
          <div className="flex items-center gap-2">
            <EnvironmentStack environments={environments} showTooltip={false} />
            <span>All environments</span>
          </div>
        </SelectItem>

        {developmentEnvironments.length > 0 && (
          <Separator variant="line-text" className="text-text-soft text-[11px] font-medium uppercase tracking-wider">
            Development Environments
          </Separator>
        )}
        {developmentEnvironments.map((environment) => (
          <EnvironmentOption key={environment._id} environment={environment} />
        ))}

        {liveEnvironments.length > 0 && (
          <Separator variant="line-text" className="text-text-soft text-[11px] font-medium uppercase tracking-wider">
            Live Environments
          </Separator>
        )}
        {liveEnvironments.map((environment) => (
          <EnvironmentOption key={environment._id} environment={environment} />
        ))}
      </SelectContent>
    </Select>
  );
}

function EnvironmentOption({ environment }: { environment: IEnvironment }) {
  return (
    <SelectItem value={environment._id}>
      <div className="flex items-center gap-2">
        <EnvironmentBranchIcon size="sm" environment={environment} />
        <TruncatedText className="max-w-[190px]">{environment.name}</TruncatedText>
      </div>
    </SelectItem>
  );
}

/**
 * Overlapping environment marks: up to three, then a +N pill. Hover reveals the names.
 */
export function EnvironmentStack({
  environments,
  showTooltip = true,
}: {
  environments: IEnvironment[];
  showTooltip?: boolean;
}) {
  const visible = environments.slice(0, MAX_STACKED_ENVIRONMENTS);
  const overflow = environments.length - visible.length;

  const stack = (
    <div className="flex items-center">
      {visible.map((environment) => (
        <div
          key={environment._id}
          className="bg-bg-white -mr-[5px] flex size-5 shrink-0 items-center justify-center rounded-[7px]"
        >
          <EnvironmentBranchIcon size="xs" environment={environment} className="rounded-[3px]" />
        </div>
      ))}
      {overflow > 0 && (
        <div className="bg-bg-white flex shrink-0 rounded-[7px] p-0.5">
          <div className="bg-bg-weak border-stroke-soft text-text-sub flex h-4 w-[22px] items-center justify-center rounded-[5px] border text-[10px] font-medium">
            +{overflow}
          </div>
        </div>
      )}
    </div>
  );

  if (!showTooltip) {
    return stack;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{stack}</TooltipTrigger>
      <TooltipContent>{environments.map((env) => env.name).join(', ')}</TooltipContent>
    </Tooltip>
  );
}
