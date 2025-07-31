import { ApiServiceLevelEnum, PermissionsEnum } from '@novu/shared';
import { Switch } from '@/components/primitives/switch';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { PermissionSwitch } from '../primitives/permission-switch';

type NovuBrandingSwitchProps = {
  id: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  isReadOnly?: boolean;
};

export function NovuBrandingSwitch({ id, value, onChange, isReadOnly }: NovuBrandingSwitchProps) {
  const { subscription, isLoading } = useFetchSubscription();

  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const disabled = isFreePlan || isLoading || isReadOnly;
  const checked = disabled ? false : value;

  return (
    <div className="flex items-center">
      {isFreePlan ? (
        <UpgradeCTATooltip
          description="Hide Novu branding from your notification channels by upgrading to a paid plan"
          utmCampaign="remove_branding_prompt"
          utmSource="remove_branding_prompt"
        >
          <Switch id={id} checked={checked} disabled />
        </UpgradeCTATooltip>
      ) : (
        <PermissionSwitch
          id={id}
          permission={PermissionsEnum.ORG_SETTINGS_WRITE}
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
