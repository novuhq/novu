import { ComponentPropsWithoutRef } from 'react';
import { IconType } from 'react-icons';
import { cn } from '../../utils/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export type IconButtonSize = '2xs' | 'xs';

type IconButtonProps = ComponentPropsWithoutRef<'button'> & {
  icon: IconType;
  tooltip?: string;
  size?: IconButtonSize;
};

const PADDING_CLASS_BY_SIZE: Record<IconButtonSize, string> = {
  '2xs': 'p-0',
  xs: 'p-1',
};

/**
 * Small icon-only action button styled to match {@link CopyButton}. Used for the
 * add/edit/delete affordances so all row actions share a single source of truth.
 */
export const IconButton = (props: IconButtonProps) => {
  const { className, size, tooltip, icon: Icon, type = 'button', ...rest } = props;
  const paddingClass = size === undefined ? 'p-2.5' : PADDING_CLASS_BY_SIZE[size];

  const button = (
    <button
      type={type}
      className={cn(
        'cursor-pointer inline-flex select-none items-center justify-center whitespace-nowrap outline-hidden',
        paddingClass,
        'text-text-sub transition duration-200 ease-out hover:bg-bg-weak',
        className
      )}
      {...rest}
    >
      <Icon className="size-3.5" />
    </button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent className="px-2 py-1 text-xs" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};
