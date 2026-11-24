import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  CredentialsKeyEnum,
  getUnusedTwilioAuthCredentialKeys,
  IIntegration,
  IProviderConfig,
  PermissionsEnum,
  SmsProviderIdEnum,
  slackConfig,
  ToolProviderIdEnum,
} from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { RiInputField } from 'react-icons/ri';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/primitives/accordion';
import { Form, FormRoot } from '@/components/primitives/form/form';
import { Label } from '@/components/primitives/label';
import { useEnvironment } from '@/context/environment/hooks';
import { Protect } from '@/utils/protect';
import { ROUTES } from '@/utils/routes';
import { cn } from '../../../utils/ui';
import { InlineToast } from '../../primitives/inline-toast';
import { EnvironmentDropdown } from '../../side-navigation/environment-dropdown';
import { IntegrationFormData } from '../types';
import { CredentialSection } from './credential-section';
import { IntegrationConditionsDrawer } from './integration-conditions-drawer';
import { GeneralSettings } from './integration-general-settings';
import { ProviderDeprecationNotice } from './provider-deprecation';
import {
  AdvancedSettings,
  EnvironmentPills,
  type ProviderSetupMode,
  SettingsSection,
  SetupCard,
  SetupDocsLink,
  SetupTip,
} from './provider-setup-layout';
import { SlackCredentialsPaste } from './slack-credentials-paste';
import { SlackManualSetup } from './slack-manual-setup';
import { SlackQuickSetup } from './slack-quick-setup';
import { TelegramCredentialsPaste, type TelegramCredentialsPasteMobileSetup } from './telegram-credentials-paste';
import { ToolWebhookSettings } from './tool-webhook-settings';
import { useSlackCredentialsPasteFallback } from './use-slack-credentials-paste-fallback';
import { useWhatsAppCredentialsPasteFallback } from './use-whatsapp-credentials-paste-fallback';
import { isDemoIntegration, usesProviderSetupLayout } from './utils/helpers';
import { WhatsAppCredentialsPaste } from './whatsapp-credentials-paste';
import { WhatsAppCredentialsValidator } from './whatsapp-credentials-validator';

type IntegrationConfigurationProps = {
  provider: IProviderConfig;
  integration?: IIntegration;
  onSubmit: (data: IntegrationFormData) => void;
  mode: 'create' | 'update';
  isChannelSupportPrimary?: boolean;
  hasOtherProviders?: boolean;
  isReadOnly?: boolean;
  agentOnboarding?: boolean;
  /** Agent identifier — only set during the agent-onboarding flow. */
  agentIdentifier?: string;
  /** Quickstart test subscriber for Telegram mobile `/start` deep links. */
  testSubscriberId?: string | null;
  onFormStateChange?: (formState: {
    isValid: boolean;
    errors: Record<string, unknown>;
    isDirty: boolean;
    /** Labels of the edited fields, as the form shows them. */
    changedFields: string[];
  }) => void;
  /** Passed to the Primary toggle: turning it on confirms and applies right away (manage drawer). */
  onRequestPrimary?: () => void;
  /** "manage": the sections of the manage drawer, for an existing integration. */
  layout?: 'default' | 'manage';
  /** Turns on the Quick setup / Manual layout for Slack in the create flow. */
  slackQuickSetup?: {
    /** The Slack app Novu created, once "Create app" has run. */
    appId?: string;
    isCreating: boolean;
    /** True once creation has started: the integration belongs to that environment from then on. */
    isEnvironmentLocked: boolean;
    onCreateApp: (data: IntegrationFormData, configToken: string, appName: string) => void;
  };
};

const SLACK_CONNECT_DOCS_URL = 'https://docs.novu.co/platform/integrations/chat/slack';

