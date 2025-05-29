import { Switch } from '@/components/primitives/switch';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { IS_SELF_HOSTED } from '@/config';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ApiServiceLevelEnum } from '@novu/shared';

type NovuBrandingSwitchProps = {
  id: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  isReadOnly?: boolean;
};

export function NovuBrandingSwitch({ id, value, onChange, isReadOnly }: NovuBrandingSwitchProps) {
  const { subscription, isLoading } = useFetchSubscription();

  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const disabled = isFreePlan || IS_SELF_HOSTED || isLoading;
  const checked = disabled ? false : value;

  const description = IS_SELF_HOSTED
    ? 'Hide Novu branding from your notification channels by upgrading to Cloud plans'
    : 'Hide Novu branding from your notification channels by upgrading to a paid plan';

  return (
    <div className="flex items-center">
      {isFreePlan || IS_SELF_HOSTED ? (
        <UpgradeCTATooltip
          description={description}
          utmCampaign="remove_branding_prompt"
          utmSource="remove_branding_prompt"
        >
          <Switch id={id} checked={checked} disabled={disabled} />
        </UpgradeCTATooltip>
      ) : (
        <Switch id={id} onCheckedChange={onChange} checked={checked} disabled={isReadOnly} />
      )}
    </div>
  );
}
