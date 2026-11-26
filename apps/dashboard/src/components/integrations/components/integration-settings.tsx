import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  CredentialsKeyEnum,
  EmailProviderIdEnum,
  getUnusedTwilioAuthCredentialKeys,
  IIntegration,
  IProviderConfig,
  PermissionsEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  slackConfig,
  ToolProviderIdEnum,
} from '@novu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { RiInputField } from 'react-icons/ri';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { MsTeamsHealthCheckResult, WhatsAppEmbeddedSignupResult } from '@/api/integrations';
import type { EmbeddedSignupCompletion } from '@/components/agents/whatsapp-embedded-signup-button';
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
import { isIntegrationFailing } from '../utils/integration-health';
import { CredentialSection } from './credential-section';
import { GuidedCredentialsSetup } from './guided-credentials-setup';
import { IntegrationConditionsDrawer } from './integration-conditions-drawer';
import { GeneralSettings } from './integration-general-settings';
import { MsTeamsManualSetup } from './msteams-manual-setup';
import { MsTeamsQuickSetup } from './msteams-quick-setup';
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
import { TelegramQuickSetup } from './telegram-quick-setup';
import { ToolWebhookSettings } from './tool-webhook-settings';
import { useIsActivityTrackingAvailable } from './use-is-activity-tracking-available';
import { useSlackCredentialsPasteFallback } from './use-slack-credentials-paste-fallback';
import { useWhatsAppCredentialsPasteFallback } from './use-whatsapp-credentials-paste-fallback';
import {
  ACTIVITY_TRACKING_ENABLER,
  hasGuidedActivityTracking,
  isDemoIntegration,
  isGuidedSetupProvider,
  isSecureCredential,
  usesProviderSetupLayout,
} from './utils/helpers';
import { mergeSavedValues } from './utils/merge-saved-values';
import { WhatsAppCredentialsPaste } from './whatsapp-credentials-paste';
import { WhatsAppCredentialsValidator } from './whatsapp-credentials-validator';
import { WhatsAppManualSetup } from './whatsapp-manual-setup';
import { WhatsAppQuickSetup } from './whatsapp-quick-setup';

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
  /** Turns on the Quick setup / Manual layout in the create flow, for providers that have it. */
  setupLayout?: boolean;
  /** Slack's Quick setup, which creates the app and the integration on the server. */
  slackQuickSetup?: {
    /** The Slack app Novu created, once "Create app" has run. */
    appId?: string;
    isCreating: boolean;
    /** True once creation has started: the integration belongs to that environment from then on. */
    isEnvironmentLocked: boolean;
    onCreateApp: (data: IntegrationFormData, configToken: string, appName: string) => void;
  };
  /** Microsoft Teams' Quick setup: Novu creates the Azure resources. Leave out where it isn't available. */
  msTeamsQuickSetup?: {
    /** The client ID of the app registration Novu created, once its credentials are saved. */
    appId?: string;
    health?: MsTeamsHealthCheckResult;
    isStarting: boolean;
    isStarted: boolean;
    /** True when the sign-in tab is gone and nothing was saved. */
    isStalled: boolean;
    /** True once the setup has started: the integration belongs to that environment from then on. */
    isEnvironmentLocked: boolean;
    onSetUpAzure: (data: IntegrationFormData) => void;
  };
  /** Microsoft Teams' Manual setup: "Deploy to Azure" saves the typed credentials on a new integration first. */
  msTeamsManualSetup?: {
    isDeploying: boolean;
    /** True once the integration exists: it belongs to that environment from then on. */
    isEnvironmentLocked: boolean;
    onDeployBot: (data: IntegrationFormData) => void;
  };
  /** WhatsApp's Quick setup: Meta's Embedded Signup. Leave out where it isn't available; only Manual shows then. */
  whatsAppQuickSetup?: {
    /** True once the signup finished and the credentials are saved on the server. */
    isConnected: boolean;
    /** True while a signup is being saved; a second one can't start until it ends. */
    isConnecting: boolean;
    connectedPhone?: string;
    /** True once the signup has started: the integration belongs to that environment from then on. */
    isEnvironmentLocked: boolean;
    completeSignup: (
      data: IntegrationFormData,
      completion: EmbeddedSignupCompletion
    ) => Promise<WhatsAppEmbeddedSignupResult>;
  };
};