function generateSlug(name: string): string {
  return name
    ?.toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const GENERAL_FIELD_LABELS: Partial<Record<keyof IntegrationFormData, string>> = {
  name: 'Name',
  identifier: 'Identifier',
  active: 'Active Integration',
  primary: 'Primary Integration',
  rules: 'Conditions',
};

type DirtyFields = Partial<Record<string, unknown>>;

/** A field counts as edited when react-hook-form marked it, or anything nested in it, as dirty. */
function isDirtyValue(value: unknown): boolean {
  if (value === true) return true;
  if (Array.isArray(value)) return value.some(isDirtyValue);
  if (value && typeof value === 'object') return Object.values(value).some(isDirtyValue);

  return false;
}

/** The edited fields by the labels the form shows: "Name", or a credential's "API Key". */
function describeChangedFields(dirtyFields: DirtyFields, provider: IProviderConfig): string[] {
  const labels: string[] = [];
  const credentialLabel = (key: string) =>
    provider.credentials.find((credential) => credential.key === key)?.displayName ?? key;
  const configurationLabel = (key: string) =>
    provider.configurations?.flatMap((group) => group.configurations).find((configuration) => configuration.key === key)
      ?.displayName ?? key;

  for (const [field, value] of Object.entries(dirtyFields)) {
    if (!isDirtyValue(value)) continue;

    if ((field === 'credentials' || field === 'configurations') && value && typeof value === 'object') {
      const toLabel = field === 'credentials' ? credentialLabel : configurationLabel;
      for (const [key, nested] of Object.entries(value)) {
        if (isDirtyValue(nested)) labels.push(toLabel(key));
      }
      continue;
    }

    const label = GENERAL_FIELD_LABELS[field as keyof IntegrationFormData];
    if (label) labels.push(label);
  }

  return labels;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: long-standing per-provider settings form; splitting it is out of scope here
export function IntegrationSettings({
  provider,
  integration,
  onSubmit,
  mode,
  isChannelSupportPrimary,
  hasOtherProviders,
  isReadOnly,
  agentOnboarding,
  agentIdentifier,
  testSubscriberId,
  onFormStateChange,
  onRequestPrimary,
  slackQuickSetup,
  layout = 'default',
}: IntegrationConfigurationProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
          rules: integration.rules ?? null,
        }
      : {
          name: provider?.displayName ?? '',
          identifier: generateSlug(provider?.displayName ?? ''),
          active: true,
          primary: true,
          credentials: {},
          configurations: {},
          environmentId: currentEnvironment?._id ?? '',
          rules: null,
        },
  });

  const { handleSubmit, control, setValue, formState } = form;

  // Primary can change outside the form (the drawer's "Make primary"), so the toggle follows it unless it was edited.
  // Making it primary also clears its rules on the server; keeping the old ones would send them back on the next
  // save, and the server would take primary away again.
  const savedPrimary = integration?.primary ?? false;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs only when the saved value changes
  useEffect(() => {
    if (!integration) return;
    if (!form.getFieldState('primary').isDirty) form.resetField('primary', { defaultValue: savedPrimary });
    if (!form.getFieldState('rules').isDirty) form.resetField('rules', { defaultValue: integration.rules ?? null });
  }, [savedPrimary]);

  const usesSetupLayout =
    mode === 'create' &&
    usesProviderSetupLayout(provider.id) &&
    !!slackQuickSetup &&
    !(agentOnboarding || searchParams.get('agent_onboarding') === 'true');
  const [setupMode, setSetupMode] = useState<ProviderSetupMode>('quick');
  // Quick setup saves the credentials on the server, so the form is ready once the app exists.
  const isQuickSetupMode = usesSetupLayout && setupMode === 'quick';
  const isFormReady = isQuickSetupMode ? !!slackQuickSetup?.appId : formState.isValid;

  const changedFields = describeChangedFields(formState.dirtyFields, provider);
  // Joined so the effect runs when the list changes, not on every new dirtyFields object.
  const changedFieldsKey = changedFields.join('\n');
  // Not formState.isDirty: it compares the whole form to its defaults, and a credential field that mounts with no
  // value adds an undefined key to `credentials`, so `{}` stops matching and an untouched form reads as dirty.
  const hasChanges = Object.values(formState.dirtyFields).some(isDirtyValue);

  // Notify parent component of form state changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: changedFieldsKey stands in for changedFields
  useEffect(() => {
    if (onFormStateChange) {
      onFormStateChange({
        isValid: isFormReady,
        errors: formState.errors,
        isDirty: hasChanges,
        changedFields,
      });
    }
  }, [isFormReady, formState.errors, hasChanges, changedFieldsKey, onFormStateChange]);

  const name = useWatch({ control, name: 'name' });
  const environmentId = useWatch({ control, name: 'environmentId' });
  const authMethod = useWatch({ control, name: `credentials.${CredentialsKeyEnum.AuthMethod}` });
  const slackAppId = useWatch({ control, name: `credentials.${CredentialsKeyEnum.ApplicationId}` });
  const unusedCredentialKeys = useMemo(
    () => (provider.id === SmsProviderIdEnum.Twilio ? getUnusedTwilioAuthCredentialKeys(authMethod) : []),
    [provider.id, authMethod]
  );

  useEffect(() => {
    if (mode === 'create') {
      setValue('identifier', generateSlug(name));
    }
  }, [name, mode, setValue]);

  const isDemo = integration && isDemoIntegration(integration.providerId);
  const isAgentOnboarding = agentOnboarding || searchParams.get('agent_onboarding') === 'true';
  const isSlackOnboarding = isAgentOnboarding && provider.id === ChatProviderIdEnum.Slack;
  const isWhatsAppOnboarding = isAgentOnboarding && provider.id === ChatProviderIdEnum.WhatsAppBusiness;
  const isTelegramProvider = provider.id === ChatProviderIdEnum.Telegram;
  const isToolWebhookProvider = provider.id === ToolProviderIdEnum.Webhook;
  // The BotFather paste helper is an onboarding affordance — once the integration
  // already has a saved bot token, the textarea and mobile QR card are noise
  // (and the "Auto-filled from the BotFather message above…" hint becomes
  // misleading), so hide all of it and fall back to the regular API token field.
  const telegramApiToken = integration?.credentials?.[CredentialsKeyEnum.ApiToken];
  const hasExistingTelegramToken =
    isTelegramProvider && typeof telegramApiToken === 'string' && telegramApiToken.trim().length > 0;
  const showTelegramPaste = isTelegramProvider && !isReadOnly && !hasExistingTelegramToken;
  // Picks the QR variant: agent flow when we already have agent + integration,
  // integration-store flow in the create flow where neither exists yet, none
  // otherwise (e.g. plain edit of a non-agent Telegram integration).
  const telegramMobileVariant = useMemo<TelegramCredentialsPasteMobileSetup | undefined>(() => {
    if (!showTelegramPaste) return undefined;

    if (isAgentOnboarding && integration?.identifier) {
      return { kind: 'agent', integrationIdentifier: integration.identifier, testSubscriberId };
    }

    if (mode === 'create') return { kind: 'integration-store' };

    return undefined;
  }, [showTelegramPaste, isAgentOnboarding, integration?.identifier, mode, testSubscriberId]);
  const handleSlackCredentialsPaste = useSlackCredentialsPasteFallback({
    control,
    setValue,
    isEnabled: isSlackOnboarding && !isReadOnly,
  });
  const handleWhatsAppCredentialsPaste = useWhatsAppCredentialsPasteFallback({
    control,
    setValue,
    isEnabled: isWhatsAppOnboarding && !isReadOnly,
  });
  const handleAgentOnboardingPaste = isWhatsAppOnboarding
    ? handleWhatsAppCredentialsPaste
    : handleSlackCredentialsPaste;

  const providerCredentials = useMemo(() => {
    let credentials = provider.credentials;

    if (provider.id === ChatProviderIdEnum.Slack) {
      // For existing integrations (update mode), show HMAC if it is true in credentials
      if (mode === 'update' && integration?.credentials?.hmac === true) {
        credentials = provider.credentials;
      } else {
        // For new integrations (create mode), use config without HMAC
        credentials = slackConfig;
      }
    }

    const visibleCredentials = credentials.filter(
      (credential) => credential.hidden !== true && !unusedCredentialKeys.includes(credential.key)
    );

    if (isAgentOnboarding) {
      return visibleCredentials.filter((credential) => credential.key !== CredentialsKeyEnum.RedirectUrl);
    }

    return visibleCredentials;
  }, [provider.id, provider.credentials, mode, integration?.credentials, isAgentOnboarding, unusedCredentialKeys]);

  const credentialFields = (
    <>
      {provider?.id === ChatProviderIdEnum.MsTeams && (
        <InlineToast
          variant="tip"
          className="mb-3"
          description="These credentials are only required for Bot App authentication and are not needed for incoming webhook functionality."
        />
      )}
      <div
        className={cn(
          'text-foreground-600 flex flex-col gap-2',
          layout !== 'manage' && 'border-neutral-alpha-200 bg-background mx-0 mt-0 rounded-lg border p-3'
        )}
      >
        {isSlackOnboarding && <SlackCredentialsPaste control={control} setValue={setValue} isReadOnly={isReadOnly} />}
        {isWhatsAppOnboarding && (
          <>
            <WhatsAppCredentialsPaste control={control} setValue={setValue} isReadOnly={isReadOnly} />
            <WhatsAppCredentialsValidator control={control} />
          </>
        )}
        {showTelegramPaste && (
          <TelegramCredentialsPaste
            control={control}
            setValue={setValue}
            isReadOnly={isReadOnly}
            mobileSetup={telegramMobileVariant}
          />
        )}
        {isToolWebhookProvider ? (
          <ToolWebhookSettings control={control} setValue={setValue} isReadOnly={isReadOnly} />
        ) : (
          <div
            onPasteCapture={handleAgentOnboardingPaste}
            className={cn('flex flex-col gap-2', layout === 'manage' && 'grid grid-cols-2 gap-3')}
          >
            {providerCredentials.map((credential) => (
              <div
                key={`${credential.key}-${integration?._id || 'no-id'}`}
                // Short text fields pair up two per row in the manage drawer; the rest take the full width.
                className={cn(layout === 'manage' && credential.type !== 'string' && 'col-span-2')}
              >
                <CredentialSection
                  credential={
                    showTelegramPaste && credential.key === CredentialsKeyEnum.ApiToken
                      ? {
                          ...credential,
                          description: 'Auto-filled from the BotFather message above, or enter it manually.',
                        }
                      : credential
                  }
                  control={control}
                  isReadOnly={isReadOnly}
                  integrationId={integration?._id}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const hasCredentialFields = !isDemo && (isToolWebhookProvider || providerCredentials.length > 0);

  if (layout === 'manage') {
    return (
      <Form {...form}>
        <FormRoot
          id={`integration-configuration-form-${provider.id}`}
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <ProviderDeprecationNotice provider={provider} />
          {isDemo && (
            <InlineToast
              variant="warning"
              title="Demo Integration"
              description={`This is a demo ${provider.channel.toLowerCase()} integration intended for testing purposes only. It is limited to 300 notifications per month.`}
            />
          )}
          {hasCredentialFields && (
            <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
              <SettingsSection title={`${provider.displayName} credentials`} defaultOpen>
                {credentialFields}
              </SettingsSection>
            </Protect>
          )}
          <SettingsSection title="General settings" defaultOpen={!hasCredentialFields}>
            <div className="flex flex-col gap-3">
              <GeneralSettings
                onRequestPrimary={onRequestPrimary}
                control={control}
                setValue={setValue}
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
                  setValue('configurations', updatedIntegration.configurations as Record<string, string>);
                  setValue('credentials', updatedIntegration.credentials as Record<string, string>);
                  setValue('name', updatedIntegration.name);
                  setValue('identifier', updatedIntegration.identifier);
                  setValue('active', updatedIntegration.active);
                  setValue('primary', updatedIntegration.primary ?? false);
                }}
              />
              <IntegrationConditionsDrawer
                control={control}
                setValue={setValue}
                legacyConditions={integration?.conditions}
                isReadOnly={isReadOnly}
              />
            </div>
          </SettingsSection>
        </FormRoot>
      </Form>
    );
  }

  if (usesSetupLayout && slackQuickSetup) {
    const generalSettings = (
      <GeneralSettings
        control={control}
        setValue={setValue}
        mode={mode}
        isReadOnly={isReadOnly}
        hidePrimarySelector={!isChannelSupportPrimary}
        disabledPrimary={!hasOtherProviders && integration?.primary}
        configurations={provider.configurations}
        integrationId={integration?._id}
        isDemo={isDemo}
        provider={provider}
        formData={form.getValues()}
      />
    );

    return (
      <Form {...form}>
        <FormRoot
          id={`integration-configuration-form-${provider.id}`}
          onSubmit={async (event) => {
            if (!isQuickSetupMode) return handleSubmit(onSubmit)(event);

            // Quick setup already saved the credentials on the server; only the general settings are left to check.
            event.preventDefault();
            if (await form.trigger(['name', 'identifier'])) onSubmit({ ...form.getValues(), credentials: {} });
          }}
          className="flex flex-col gap-5 p-5"
        >
          <ProviderDeprecationNotice provider={provider} replaceOnNavigate />
          <EnvironmentPills
            environments={environments ?? []}
            selectedId={environmentId}
            onSelect={(id) => setValue('environmentId', id, { shouldDirty: true })}
            // The integration is created with the app, so its environment is settled from then on.
            disabled={isReadOnly || slackQuickSetup.isEnvironmentLocked}
          />
          <SetupCard
            title={`Set up ${provider.displayName}`}
            duration={setupMode === 'quick' ? '~2 min' : '~5 min'}
            mode={setupMode}
            onModeChange={setSetupMode}
            footer={
              <>
                <SetupTip>
                  Add <code className="font-code">&lt;SlackConnectButton /&gt;</code> to your app so subscribers can
                  connect their Slack workspace.{' '}
                  <a href={SLACK_CONNECT_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                    Read docs
                  </a>
                  .
                </SetupTip>
                {provider.docReference && <SetupDocsLink href={provider.docReference} />}
              </>
            }
          >
            {setupMode === 'quick' ? (
              <SlackQuickSetup
                appId={slackQuickSetup.appId}
                isCreating={slackQuickSetup.isCreating}
                canCreate={!isReadOnly && !!name?.trim()}
                onCreateApp={(configToken, appName) =>
                  slackQuickSetup.onCreateApp(form.getValues(), configToken, appName)
                }
              />
            ) : (
              <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
                <SlackManualSetup
                  appId={slackAppId}
                  credentialFields={
                    <div className="flex flex-col gap-3">
                      {providerCredentials
                        // The redirect URL is optional and the manifest already sets Novu's callback.
                        .filter((credential) => credential.key !== CredentialsKeyEnum.RedirectUrl)
                        .map((credential) => (
                          <CredentialSection
                            key={credential.key}
                            credential={credential}
                            control={control}
                            isReadOnly={isReadOnly}
                            integrationId={integration?._id}
                          />
                        ))}
                    </div>
                  }
                />
              </Protect>
            )}
          </SetupCard>
          <AdvancedSettings>
            {generalSettings}
            <IntegrationConditionsDrawer
              control={control}
              setValue={setValue}
              legacyConditions={integration?.conditions}
              isReadOnly={isReadOnly}
            />
          </AdvancedSettings>
        </FormRoot>
      </Form>
    );
  }

  return (
    <Form {...form}>
      <FormRoot
        id={`integration-configuration-form-${provider.id}`}
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        <ProviderDeprecationNotice provider={provider} replaceOnNavigate={mode === 'create'} />
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
        {!isAgentOnboarding && (
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
                  setValue={setValue}
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
        )}

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

        {!isDemo &&
          !isAgentOnboarding &&
          ((integration && integration.channel === ChannelTypeEnum.IN_APP && !integration.connected) ||
            provider?.docReference) && (
            <div className="p-3">
              {integration && integration.channel === ChannelTypeEnum.IN_APP && !integration.connected ? (
                <InlineToast
                  variant={'tip'}
                  title="Integrate in less than 4 minutes"
                  ctaLabel="Get started"
                  onCtaClick={() => navigate(`${ROUTES.INBOX_EMBED}?environmentId=${integration._environmentId}`)}
                />
              ) : (
                provider?.docReference && (
                  <InlineToast
                    variant={'tip'}
                    title="Configure Integration"
                    description="To learn more about how to configure your integration, please refer to the documentation."
                    ctaLabel="View Guide"
                    onCtaClick={() => {
                      window.open(provider.docReference ?? '', '_blank');
                    }}
                  />
                )
              )}
            </div>
          )}

        {hasCredentialFields && (
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
                  <AccordionContent>{credentialFields}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </Protect>
          </div>
        )}

        {!isAgentOnboarding && (
          <IntegrationConditionsDrawer
            control={control}
            setValue={setValue}
            legacyConditions={integration?.conditions}
            isReadOnly={isReadOnly}
          />
        )}
      </FormRoot>
    </Form>
  );
}
