import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  FeatureFlagsKeysEnum,
  IIntegration,
  IProviderConfig,
  PermissionsEnum,
  slackConfig,
} from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { RiInputField } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Label } from '@/components/primitives/label';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Protect } from '@/utils/protect';
import { ROUTES } from '@/utils/routes';
import { cn } from '../../../utils/ui';
import { InlineToast } from '../../primitives/inline-toast';
import { EnvironmentDropdown } from '../../side-navigation/environment-dropdown';
import { CredentialSection } from './credential-section';
import { GeneralSettings } from './integration-general-settings';
import { isDemoIntegration } from './utils/helpers';

type IntegrationFormData = {
  name: string;
  identifier: string;
  credentials: Record<string, string>;
  configurations: Record<string, string>;
  active: boolean;
  check: boolean;
  primary: boolean;
  environmentId: string;
};

type IntegrationConfigurationProps = {
  provider: IProviderConfig;
  integration?: IIntegration;
  onSubmit: (data: IntegrationFormData) => void;
  mode: 'create' | 'update';
  isChannelSupportPrimary?: boolean;
  hasOtherProviders?: boolean;
  isReadOnly?: boolean;
  onFormStateChange?: (formState: { isValid: boolean; errors: Record<string, unknown>; isDirty: boolean }) => void;
};

