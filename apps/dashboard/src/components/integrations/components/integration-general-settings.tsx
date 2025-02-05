import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { Switch } from '@/components/primitives/switch';
import { Button } from '@/components/primitives/button';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { Control } from 'react-hook-form';
import { ApiServiceLevelEnum } from '@novu/shared';
import { HoverCard, HoverCardPortal, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';
import { ROUTES } from '@/utils/routes';
import { Link } from 'react-router-dom';

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

export function GeneralSettings({
  control,
  mode,
  hidePrimarySelector,
  disabledPrimary,
  isForInAppStep,
}: GeneralSettingsProps) {
  const { subscription, isLoading: isLoadingSubscription } = useFetchSubscription();

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
        <FormField
          control={control}
          name="removeNovuBranding"
          render={({ field }) => {
            const isFreePlan = subscription?.apiServiceLevel === ApiServiceLevelEnum.FREE;
            const disabled = isFreePlan || isLoadingSubscription;
            const value = disabled ? false : field.value;

            const switchControl = <Switch disabled={disabled} onCheckedChange={field.onChange} checked={value} />;

            return (
              <FormItem className="flex items-center justify-between gap-2">
                <FormLabel
                  className="text-xs"
                  htmlFor="active"
                  tooltip='Hide "Powered by Novu" branding from your <Inbox />'
                >
                  Remove "Powered by Novu" branding
                </FormLabel>
                <FormControl>
                  {isFreePlan ? (
                    <HoverCard openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild>{switchControl}</HoverCardTrigger>
                      <HoverCardPortal>
                        <HoverCardContent className="w-fit" align="end" sideOffset={4}>
                          <div className="flex max-w-52 flex-col gap-2 text-wrap text-xs">
                            <span>Upgrade your billing plan to remove Novu branding</span>
                            <Link to={ROUTES.SETTINGS_BILLING}>
                              <Button variant="primary" mode="lighter" size="xs">
                                Upgrade now
                              </Button>
                            </Link>
                          </div>
                        </HoverCardContent>
                      </HoverCardPortal>
                    </HoverCard>
                  ) : (
                    switchControl
                  )}
                </FormControl>
              </FormItem>
            );
          }}
        />
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