const SUBSCRIBERS_DOCS_URL = 'https://docs.novu.co/platform/concepts/subscribers';
/** How a subscriber's device tokens are set, in each push provider's integration docs. */
const PUSH_DEVICE_TOKENS_DOCS: Partial<Record<string, { url: string; tokenName: string; appName: string }>> = {
  [PushProviderIdEnum.FCM]: {
    url: 'https://docs.novu.co/platform/integrations/push/fcm',
    tokenName: 'FCM',
    appName: 'app',
  },
  [PushProviderIdEnum.APNS]: {
    url: 'https://docs.novu.co/platform/integrations/push/apns',
    tokenName: 'APNs',
    appName: 'iOS app',
  },
};
const TEAMS_CONNECT_DOCS_URL = 'https://docs.novu.co/platform/integrations/chat/ms-teams-connect';
const SLACK_CONNECT_DOCS_URL = 'https://docs.novu.co/platform/integrations/chat/slack';
/** The TelegramConnectButton section of the Telegram integration docs: how subscribers link their chat. */
const TELEGRAM_CONNECT_DOCS_URL =
  'https://docs.novu.co/platform/integrations/chat/telegram#from-your-app-with-@novu/react';

function getSetupDuration(providerId: string, mode: ProviderSetupMode) {
  if (providerId === ChatProviderIdEnum.Telegram) return '~1 min';
  if (providerId === PushProviderIdEnum.APNS) return '~3 min';
  if (providerId === EmailProviderIdEnum.SES) return '~4 min';
  if (isGuidedSetupProvider(providerId)) return '~2 min';
  if (providerId === ChatProviderIdEnum.MsTeams) return mode === 'quick' ? '~4 min' : '~15 min';
  if (mode === 'quick') return '~2 min';

  return providerId === ChatProviderIdEnum.WhatsAppBusiness ? '~10 min' : '~5 min';
}

function resolveSetupMode({
  hasQuickSetup,
  isLocked,
  selected,
}: {
  hasQuickSetup: boolean;
  isLocked: boolean;
  selected: ProviderSetupMode;
}): ProviderSetupMode {
  if (!hasQuickSetup) return 'manual';
  if (isLocked) return 'quick';

  return selected;
}

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

