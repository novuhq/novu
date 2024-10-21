import { cva } from 'class-variance-authority';
import { RiExpandUpDownLine, RiGitBranchLine } from 'react-icons/ri';
import { Select, SelectContent, SelectIcon, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';

const logoVariants = cva(`size-6 rounded-[6px] border-[1px] border-solid p-1 `, {
  variants: {
    variant: {
      default: 'bg-warning/10 border-warning text-warning',
      production: 'bg-feature/10 border-feature text-feature',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

type EnvironmentDropdownProps = {
  value?: string;
  data?: string[];
  onChange?: (value: string) => void;
};

export const EnvironmentDropdown = ({ value, data, onChange }: EnvironmentDropdownProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="group p-1.5 shadow-sm last:[&>svg]:hidden">
        <SelectValue asChild>
          <div className="flex items-center gap-2">
            <div
              className={logoVariants({
                variant: value?.toLocaleLowerCase() === 'production' ? 'production' : 'default',
              })}
            >
              <RiGitBranchLine className="size-4" />
            </div>
            <span className="text-foreground text-sm">{value}</span>
          </div>
        </SelectValue>
        <SelectIcon asChild>
          <RiExpandUpDownLine className="ml-auto size-4 opacity-0 transition duration-300 ease-out group-focus-within:opacity-100 group-hover:opacity-100" />
        </SelectIcon>
      </SelectTrigger>
      <SelectContent>
        {data?.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
