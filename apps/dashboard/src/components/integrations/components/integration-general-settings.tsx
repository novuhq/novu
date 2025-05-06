import { LinkButton } from '@/components/primitives/button-link';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import { Switch } from '@/components/primitives/switch';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ROUTES } from '@/utils/routes';
import { ApiServiceLevelEnum } from '@novu/shared';
import { Control } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../../config';
import { openInNewTab } from '../../../utils/url';

type IntegrationFormData = {
  name: string;
  identifier: string;
  credentials: Record<string, string>;
  active: boolean;
  check: boolean;
  primary: boolean;
  environmentId: string;
  removeNovuBranding?: boolean;
};

type GeneralSettingsProps = {
  control: Control<IntegrationFormData>;
  mode: 'create' | 'update';
  hidePrimarySelector?: boolean;
  disabledPrimary?: boolean;
  isForInAppStep?: boolean;
};

function NovuBrandingSwitch({
  id,
  value,
  onChange,
}: {
  id: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  const { subscription, isLoading } = useFetchSubscription();
  const navigate = useNavigate();

  const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
  const disabled = isFreePlan || IS_SELF_HOSTED || isLoading;
  const checked = disabled ? false : value;

  const popoverContent = IS_SELF_HOSTED
    ? 'Remove Novu badge from your inbox by upgrading to Cloud plans'
    : 'Remove Novu badge from your inbox by upgrading to our paid plans';

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
            <Switch id={id} checked={checked} />
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
        <Switch id={id} onCheckedChange={onChange} checked={checked} />
      )}
    </div>
  );
}

export function GeneralSettings({
  control,
  mode,
  hidePrimarySelector,
  disabledPrimary,
  isForInAppStep,
}: GeneralSettingsProps) {
  return (
    <div className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 flex flex-col gap-2 rounded-lg border p-3">
      <FormField
        control={control}
        name="active"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-2">
            <FormLabel
              className="text-xs"
              htmlFor="active"
              tooltip="Disabling an integration will stop sending notifications through it."
            >
              Active Integration
            </FormLabel>
            <FormControl>
              <Switch id="active" checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {isForInAppStep && (
        <>
          <FormField
            control={control}
            name="removeNovuBranding"
            render={({ field }) => {
              return (
                <FormItem className="flex items-center justify-between gap-2">
                  <FormLabel
                    className="text-xs"
                    htmlFor="removeNovuBranding"
                    tooltip="If enabled, the Novu badge will be removed from your inbox."
                  >
                    Remove Novu badge: <span className="text-text-soft ml-1 text-xs">"Inbox by Novu"</span>
                  </FormLabel>
                  <FormControl>
                    <NovuBrandingSwitch id="removeNovuBranding" value={field.value} onChange={field.onChange} />
                  </FormControl>
                </FormItem>
              );
            }}
          />
        </>
      )}

      {!hidePrimarySelector && (
        <FormField
          control={control}
          name="primary"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-2">
              <FormLabel
                className="text-xs"
                htmlFor="primary"
                tooltip="Primary integration will be used for all notifications by default, there can be only one primary integration per channel"
              >
                Primary Integration
              </FormLabel>
              <FormControl>
                <Switch
                  id="primary"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabledPrimary}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      <Separator />

      <FormField
        control={control}
        name="name"
        rules={{ required: 'Name is required' }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs" htmlFor="name" required>
              Name
            </FormLabel>
            <FormControl>
              <Input id="name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="identifier"
        rules={{
          required: 'Identifier is required',
          pattern: {
            value: /^[^\s]+$/,
            message: 'Identifier cannot contain spaces',
          },
        }}
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel className="text-xs" htmlFor="identifier" required>
              Identifier
            </FormLabel>
            <FormControl>
              <Input id="identifier" {...field} readOnly={mode === 'update'} hasError={!!fieldState.error} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
