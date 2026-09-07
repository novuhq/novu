import { ChannelTypeEnum, ConfigConfigurationGroup, IIntegration, IProviderConfig } from '@novu/shared';
import { useEffect, useRef, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useAutoConfigureIntegration } from '../../../hooks/use-auto-configure-integration';
import { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import { InboundWebhookUrl } from './inbound-webhook-url';
import { configurationToCredential } from './utils/helpers';

type InboundWebhookGroupProps = {
  integrationId?: string;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  provider?: IProviderConfig;
  group: ConfigConfigurationGroup;
  formData?: IntegrationFormData;
  onAutoConfigureSuccess?: (integration: IIntegration) => void;
};

function AutoConfigureStatus({ state, message }: { state: 'idle' | 'loading' | 'success' | 'error'; message: string }) {
  if (state === 'idle') {
    return null;
  }

  return (
    <div className="flex h-4 items-center justify-start rounded-full bg-background -ml-[5px]">
      {state === 'loading' && (
        <div className="flex items-center gap-2">
          <LoadingIndicator size="sm" className="size-2.5" />
          <span className="text-xs text-neutral-600">Enabling tracking…</span>
        </div>
      )}
      {state === 'success' && (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <RiCheckLine className="size-3 text-green-600" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{message}</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-green-600">Auto-configured</span>
        </div>
      )}
      {state === 'error' && (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <RiCloseLine className="size-3 text-red-600" />
            </TooltipTrigger>
            <TooltipContent>
              <p>{message}</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-red-600">Manual setup required</span>
        </div>
      )}
    </div>
  );
}

export function InboundWebhookGroup({
  integrationId,
  control,
  isReadOnly,
  provider,
  group,
  formData,
  onAutoConfigureSuccess,
}: InboundWebhookGroupProps) {
  const { configurations, enabler } = group;
  const { mutateAsync: autoConfigureIntegration } = useAutoConfigureIntegration();

  // Track the previous enabled state to detect toggle changes
  const prevIsEnabledRef = useRef<boolean | null>(null);

  // Auto-configure request state
  const [autoConfigureState, setAutoConfigureState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [autoConfigureMessage, setAutoConfigureMessage] = useState<string>('');

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
  const hasRequiredConfigurations =
    nonEnablerConfigs.length === 0
      ? false
      : nonEnablerConfigs.every((config) => {
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
      if (!wasToggleJustEnabled || !provider || isReadOnly) {
        return;
      }

      if (provider.channel !== ChannelTypeEnum.PUSH && integrationId && !hasRequiredConfigurations && formData) {
        try {
          setAutoConfigureState('loading');
          const response = await autoConfigureIntegration({
            integrationId,
          });
          if (response.success) {
            setAutoConfigureState('success');
            setAutoConfigureMessage(response.message || 'Configuration completed successfully');

            // Notify parent component if callback provided and integration data available
            if (onAutoConfigureSuccess && response.integration) {
              onAutoConfigureSuccess(response.integration);
            }
          } else {
            setAutoConfigureState('error');
            setAutoConfigureMessage(response.message || 'Configuration failed');
          }
        } catch (error) {
          setAutoConfigureState('error');
          setAutoConfigureMessage(error instanceof Error ? error.message : 'Unknown error occurred');
        }
      }
    };

    handleIntegrationCreationOrUpdate();
  }, [
    isEnabled,
    integrationId,
    provider,
    isReadOnly,
    hasRequiredConfigurations,
    formData,
    autoConfigureIntegration,
    onAutoConfigureSuccess,
  ]);

  return (
    <>
      {/* Render the enable toggle if it exists */}
      {enablerConfig && (
        <>
          <CredentialSection
            key={`${String(enablerConfig.key)}-${integrationId || 'no-id'}`}
            name="configurations"
            credential={configurationToCredential(enablerConfig)}
            control={control}
            isReadOnly={isReadOnly}
            isDisabledWithSwitch={!integrationId}
            disabledSwitchMessage={
              !integrationId ? 'To enable Email activity tracking, create the integration first' : undefined
            }
            integrationId={integrationId}
          />

          {/* status indicator */}
          {isEnabled && (
            <>
              <div className="border-l border-neutral-alpha-200 pl-5">
                {provider?.channel !== ChannelTypeEnum.PUSH && (
                  <InboundWebhookUrl
                    integrationId={integrationId}
                    autoConfigureState={autoConfigureState}
                    provider={provider}
                    group={group}
                  />
                )}

                {nonEnablerConfigs.length > 0 &&
                  nonEnablerConfigs.map((config) => (
                    <CredentialSection
                      key={`${String(config.key)}-${integrationId || 'no-id'}`}
                      name="configurations"
                      credential={configurationToCredential(config)}
                      control={control}
                      isReadOnly={isReadOnly}
                      integrationId={integrationId}
                    />
                  ))}
              </div>

              <AutoConfigureStatus state={autoConfigureState} message={autoConfigureMessage} />
            </>
          )}
        </>
      )}
    </>
  );
}
