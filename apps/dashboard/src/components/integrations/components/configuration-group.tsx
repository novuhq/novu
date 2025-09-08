import {
  ConfigConfiguration,
  ConfigConfigurationGroup,
  CredentialsKeyEnum,
  IConfigCredential,
  IIntegration,
  IProviderConfig,
} from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import { RiCheckLine, RiCloseLine } from 'react-icons/ri';
import { CopyButton } from '@/components/primitives/copy-button';
import { FormLabel } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { LoadingIndicator } from '@/components/primitives/loading-indicator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { fadeIn } from '@/utils/animation';
import { API_HOSTNAME } from '../../../config';
import { useEnvironment } from '../../../context/environment/hooks';
import { useAutoConfigureIntegration } from '../../../hooks/use-auto-configure-integration';
import { InlineToast } from '../../primitives/inline-toast';
import { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';

function generateInboundWebhookUrl(environmentId: string, integrationId?: string): string {
  const baseUrl = API_HOSTNAME ?? 'https://api.novu.co';
  return `${baseUrl}/v2/inbound-webhooks/delivery-providers/${environmentId}/${integrationId}`;
}

function configurationToCredential(config: ConfigConfiguration): IConfigCredential {
  return {
    key: config.key as CredentialsKeyEnum,
    value: config.value,
    displayName: config.displayName,
    description: config.description,
    type: config.type,
    required: config.required,
    links: config.links,
  } as IConfigCredential;
}

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

export function ConfigurationGroup({
  integrationId,
  group,
  control,
  isReadOnly,
  provider,
  formData,
  onAutoConfigureSuccess,
}: {
  integrationId?: string;
  group: ConfigConfigurationGroup;
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  provider?: IProviderConfig;
  formData?: IntegrationFormData;
  onAutoConfigureSuccess?: (integration: IIntegration) => void;
}) {
  const { currentEnvironment } = useEnvironment();
  const { groupType, configurations, enabler } = group;
  const { mutateAsync: autoConfigureIntegration } = useAutoConfigureIntegration();
  // biome-ignore lint/style/noNonNullAssertion: <explanation> x
  const inboundWebhookUrl = generateInboundWebhookUrl(currentEnvironment?._id!, integrationId);

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

      if (integrationId && !hasRequiredConfigurations && formData) {
        try {
          const res = await setAutoConfigureState('loading');
          console.log('Auto-configure state:', res);
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
    currentEnvironment,
    isReadOnly,
    hasRequiredConfigurations,
    formData,
    autoConfigureIntegration,
    onAutoConfigureSuccess,
  ]);

  if (groupType !== 'inboundWebhook') {
    return null;
  }

  return (
    <>
      {/* Render the enable toggle if it exists */}
      {enablerConfig && (
        <>
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

          {/* status indicator */}
          {isEnabled && (
            <>
              <div className="border-l border-neutral-alpha-200 pl-5">
                <div className="mb-4">
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

                  {/* Show instructions only when auto-configure fails */}
                  <AnimatePresence mode="wait">
                    {autoConfigureState === 'error' && (
                      <motion.div key="error-instructions" {...fadeIn}>
                        <InlineToast
                          variant={'tip'}
                          className="mt-3"
                          title="Manual setup"
                          description="copy this URL into your SendGrid webhook settings, Note: Required scopes must be enabled."
                          ctaLabel="View Guide"
                          onCtaClick={() => {
                            window.open(group?.setupWebhookUrlGuide ?? '', '_blank');
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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

              <AutoConfigureStatus state={autoConfigureState} message={autoConfigureMessage} />
            </>
          )}
        </>
      )}
    </>
  );
}
