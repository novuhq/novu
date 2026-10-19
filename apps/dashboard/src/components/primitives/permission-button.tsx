import { PermissionsEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { Button, ButtonProps } from '@/components/primitives/button';
import { useHasPermission } from '@/hooks/use-has-permission';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface PermissionButtonProps extends ButtonProps {
  /** The permission required to access this button functionality */
  permission: PermissionsEnum;
  /** Custom tooltip content to show when permission is denied (defaults to standard message) */
  tooltipContent?: ReactNode;
  /** Custom disabled button to show when permission is denied */
  disabledButton?: ReactNode;
  /** Custom permission check function (optional override for the default check) */
  permissionCheck?: () => boolean;
}

export const PermissionButton = ({
  permission,
  tooltipContent,
  children,
  disabledButton,
  permissionCheck,
  mode,
  asChild,
  ...buttonProps
}: PermissionButtonProps) => {
  const has = useHasPermission();

  const defaultPermissionCheck = () => has({ permission });
  const canPerformAction = permissionCheck ? permissionCheck() : defaultPermissionCheck();

  const defaultTooltipContent = (
    <>
      Almost there! Your role just doesn't have permission for this one.{' '}
      <a
        href="https://docs.novu.co/platform/account/roles-and-permissions"
        target="_blank"
        className="underline"
        rel="noopener"
      >
        Learn More ↗
      </a>
    </>
  );

  if (!canPerformAction) {
    if (disabledButton) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{disabledButton}</TooltipTrigger>
          <TooltipContent>{tooltipContent || defaultTooltipContent}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild={asChild}>
          <Button disabled {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent || defaultTooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button mode={mode} asChild={asChild} {...buttonProps}>
      {children}
    </Button>
  );
};