function generateSlug(name: string): string {
  return name
    ?.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function IntegrationSettings({
  provider,
  integration,
  onSubmit,
  mode,
  isChannelSupportPrimary,
  hasOtherProviders,
  isReadOnly,
  onFormStateChange,
}: IntegrationConfigurationProps) {
  const navigate = useNavigate();
  const { currentEnvironment, environments } = useEnvironment();

  const form = useForm<IntegrationFormData>({
    mode: 'all',
    reValidateMode: 'onChange',
    defaultValues: integration
      ? {
          name: integration.name,
          identifier: integration.identifier,
          active: integration.active,
          primary: integration.primary ?? false,
          credentials: integration.credentials as Record<string, string>,
          configurations: integration.configurations as Record<string, string>,
          environmentId: integration._environmentId,
        }
      : {
          name: provider?.displayName ?? '',
          identifier: generateSlug(provider?.displayName ?? ''),
          active: true,
          primary: true,
          credentials: {},
          configurations: {},
          environmentId: currentEnvironment?._id ?? '',
        },
  });

  const { handleSubmit, control, setValue, formState } = form;

  // Notify parent component of form state changes
  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange({
        isValid: formState.isValid,
        errors: formState.errors,
        isDirty: formState.isDirty,
      });
    }
  }, [formState.isValid, formState.errors, formState.isDirty, onFormStateChange]);

  const name = useWatch({ control, name: 'name' });
  const environmentId = useWatch({ control, name: 'environmentId' });

  useEffect(() => {
    if (mode === 'create') {
      setValue('identifier', generateSlug(name));
    }
  }, [name, mode, setValue]);

  const isDemo = integration && isDemoIntegration(integration.providerId);
  const isSlackTeamsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_SLACK_TEAMS_ENABLED, false);

  // Filter credentials based on provider and feature flag
  const providerCredentials = useMemo(() => {
    // MS Teams: only show OAuth credentials when feature flag is enabled
    if (provider.id === ChatProviderIdEnum.MsTeams) {
      return isSlackTeamsEnabled ? provider.credentials : [];
    }

    // Slack: hide HMAC for new integrations when feature flag is enabled
    // But keep HMAC visible for existing integrations (backward compatibility)
    if (provider.id === ChatProviderIdEnum.Slack && isSlackTeamsEnabled) {
      // For existing integrations (update mode), show HMAC if it is true in credentials
      if (mode === 'update' && integration?.credentials?.hmac === true) {
        return provider.credentials;
      }

      // For new integrations (create mode), use config without HMAC
      return slackConfig;
    }

    // Default: return all credentials
    return provider.credentials;
  }, [provider.id, provider.credentials, isSlackTeamsEnabled, mode, integration?.credentials]);

  return (
    <Form {...form}>
      <FormRoot
        id={`integration-configuration-form-${provider.id}`}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        <div className="flex items-center justify-between gap-2 p-3">
          <Label className="text-sm" htmlFor="environmentId">
            Environment
          </Label>
          <div className={cn('w-full', mode === 'update' ? 'max-w-[160px]' : 'max-w-[260px]')}>
            <EnvironmentDropdown
              className="w-full shadow-none"
              disabled={mode === 'update' || isReadOnly}
              currentEnvironment={environments?.find((env) => env._id === environmentId)}
              data={environments}
              onChange={(value) => {
                const env = environments?.find((env) => env.name === value);

                if (env) {
                  setValue('environmentId', env._id);
                }
              }}
            />
          </div>
        </div>
        <Accordion type="single" collapsible defaultValue="layout" className="p-3">
          <AccordionItem value="layout">
            <AccordionTrigger>
              <div className="flex items-center gap-1 text-xs">
                <RiInputField className="text-feature size-5" />
                General Settings
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <GeneralSettings
                control={control}
                mode={mode}
                isReadOnly={isReadOnly}
                hidePrimarySelector={!isChannelSupportPrimary}
                disabledPrimary={!hasOtherProviders && integration?.primary}
                configurations={provider.configurations}
                integrationId={integration?._id}
                isDemo={isDemo}
                provider={provider}
                formData={form.getValues()}
                onAutoConfigureSuccess={(updatedIntegration) => {
                  // Update form with the new integration data
                  setValue('configurations', updatedIntegration.configurations as Record<string, string>);
                  setValue('credentials', updatedIntegration.credentials as Record<string, string>);
                  setValue('name', updatedIntegration.name);
                  setValue('identifier', updatedIntegration.identifier);
                  setValue('active', updatedIntegration.active);
                  setValue('primary', updatedIntegration.primary ?? false);
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {isDemo && (
          <div className="p-3">
            <InlineToast
              variant={'warning'}
              title="Demo Integration"
              description={`This is a demo ${provider?.channel.toLowerCase()} integration intended for testing purposes only. It is limited to 300 notifications per month.${
                provider?.channel === ChannelTypeEnum.EMAIL
                  ? ' You can only send emails from it to the email address you are logged in with.'
                  : ''
              }`}
            />
          </div>
        )}

        {!isDemo && providerCredentials.length > 0 && (
          <div className="p-3">
            <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
              <Accordion type="single" collapsible defaultValue="credentials">
                <AccordionItem value="credentials">
                  <AccordionTrigger>
                    <div className="flex items-center gap-1 text-xs">
                      <RiInputField className="text-feature size-5" />
                      Delivery Provider Credentials
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {provider?.id === ChatProviderIdEnum.MsTeams && isSlackTeamsEnabled && (
                      <InlineToast
                        variant="tip"
                        className="mb-3"
                        description="These credentials are only required for Bot App authentication and are not needed for incoming webhook functionality."
                      />
                    )}
                    <div className="border-neutral-alpha-200 bg-background text-foreground-600 mx-0 mt-0 flex flex-col gap-2 rounded-lg border p-3">
                      {providerCredentials.map((credential) => (
                        <CredentialSection
                          key={`${credential.key}-${integration?._id || 'no-id'}`}
                          credential={credential}
                          control={control}
                          isReadOnly={isReadOnly}
                          integrationId={integration?._id}
                        />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Protect>

            {/* TODO: This is a temporary solution to show the guide only for in-app channel, 
              we need to replace it with dedicated view per integration channel */}
            {integration && integration.channel === ChannelTypeEnum.IN_APP && !integration.connected ? (
              <InlineToast
                variant={'tip'}
                className="mt-3"
                title="Integrate in less than 4 minutes"
                ctaLabel="Get started"
                onCtaClick={() => navigate(`${ROUTES.INBOX_EMBED}?environmentId=${integration._environmentId}`)}
              />
            ) : (
              provider?.docReference && (
                <InlineToast
                  variant={'tip'}
                  className="mt-3"
                  title="Configure Integration"
                  description="To learn more about how to configure your integration, please refer to the documentation."
                  ctaLabel="View Guide"
                  onCtaClick={() => {
                    window.open(provider?.docReference ?? '', '_blank');
                  }}
                />
              )
            )}
          </div>
        )}
      </FormRoot>
    </Form>
  );
}
