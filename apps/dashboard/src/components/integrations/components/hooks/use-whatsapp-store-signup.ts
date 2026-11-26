import {
  ChatProviderIdEnum,
  FeatureFlagsKeysEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import { type Dispatch, type MutableRefObject, type SetStateAction, useRef, useState } from 'react';
import {
  type CreateIntegrationData,
  completeWhatsAppEmbeddedSignup,
  type WhatsAppEmbeddedSignupResult,
} from '@/api/integrations';
import type { EmbeddedSignupCompletion } from '@/components/agents/whatsapp-embedded-signup-button';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { isWhatsAppEmbeddedSignupConfigured } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import type { IntegrationFormData } from '../../types';

/** The integration a Quick setup made on the server, with the environment it lives in. */
export type QuickSetupResult = {
  integrationId: string;
  environmentId: string;
  /** Slack: the app Novu created. Microsoft Teams: the client ID of the app registration Novu created. */
  appId?: string;
  /** Microsoft Teams: true once the Microsoft sign-in was opened, from when the Azure resources are polled. */
  isAzureSetupStarted?: boolean;
  /** Microsoft Teams: counts the Azure setups started. Each one creates a new app registration. */
  azureSetupAttempt?: number;
  /** Microsoft Teams: the client ID an earlier Azure setup saved, which the next one replaces. */
  staleAppId?: string;
  /** WhatsApp: what Embedded Signup saves the credentials onto, and the number once it has. */
  integrationIdentifier?: string;
  isWhatsAppConnected?: boolean;
  connectedPhone?: string;
};

/**
 * WhatsApp's Quick setup in the "Connect provider" sheet: once Meta's Embedded Signup popup closes, creates
 * the integration and trades the signup code for its credentials.
 */
export function useWhatsAppStoreSignup({
  enabled,
  provider,
  environments,
  quickSetupResult,
  setQuickSetupResult,
  setupAttemptRef,
  createIntegration,
  onSaved,
}: {
  /** True on the configure step of a provider that uses the setup layout. */
  enabled: boolean;
  provider?: IProviderConfig;
  environments?: IEnvironment[];
  quickSetupResult?: QuickSetupResult;
  setQuickSetupResult: Dispatch<SetStateAction<QuickSetupResult | undefined>>;
  /** Bumped when the sheet moves to another provider, so a late reply can tell it is stale. */
  setupAttemptRef: MutableRefObject<number>;
  createIntegration: (data: CreateIntegrationData) => Promise<{ data: IIntegration }>;
  onSaved: () => void;
}) {
  // Embedded Signup needs Novu's Tech Provider app; without it WhatsApp sets up manually, as before.
  const isAvailable =
    useFeatureFlag(FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED, false) &&
    isWhatsAppEmbeddedSignupConfigured();
  const [isConnecting, setIsConnecting] = useState(false);
  // A ref, not the state: two calls in the same render would both read the state as false.
  const isConnectingRef = useRef(false);

  async function completeSignup(
    data: IntegrationFormData,
    completion: EmbeddedSignupCompletion
  ): Promise<WhatsAppEmbeddedSignupResult> {
    const attempt = setupAttemptRef.current;
    const isCurrent = () => attempt === setupAttemptRef.current;
    // Once the integration exists, it stays in its environment, whatever the pills say.
    const environmentId = quickSetupResult?.environmentId ?? data.environmentId;
    const environment = environments?.find((env) => env._id === environmentId);
    if (!provider || !environment) throw new Error('Pick an environment first.');
    // Two signups would save onto the same integration, and the slower reply could show the wrong number.
    if (isConnectingRef.current) throw new Error('A WhatsApp signup is already being saved. Wait for it to finish.');

    isConnectingRef.current = true;
    setIsConnecting(true);

    try {
      // Reuse the integration from an earlier attempt, so a retry doesn't create a second one.
      let integrationId = quickSetupResult?.integrationId;
      let integrationIdentifier = quickSetupResult?.integrationIdentifier;
      if (!integrationId || !integrationIdentifier) {
        const created = await createIntegration({
          providerId: provider.id,
          channel: provider.channel,
          credentials: {},
          configurations: data.configurations,
          name: data.name,
          identifier: data.identifier,
          // Paused until setup finishes: an unfinished one with no credentials mustn't take over sends.
          // "Connect provider" then saves the form's own Active setting.
          active: false,
          _environmentId: environment._id,
          rules: data.rules ?? null,
        });
        integrationId = created.data._id;
        integrationIdentifier = created.data.identifier;
        if (isCurrent()) setQuickSetupResult({ integrationId, integrationIdentifier, environmentId: environment._id });
      }

      const result = await completeWhatsAppEmbeddedSignup({ ...completion, integrationIdentifier }, environment);
      onSaved();

      if (result.success && isCurrent()) {
        setQuickSetupResult({
          integrationId,
          integrationIdentifier,
          environmentId: environment._id,
          isWhatsAppConnected: true,
          connectedPhone: result.displayPhoneNumber,
        });
        showSuccessToast('WhatsApp number connected. Its credentials are saved.');
      }

      return result;
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }

  /** What IntegrationSettings needs to show Quick setup; undefined where only Manual is on offer. */
  const quickSetup =
    enabled && isAvailable && provider?.id === ChatProviderIdEnum.WhatsAppBusiness
      ? {
          isConnected: !!quickSetupResult?.isWhatsAppConnected,
          isConnecting,
          connectedPhone: quickSetupResult?.connectedPhone,
          isEnvironmentLocked: isConnecting || !!quickSetupResult,
          completeSignup,
        }
      : undefined;

  return { quickSetup, isConnecting };
}
