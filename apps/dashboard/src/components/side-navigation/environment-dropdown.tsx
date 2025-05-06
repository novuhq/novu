import { IEnvironment } from '@novu/shared';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { cn } from '../../utils/ui';
import { EnvironmentBranchIcon } from '../primitives/environment-branch-icon';
import { Select, SelectContent, SelectIcon, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';

type EnvironmentDropdownProps = {
  currentEnvironment?: IEnvironment;
  data?: IEnvironment[];
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export const EnvironmentDropdown = ({
  currentEnvironment,
  data,
  onChange,
  className,
  disabled,
}: EnvironmentDropdownProps) => {
  return (
    <Select value={currentEnvironment?.name} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('group p-1.5 shadow-sm last:[&>svg]:hidden', className)}>
        <SelectValue asChild>
          <div className="flex items-center gap-2">
            <EnvironmentBranchIcon environment={currentEnvironment} />
            <span className="text-foreground text-sm">{currentEnvironment?.name}</span>
          </div>
        </SelectValue>
        <SelectIcon asChild>
          <RiExpandUpDownLine className="ml-auto size-4 opacity-0 transition duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100" />
        </SelectIcon>
      </SelectTrigger>
      <SelectContent>
        {data?.map((environment) => (
          <SelectItem key={environment.name} value={environment.name}>
            <div className="flex items-center gap-2">
              <EnvironmentBranchIcon size="sm" environment={environment} />
              <span>{environment.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
