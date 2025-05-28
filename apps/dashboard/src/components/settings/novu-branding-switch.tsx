import { useNavigate } from 'react-router-dom';
import { Switch } from '@/components/primitives/switch';
import { SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { IS_SELF_HOSTED } from '@/config';
import { openInNewTab } from '@/utils/url';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { LinkButton } from '@/components/primitives/button-link';
import { ROUTES } from '@/utils/routes';
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
  const navigate = useNavigate();

  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const disabled = isFreePlan || IS_SELF_HOSTED || isLoading;
  const checked = disabled ? false : value;

  const popoverContent = IS_SELF_HOSTED
    ? 'Hide Novu branding from your notification channels by upgrading to Cloud plans'
    : 'Hide Novu branding from your notification channels by upgrading to a paid plan';

  const handleLinkClick = () => {
    if (IS_SELF_HOSTED) {
      openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=remove_branding_prompt');
    } else {
      navigate(ROUTES.SETTINGS_BILLING + '?utm_source=remove_branding_prompt');
    }
  };

  return (
    <div className="flex items-center">
      {isFreePlan || IS_SELF_HOSTED ? (
        <Popover modal>
          <PopoverTrigger asChild>
            <Switch id={id} checked={checked} disabled={isReadOnly} />
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end" sideOffset={4}>
            <div className="flex flex-col gap-2 p-1">
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold">Premium Feature</h4>
                <p className="text-muted-foreground text-xs">{popoverContent}</p>
              </div>
              <div className="flex justify-end">
                <LinkButton size="sm" variant="primary" onClick={handleLinkClick}>
                  Upgrade Plan
                </LinkButton>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Switch id={id} onCheckedChange={onChange} checked={checked} disabled={isReadOnly} />
      )}
    </div>
  );
}
