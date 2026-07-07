import { EnvironmentTypeEnum, IEnvironment } from '@novu/shared';
import { useState } from 'react';
import { RiExpandUpDownLine, RiTerminalFill } from 'react-icons/ri';
import TruncatedText from '../../components/truncated-text';
import { cn } from '../../utils/ui';
import { ConnectionStatus } from '../../utils/types';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Select, SelectContent, SelectIcon, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { Separator } from '../primitives/separator';

/**
 * Sentinel select-value for the Local pseudo-environment entry. The Select is
 * keyed by environment *name*, so a user environment literally named "Local"
 * must not collide with this entry.
 */
export const LOCAL_ENVIRONMENT_VALUE = '__local__';

type LocalEnvironmentEntry = {
  status: ConnectionStatus;
};

type EnvironmentDropdownProps = {
  currentEnvironment?: IEnvironment;
  data?: IEnvironment[];
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  /** When set, a pinned "Local" entry is rendered above the dev environments. */
  localEntry?: LocalEnvironmentEntry;
  /** Whether the Local pseudo-environment is the active selection. */
  isLocalSelected?: boolean;
};

/**
 * Mirrors `EnvironmentBranchIcon`'s rounded-square badge so the Local entry
 * reads as a sibling of the real environments; the badge color doubles as
 * the bridge connection status.
 */
const LocalEnvironmentIcon = ({ status, size = 'sm' }: { status: ConnectionStatus; size?: 'sm' | 'md' }) => (
  <div
    className={cn(
      'flex shrink-0 items-center justify-center rounded-[6px] border border-solid p-1',
      size === 'md' ? 'size-6' : 'size-5',
      {
        'bg-success/10 border-success text-success': status === ConnectionStatus.CONNECTED,
        'bg-warning/10 border-warning text-warning': status === ConnectionStatus.LOADING,
        'bg-neutral-alpha-100 border-neutral-alpha-400 text-neutral-400': status === ConnectionStatus.DISCONNECTED,
      }
    )}
  >
    <RiTerminalFill className={size === 'md' ? 'size-4' : 'size-3'} />
  </div>
);

const LocalEntryContent = ({ status, size = 'sm' }: { status: ConnectionStatus; size?: 'sm' | 'md' }) => (
  <div className="flex items-center gap-2">
    <LocalEnvironmentIcon status={status} size={size} />
    <TruncatedText className={cn('max-w-[190px]', size === 'md' ? 'text-foreground text-sm' : '')}>
      Local
    </TruncatedText>
  </div>
);

export const EnvironmentDropdown = ({
  currentEnvironment,
  data,
  onChange,
  className,
  disabled,
  localEntry,
  isLocalSelected,
}: EnvironmentDropdownProps) => {
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const developmentEnvironments = data?.filter((env) => env.type === EnvironmentTypeEnum.DEV) || [];
  const liveEnvironments = data?.filter((env) => env.type === EnvironmentTypeEnum.PROD) || [];

  return (
    <>
      <Select
        value={isLocalSelected ? LOCAL_ENVIRONMENT_VALUE : currentEnvironment?.name}
        onValueChange={onChange}
        disabled={disabled}
        open={isSelectOpen}
        onOpenChange={setIsSelectOpen}
      >
        <SelectTrigger className={cn('group p-1.5 shadow-sm [&>svg]:last:hidden', className)}>
          <SelectValue asChild>
            {isLocalSelected && localEntry ? (
              <LocalEntryContent status={localEntry.status} size="md" />
            ) : (
              <div className="flex items-center gap-2">
                <EnvironmentBranchIcon environment={currentEnvironment} />
                <TruncatedText className="text-foreground max-w-[190px] text-sm">
                  {currentEnvironment?.name}
                </TruncatedText>
              </div>
            )}
          </SelectValue>
          <SelectIcon asChild>
            <RiExpandUpDownLine className="ml-auto size-4 opacity-0 transition duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100" />
          </SelectIcon>
        </SelectTrigger>
        <SelectContent>
          {localEntry && (
            <SelectItem value={LOCAL_ENVIRONMENT_VALUE}>
              <LocalEntryContent status={localEntry.status} />
            </SelectItem>
          )}

          {developmentEnvironments.map((environment) => (
            <SelectItem key={environment.name} value={environment.name}>
              <div className="flex items-center gap-2">
                <EnvironmentBranchIcon size="sm" environment={environment} />
                <TruncatedText className="max-w-[190px]">{environment.name}</TruncatedText>
              </div>
            </SelectItem>
          ))}

          {liveEnvironments.length > 0 && (
            <>
              <Separator
                variant="line-text"
                className="text-text-soft text-[11px] font-medium uppercase tracking-wider"
              >
                Live Environments
              </Separator>
              {liveEnvironments.map((environment) => (
                <SelectItem key={environment.name} value={environment.name}>
                  <div className="flex items-center gap-2">
                    <EnvironmentBranchIcon size="sm" environment={environment} />
                    <TruncatedText className="max-w-[190px]">{environment.name}</TruncatedText>
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </>
  );
};
