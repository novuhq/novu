import { PermissionsEnum } from '@novu/shared';
import { Switch } from '@/components/primitives/switch';
import { useHasPermission } from '@/hooks/use-has-permission';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export interface PermissionSwitchProps {
  /** The permission required to access this switch functionality */
  permission: PermissionsEnum;
  /** Function called when switch value changes (only called when permission allows) */
  onCheckedChange?: (checked: boolean) => void;
  /** Whether the switch is checked */
  checked?: boolean;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Switch ID */
  id?: string;
}

export const PermissionSwitch = ({ permission, onCheckedChange, ...switchProps }: PermissionSwitchProps) => {
  const has = useHasPermission();
  const canPerformAction = has({ permission });

  if (!canPerformAction) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Switch {...switchProps} disabled />
        </TooltipTrigger>
        <TooltipContent>
          Almost there! Your role just doesn't have permission for this one.{' '}
          <a
            href="https://docs.novu.co/platform/account/roles-and-permissions"
            target="_blank"
            className="underline"
            rel="noopener"
          >
            Learn More ↗
          </a>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Switch onCheckedChange={onCheckedChange} {...switchProps} />;
};