function toFormValues(integration: IIntegration): Omit<IntegrationFormData, 'check'> {
  return {
    name: integration.name,
    identifier: integration.identifier,
    active: integration.active,
    primary: integration.primary ?? false,
    credentials: integration.credentials as Record<string, string>,
    configurations: integration.configurations as Record<string, string>,
    environmentId: integration._environmentId,
    rules: integration.rules ?? null,
  };
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
  setupLayout,
  slackQuickSetup,
  whatsAppQuickSetup,
  msTeamsQuickSetup,
  msTeamsManualSetup,
  layout = 'default',
}: IntegrationConfigurationProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentEnvironment, environments } = useEnvironment();
  // A Copilot setup link can name the environment to connect the provider in.
  const linkedEnvironmentId = searchParams.get('environmentId');
  const defaultEnvironmentId = environments?.some((env) => env._id === linkedEnvironmentId)
    ? linkedEnvironmentId
    : currentEnvironment?._id;

  const isFailing = !!integration && isIntegrationFailing(integration);
  const isTrackingAvailable = useIsActivityTrackingAvailable();
  const form = useForm<IntegrationFormData>({
    mode: 'all',
    reValidateMode: 'onChange',
    defaultValues: integration
      ? toFormValues(integration)
      : {
          name: provider?.displayName ?? '',
          identifier: generateSlug(provider?.displayName ?? ''),
          active: true,
          primary: true,
          // APNs' setup starts on Production, as most device tokens come from TestFlight and App Store builds. A
          // string, as the form types it; the API turns it into the boolean the integration stores.
          credentials:
            setupLayout && provider?.id === PushProviderIdEnum.APNS ? { [CredentialsKeyEnum.Secure]: 'true' } : {},
          // The email setup guides turn on activity tracking where it is available.
          // A string, as the form types it; the integration schema stores it as a boolean.
          configurations:
            setupLayout && hasGuidedActivityTracking(provider?.id) && isTrackingAvailable
              ? { [ACTIVITY_TRACKING_ENABLER]: 'true' }
              : {},
          environmentId: defaultEnvironmentId ?? '',
          rules: null,
        },
  });

  const { handleSubmit, control, setValue, formState } = form;

  // The Copilot can change the integration while its sheet is open: take the new values, keeping what the user changed,
  // so saving doesn't send the old ones back.
  const savedValuesKey = integration ? JSON.stringify(toFormValues(integration)) : undefined;
  const savedValuesRef = useRef(integration ? toFormValues(integration) : undefined);
  useEffect(() => {
    const saved = savedValuesRef.current;
    if (!integration || savedValuesKey === JSON.stringify(saved)) return;

    const next = toFormValues(integration);
    savedValuesRef.current = next;
    if (!saved) return;

    const values = mergeSavedValues(saved, form.getValues(), next) as IntegrationFormData;
    // The new saved values become the defaults, so the form stays dirty only with the user's own changes.
    form.reset(next);
    form.reset(values, { keepDefaultValues: true });
  }, [integration, savedValuesKey, form]);

  // A setup link opened cold mounts the form before the environments load, with no environment to connect in yet.
  useEffect(() => {
    if (mode === 'create' && defaultEnvironmentId && !form.getValues('environmentId')) {
      setValue('environmentId', defaultEnvironmentId);
    }
  }, [mode, defaultEnvironmentId, form, setValue]);

  const usesSetupLayout =
    mode === 'create' &&
    usesProviderSetupLayout(provider.id) &&
    !!setupLayout &&
    !(agentOnboarding || searchParams.get('agent_onboarding') === 'true');
  const [selectedSetupMode, setSetupMode] = useState<ProviderSetupMode>('quick');
  // Only providers with a Quick setup have the two modes; the rest set up one way.
  const hasQuickSetup = !!slackQuickSetup || !!whatsAppQuickSetup || !!msTeamsQuickSetup;
  // Firebase's and APNs' two modes both run in the browser: Quick setup uploads the key file, Manual pastes it.
  const hasLocalSetupModes =
    usesSetupLayout && (provider.id === PushProviderIdEnum.FCM || provider.id === PushProviderIdEnum.APNS);
  // A number connected by Embedded Signup runs on Novu's Meta app. Credentials typed in Manual would be saved
  // onto that same integration and still resolve to Novu's app, so the mode stays on Quick setup from then on.
  const isSetupModeLocked = !!whatsAppQuickSetup?.isConnected;
  const hasSetupModeSwitch = (hasQuickSetup || hasLocalSetupModes) && !isSetupModeLocked;
  const setupMode = resolveSetupMode({
    hasQuickSetup: hasQuickSetup || hasLocalSetupModes,
    isLocked: isSetupModeLocked,
    selected: selectedSetupMode,
  });
  // Quick setup saves the credentials on the server, so the form is ready once that has happened.
  const isQuickSetupMode = usesSetupLayout && hasQuickSetup && setupMode === 'quick';
  const isQuickSetupDone = !!slackQuickSetup?.appId || !!whatsAppQuickSetup?.isConnected || !!msTeamsQuickSetup?.appId;
  const isFormReady = isQuickSetupMode ? isQuickSetupDone : formState.isValid;

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
  const typedClientId = useWatch({ control, name: `credentials.${CredentialsKeyEnum.ClientId}` });
  const typedSecretKey = useWatch({ control, name: `credentials.${CredentialsKeyEnum.SecretKey}` });
  const typedTenantId = useWatch({ control, name: `credentials.${CredentialsKeyEnum.TenantId}` });
  const trackingEnabled = useWatch({ control, name: `configurations.${ACTIVITY_TRACKING_ENABLER}` });

  // The default values are read once, and the flags that make tracking available can load after that: turn the
  // switch on when they do, unless the user has already set it.
  const shouldDefaultTrackingOn = mode === 'create' && !!setupLayout && hasGuidedActivityTracking(provider.id);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs only when tracking becomes available
  useEffect(() => {
    if (!shouldDefaultTrackingOn || !isTrackingAvailable) return;
    if (form.getFieldState(`configurations.${ACTIVITY_TRACKING_ENABLER}`).isDirty) return;
    if (form.getValues(`configurations.${ACTIVITY_TRACKING_ENABLER}`) !== undefined) return;

    form.setValue(`configurations.${ACTIVITY_TRACKING_ENABLER}`, 'true');
  }, [isTrackingAvailable, shouldDefaultTrackingOn]);
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
                // Short text fields pair up two per row in the manage drawer; secrets and the rest take the full width.
                className={cn(
                  layout === 'manage' &&
                    (credential.type !== 'string' || isSecureCredential(credential)) &&
                    'col-span-2'
                )}
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
                  rejectedMessage={
                    isFailing && isSecureCredential(credential)
                      ? `${provider.displayName} rejected this ${credential.displayName.toLowerCase()}. Paste a new one to reconnect.`
                      : undefined
                  }
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

  if (usesSetupLayout) {
    const isTelegram = provider.id === ChatProviderIdEnum.Telegram;
    const isWhatsApp = provider.id === ChatProviderIdEnum.WhatsAppBusiness;
    const isMsTeams = provider.id === ChatProviderIdEnum.MsTeams;
    const guidedSetupProviderId = isGuidedSetupProvider(provider.id) ? provider.id : undefined;
    const pushDeviceTokens = guidedSetupProviderId ? PUSH_DEVICE_TOKENS_DOCS[provider.id] : undefined;

    const generalSettings = (
      <GeneralSettings
        control={control}
        setValue={setValue}
        mode={mode}
        isReadOnly={isReadOnly}
        hidePrimarySelector={!isChannelSupportPrimary}
        disabledPrimary={!hasOtherProviders && integration?.primary}
        // Activity tracking is step 3 of the guided setups, so it isn't repeated here; the rest stays.
        configurations={
          guidedSetupProviderId
            ? provider.configurations?.filter((group) => group.groupType !== 'inboundWebhook')
            : provider.configurations
        }
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
            disabled={
              isReadOnly ||
              !!slackQuickSetup?.isEnvironmentLocked ||
              !!whatsAppQuickSetup?.isEnvironmentLocked ||
              !!msTeamsQuickSetup?.isEnvironmentLocked ||
              !!msTeamsManualSetup?.isEnvironmentLocked
            }
          />
          <SetupCard
            title={`Set up ${isMsTeams ? 'Microsoft Teams' : provider.displayName}`}
            duration={getSetupDuration(provider.id, setupMode)}
            // Telegram has one way to set up: its token field takes the token or the whole BotFather message.
            mode={hasSetupModeSwitch ? setupMode : undefined}
            onModeChange={hasSetupModeSwitch ? setSetupMode : undefined}
            footer={
              <>
                {pushDeviceTokens ? (
                  <SetupTip>
                    Register each subscriber’s {pushDeviceTokens.tokenName}{' '}
                    <code className="font-code">deviceTokens</code> from your {pushDeviceTokens.appName} so Novu can
                    reach their devices.{' '}
                    <a href={pushDeviceTokens.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : guidedSetupProviderId && provider.channel === ChannelTypeEnum.SMS ? (
                  <SetupTip>
                    Novu texts each subscriber’s <code className="font-code">phone</code>. Set it when you create or
                    identify subscribers.{' '}
                    <a href={SUBSCRIBERS_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : guidedSetupProviderId ? (
                  <SetupTip>
                    Novu emails each subscriber’s <code className="font-code">email</code>. Set it when you create or
                    identify subscribers.{' '}
                    <a href={SUBSCRIBERS_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : isMsTeams ? (
                  <SetupTip>
                    Add <code className="font-code">&lt;MsTeamsConnectButton /&gt;</code> to your app so subscribers can
                    connect their Teams workspace.{' '}
                    <a href={TEAMS_CONNECT_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : isWhatsApp ? (
                  <SetupTip>
                    Novu messages each subscriber’s <code className="font-code">phone</code>. Set it when you create or
                    identify subscribers.{' '}
                    <a href={SUBSCRIBERS_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : isTelegram ? (
                  <SetupTip>
                    Add <code className="font-code">&lt;TelegramConnectButton /&gt;</code> to your app so subscribers
                    can link their Telegram chat.{' '}
                    <a href={TELEGRAM_CONNECT_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                ) : (
                  <SetupTip>
                    Add <code className="font-code">&lt;SlackConnectButton /&gt;</code> to your app so subscribers can
                    connect their Slack workspace.{' '}
                    <a href={SLACK_CONNECT_DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline">
                      Read docs
                    </a>
                    .
                  </SetupTip>
                )}
                {provider.docReference && <SetupDocsLink href={provider.docReference} />}
              </>
            }
          >
            {guidedSetupProviderId && (
              <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
                <GuidedCredentialsSetup
                  providerId={guidedSetupProviderId}
                  provider={provider}
                  credentials={providerCredentials}
                  control={control}
                  setValue={setValue}
                  environmentName={environments?.find((environment) => environment._id === environmentId)?.name}
                  isTrackingAvailable={isTrackingAvailable}
                  isTrackingEnabled={Boolean(trackingEnabled) && trackingEnabled !== 'false'}
                  setupMode={setupMode}
                  isReadOnly={isReadOnly}
                />
              </Protect>
            )}
            {isTelegram && (
              <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
                <TelegramQuickSetup
                  control={control}
                  setValue={setValue}
                  environment={environments?.find((environment) => environment._id === environmentId)}
                  isReadOnly={isReadOnly}
                />
              </Protect>
            )}
            {isMsTeams &&
              (msTeamsQuickSetup && setupMode === 'quick' ? (
                <MsTeamsQuickSetup
                  appId={msTeamsQuickSetup.appId}
                  health={msTeamsQuickSetup.health}
                  isStarting={msTeamsQuickSetup.isStarting}
                  isStarted={msTeamsQuickSetup.isStarted}
                  isStalled={msTeamsQuickSetup.isStalled}
                  canStart={!isReadOnly && !!name?.trim()}
                  appName={name?.trim() ?? ''}
                  onSetUpAzure={() => msTeamsQuickSetup.onSetUpAzure(form.getValues())}
                />
              ) : (
                <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
                  <MsTeamsManualSetup
                    appId={typeof typedClientId === 'string' ? typedClientId : undefined}
                    appName={name?.trim() ?? ''}
                    canDeploy={!isReadOnly && !!name?.trim() && !!typedClientId && !!typedSecretKey && !!typedTenantId}
                    isDeploying={!!msTeamsManualSetup?.isDeploying}
                    onDeployBot={() => msTeamsManualSetup?.onDeployBot(form.getValues())}
                    credentialFields={
                      <div className="flex flex-col gap-3">
                        {providerCredentials
                          // Where the admin lands after consent; optional, and editable later in the drawer.
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
              ))}
            {isWhatsApp &&
              (whatsAppQuickSetup && setupMode === 'quick' ? (
                <WhatsAppQuickSetup
                  isConnected={whatsAppQuickSetup.isConnected}
                  connectedPhone={whatsAppQuickSetup.connectedPhone}
                  isConnecting={whatsAppQuickSetup.isConnecting}
                  canConnect={!isReadOnly && !!name?.trim()}
                  completeSignup={(completion) => whatsAppQuickSetup.completeSignup(form.getValues(), completion)}
                />
              ) : (
                <Protect permission={PermissionsEnum.INTEGRATION_WRITE}>
                  <WhatsAppManualSetup
                    credentialFields={
                      <div className="flex flex-col gap-3">
                        {providerCredentials.map((credential) => (
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
              ))}
            {slackQuickSetup &&
              (setupMode === 'quick' ? (
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
              ))}
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
