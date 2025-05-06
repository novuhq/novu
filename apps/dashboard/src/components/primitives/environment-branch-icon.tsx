import { cn } from '@/utils/ui';
import { IEnvironment } from '@novu/shared';
import { cva } from 'class-variance-authority';
import { RiGitBranchLine } from 'react-icons/ri';

const logoVariants = cva('', {
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

const sizeConfig = {
  xs: {
    container: 'size-4',
    padding: 'p-0',
    icon: 'size-3',
  },
  sm: {
    container: 'size-5',
    padding: 'p-1',
    icon: 'size-3',
  },
  md: {
    container: 'size-6',
    padding: 'p-1',
    icon: 'size-4',
  },
} as const;

interface EnvironmentBranchIconProps {
  environment?: IEnvironment;
  className?: string;
  size?: keyof typeof sizeConfig;
  mode?: 'default' | 'ghost';
}

export function EnvironmentBranchIcon({
  environment,
  className,
  size = 'md',
  mode = 'default',
}: EnvironmentBranchIconProps) {
  const hasCustomColor = !!environment?.color;
  const isProduction = environment?.name?.toLowerCase() === 'production';
  const { container, padding, icon } = sizeConfig[size];

  return (
    <div
      style={
        hasCustomColor
          ? {
              backgroundColor: mode === 'default' ? `${environment.color}1A` : 'transparent',
              borderColor: environment.color,
              color: environment.color,
            }
          : undefined
      }
      className={cn(
        container,
        'flex items-center justify-center rounded-[6px] border-[1px] border-solid',
        size === 'xs' ? 'border-none' : 'border',
        padding,
        hasCustomColor
          ? 'border-opacity-100 bg-opacity-10'
          : logoVariants({ variant: isProduction ? 'production' : 'default' }),
        className,
        mode === 'ghost' ? 'bg-transparent' : ''
      )}
    >
      <RiGitBranchLine className={icon} />
    </div>
  );
}
