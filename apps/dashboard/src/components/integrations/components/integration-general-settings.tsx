import {
  ConfigConfigurationGroup,
  FeatureFlagsKeysEnum,
  IIntegration,
  IProviderConfig,
  PermissionsEnum,
} from '@novu/shared';
import { Control } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { Switch } from '@/components/primitives/switch';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Protect } from '@/utils/protect';
import { IntegrationFormData } from '../types';
import { ConfigurationGroup } from './configuration-group';

type GeneralSettingsProps = {
  control: Control<IntegrationFormData>;
  mode: 'create' | 'update';
  isReadOnly?: boolean;
  hidePrimarySelector?: boolean;
  disabledPrimary?: boolean;
  configurations?: ConfigConfigurationGroup[];
  integrationId?: string;
  isDemo?: boolean;
  provider?: IProviderConfig;
  formData?: IntegrationFormData;
  onAutoConfigureSuccess?: (integration: IIntegration) => void;
};

export function GeneralSettings({
  control,
  mode,
  isReadOnly,
  hidePrimarySelector,
  disabledPrimary,
  configurations,
  integrationId,
  isDemo,
  provider,
  formData,
  onAutoConfigureSuccess,
}: GeneralSettingsProps) {
  const isInboundWebhooksEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INBOUND_WEBHOOKS_ENABLED, true);
  const isInboundWebhooksConfigurationEnabled = useFeatureFlag(
    FeatureFlagsKeysEnum.IS_INBOUND_WEBHOOKS_CONFIGURATION_ENABLED,
    false
  );

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
              <Switch id={field.name} checked={field.value} onCheckedChange={field.onChange} disabled={isReadOnly} />
            </FormControl>
          </FormItem>
        )}
      />

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
                  id={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabledPrimary || isReadOnly}
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
              <Input id={field.name} {...field} disabled={isReadOnly} />
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
              <Input
                id={field.name}
                {...field}
                readOnly={mode === 'update' || isReadOnly}
                hasError={!!fieldState.error}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {!isDemo &&
        isInboundWebhooksEnabled &&
        isInboundWebhooksConfigurationEnabled &&
        configurations &&
        configurations.length > 0 && (
          <>
            <Separator className="mt-2" />

            <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
              {configurations.map((group) => (
                <ConfigurationGroup
                  integrationId={integrationId}
                  key={group.groupType}
                  group={group}
                  control={control}
                  isReadOnly={isReadOnly}
                  provider={provider}
                  formData={formData}
                  onAutoConfigureSuccess={onAutoConfigureSuccess}
                />
              ))}
            </Protect>
          </>
        )}
    </div>
  );
}
