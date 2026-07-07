import { EnvironmentTypeEnum, IEnvironment } from '@novu/shared';
import { useState } from 'react';
import { RiExpandUpDownLine, RiTerminalBoxLine } from 'react-icons/ri';
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

const LocalStatusDot = ({ status }: { status: ConnectionStatus }) => (
  <span
    className={cn('inline-block size-1.5 shrink-0 rounded-full', {
      'bg-success': status === ConnectionStatus.CONNECTED,
      'bg-warning': status === ConnectionStatus.LOADING,
      'bg-destructive': status === ConnectionStatus.DISCONNECTED,
    })}
  />
);

const LocalEntryContent = ({ status }: { status: ConnectionStatus }) => (
  <div className="flex items-center gap-2">
    <RiTerminalBoxLine className="size-4 shrink-0" />
    <TruncatedText className="max-w-[190px]">Local</TruncatedText>
    <LocalStatusDot status={status} />
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
              <LocalEntryContent status={localEntry.status} />
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
