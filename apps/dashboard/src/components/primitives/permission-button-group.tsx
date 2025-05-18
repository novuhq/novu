import { ReactNode } from 'react';
import { PermissionsEnum } from '@novu/shared';
import { useAuth } from '@/context/auth/hooks';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface PermissionButtonGroupProps {
  /** The permission required to access this functionality */
  permission: PermissionsEnum;
  /** The content to render when the user has permission */
  children: ReactNode;
  /** The fallback UI to show when permission is denied */
  disabledFallback: ReactNode;
  /** Custom tooltip content to show when permission is denied */
  tooltipContent?: ReactNode;
  /** Custom permission check function */
  permissionCheck?: () => boolean;
}

export const PermissionButtonGroup = ({
  permission,
  children,
  disabledFallback,
  tooltipContent,
  permissionCheck,
}: PermissionButtonGroupProps) => {
  const { has } = useAuth();

  const defaultPermissionCheck = () => has?.({ permission }) ?? false;
  const canPerformAction = permissionCheck ? permissionCheck() : defaultPermissionCheck();

  const defaultTooltipContent = (
    <>
      Almost there! Your role just doesn't have permission for this one.{' '}
      <a href="https://docs.novu.co/" target="_blank" className="underline">
        Learn More ↗
      </a>
    </>
  );

  if (!canPerformAction) {
    return (
      <Tooltip>
        <TooltipTrigger>{disabledFallback}</TooltipTrigger>
        <TooltipContent>{tooltipContent || defaultTooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  return <>{children}</>;
};
