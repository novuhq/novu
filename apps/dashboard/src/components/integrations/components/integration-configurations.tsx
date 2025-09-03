import {
  ConfigConfiguration,
  ConfigConfigurationGroup,
  CredentialsKeyEnum,
  IConfigCredential,
  IProviderConfig,
} from '@novu/shared';
import { useEffect, useRef } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { CopyButton } from '@/components/primitives/copy-button';
import { FormLabel } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { API_HOSTNAME } from '../../../config';
import { useEnvironment } from '../../../context/environment/hooks';
import { useAutoConfigureIntegration } from '../../../hooks/use-auto-configure-integration';
import { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';

function generateInboundWebhookUrl(environmentId: string, integrationId?: string): string {
  const baseUrl = API_HOSTNAME ?? 'https://api.novu.co';
  return `${baseUrl}/v2/inbound-webhooks/delivery-providers/${environmentId}/${integrationId}`;
}

// Helper function to convert ConfigConfiguration to IConfigCredential format
function configurationToCredential(config: ConfigConfiguration): IConfigCredential {
  return {
    key: config.key as CredentialsKeyEnum,
    value: config.value,
    displayName: config.displayName,
    description: config.description,
    type: config.type,
    required: config.required,
  } as IConfigCredential;
}

export function ConfigurationGroupComponent({
  integrationId,
  group,
  control,
  isReadOnly,
  provider,
  formData,
}: {
  integrationId?: string;
  group: ConfigConfigurationGroup;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  provider?: IProviderConfig;
  formData?: IntegrationFormData;
}) {
  const { currentEnvironment } = useEnvironment();
  const { groupType, configurations, enabler } = group;
  const { mutateAsync: autoConfigureIntegration } = useAutoConfigureIntegration();
  // biome-ignore lint/style/noNonNullAssertion: <explanation> x
  const inboundWebhookUrl = generateInboundWebhookUrl(currentEnvironment?._id!, integrationId);

  // Track the previous enabled state to detect toggle changes
  const prevIsEnabledRef = useRef<boolean | null>(null);

  // Find the enabler configuration (toggle field)
  const enablerConfig = enabler ? configurations.find((config) => config.key === enabler) : null;
  const nonEnablerConfigs = configurations.filter((config) => config.key !== enabler);

  // Always call useWatch to avoid conditional hook call
  const toggleFieldName = enablerConfig
    ? (`configurations.${String(enablerConfig.key)}` as const)
    : ('configurations.__dummy__' as const);

  const watchedValue = useWatch({
    control,
    name: toggleFieldName,
  });

  const isEnabled = Boolean(watchedValue && watchedValue !== 'false');

  // Check if required configurations are missing
  const hasRequiredConfigurations = nonEnablerConfigs.every((config) => {
    const configValue = formData?.configurations?.[config.key];
    return configValue && configValue.trim() !== '';
  });

  useEffect(() => {
    const handleIntegrationCreationOrUpdate = async () => {
      // Check if this is a toggle change from false to true
      const wasToggleJustEnabled = prevIsEnabledRef.current === false && isEnabled === true;

      // Update the ref with the current state
      prevIsEnabledRef.current = isEnabled;

      // Only proceed if toggle was just enabled and we have required info
      if (!wasToggleJustEnabled || !provider || !currentEnvironment || isReadOnly) {
        return;
      }

      console.log('handleIntegrationCreationOrUpdate AFTER TOGGLE ON', {
        integrationId,
        hasRequiredConfigurations: !hasRequiredConfigurations,
        formData,
      });

      if (integrationId && !hasRequiredConfigurations && formData) {
        try {
          console.log('Auto-configuring integration...');
          const response = await autoConfigureIntegration({
            integrationId,
          });
          console.log('Auto-configured integration:', response);
        } catch (error) {
          console.error('Failed to auto-configure integration:', error);
        }
      }
    };

    handleIntegrationCreationOrUpdate();
  }, [
    isEnabled,
    integrationId,
    provider,
    currentEnvironment,
    isReadOnly,
    hasRequiredConfigurations,
    formData,
    autoConfigureIntegration,
  ]);

  if (groupType !== 'inboundWebhook') {
    return null;
  }

  return (
    <div>
      {/* Render the enable toggle if it exists */}
      {enablerConfig && (
        <CredentialSection
          key={String(enablerConfig.key)}
          name="configurations"
          credential={configurationToCredential(enablerConfig)}
          control={control}
          isReadOnly={isReadOnly}
          isDisabledWithSwitch={!integrationId}
          disabledSwitchMessage={
            !integrationId ? 'To enable Email activity tracking, create the integration first' : undefined
          }
        />
      )}

      {/* Render nested configurations only when enabled */}

      {/* Render nested configurations only when enabled */}
      {isEnabled && (
        <div className="relative mt-3 space-y-2 pl-6">
          {/* Vertical line indicator */}
          <div className="absolute left-3 top-0 bottom-0 w-px bg-neutral-alpha-200" />

          <FormLabel htmlFor={'inboundWebhookUrl'} optional={false}>
            Inbound Webhook URL
          </FormLabel>
          <Input
            className="cursor-default font-mono !text-neutral-500"
            id={'inboundWebhookUrl'}
            value={inboundWebhookUrl}
            type="text"
            readOnly={true}
            trailingNode={<CopyButton valueToCopy={inboundWebhookUrl} />}
          />

          {nonEnablerConfigs.length > 0 &&
            nonEnablerConfigs.map((config) => (
              <CredentialSection
                key={String(config.key)}
                name="configurations"
                credential={configurationToCredential(config)}
                control={control}
                isReadOnly={isReadOnly}
              />
            ))}
        </div>
      )}
    </div>
  );
}
