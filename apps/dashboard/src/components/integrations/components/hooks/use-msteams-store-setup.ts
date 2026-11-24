import {
  ChatProviderIdEnum,
  FeatureFlagsKeysEnum,
  type IEnvironment,
  type IIntegration,
  type IProviderConfig,
} from '@novu/shared';
import { type Dispatch, type MutableRefObject, type SetStateAction, useEffect, useRef, useState } from 'react';
import {
  type CreateIntegrationData,
  getAzureSetupOauthUrl,
  getIntegrations,
  getMsTeamsArmTemplateDeployUrl,
  getMsTeamsHealthCheck,
  type MsTeamsHealthCheckResult,
  updateIntegration,
} from '@/api/integrations';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import type { IntegrationFormData } from '../../types';
import { cleanCredentials } from '../utils/helpers';
import type { QuickSetupResult } from './use-whatsapp-store-signup';

const HEALTH_POLL_INTERVAL_MS = 5000;

/** The client ID the Azure setup saved on the integration, or undefined while it isn't there yet. */
async function readClientId(integrationId: string, environment: IEnvironment): Promise<string | undefined> {
  try {
    const integrations = await getIntegrations({ environment });
    const clientId = integrations.find((integration) => integration._id === integrationId)?.credentials?.clientId;

    return typeof clientId === 'string' && clientId ? clientId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Polls the readiness of the Azure resources until all of them are ready and the client ID is known.
 * Returns the function that stops it.
 */
function watchAzureSetup(
  integrationId: string,
  environment: IEnvironment,
  handlers: { onHealth: (health: MsTeamsHealthCheckResult) => void; onAppId: (clientId: string) => void }
): () => void {
  let isCancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hasAppId = false;

  const poll = async () => {
    // Nothing is saved until the Microsoft sign-in finishes, so early checks can fail. Keep polling.
    const result = await getMsTeamsHealthCheck(integrationId, environment).catch(() => undefined);
    // The app registration is the first thing Novu creates; its client ID is what the app package needs.
    const clientId =
      result?.appRegistration === 'ready' && !hasAppId ? await readClientId(integrationId, environment) : undefined;
    if (isCancelled) return;

    if (result) handlers.onHealth(result);

    if (clientId) {
      hasAppId = true;
      handlers.onAppId(clientId);
    }

    if (result?.allReady && hasAppId) return;

    timer = setTimeout(poll, HEALTH_POLL_INTERVAL_MS);
  };

  void poll();

  return () => {
    isCancelled = true;
    clearTimeout(timer);
  };
}

/** The integration as the form has it, with no credentials yet: the Azure setup saves those on the server. */
function emptyIntegrationOf(
  provider: IProviderConfig,
  environment: IEnvironment,
  data: IntegrationFormData
): CreateIntegrationData {
  return {
    providerId: provider.id,
    channel: provider.channel,
    credentials: {},
    configurations: data.configurations,
    name: data.name,
    identifier: data.identifier,
    active: data.active,
    _environmentId: environment._id,
    rules: data.rules ?? null,
  };
}

/** Creates the integration, or saves the given credentials onto the one that already exists. Returns its ID. */
async function saveIntegration(
  existingId: string | undefined,
  integration: CreateIntegrationData,
  environment: IEnvironment,
  createIntegration: (data: CreateIntegrationData) => Promise<{ data: IIntegration }>
): Promise<string> {
  if (!existingId) return (await createIntegration(integration)).data._id;

  if (Object.keys(integration.credentials).length > 0) {
    await updateIntegration(existingId, { credentials: integration.credentials, check: false }, environment);
  }

  return existingId;
}

/** Sends the tab opened on the click to the URL, or opens a new one if it was blocked or closed. */
function openIn(tab: Window | null, url: string) {
  if (tab && !tab.closed) {
    tab.location.href = url;
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Microsoft Teams' Quick setup in the "Connect provider" sheet. "Set Up Azure" creates the integration and
 * opens Microsoft's sign-in; Novu then creates the Azure resources and saves the credentials on the server.
 * The health check is polled until they are there.
 */
export function useMsTeamsStoreSetup({
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
  const isAvailable = useFeatureFlag(FeatureFlagsKeysEnum.IS_MSTEAMS_QUICK_SETUP_ENABLED, false);
  const isMsTeams = enabled && provider?.id === ChatProviderIdEnum.MsTeams;
  const isActive = isMsTeams && isAvailable;
  const [isStarting, setIsStarting] = useState(false);
  // A ref, not the state: two clicks in the same render would both read the state as false.
  const isStartingRef = useRef(false);
  const [health, setHealth] = useState<MsTeamsHealthCheckResult>();

  const integrationId = quickSetupResult?.integrationId;
  const isStarted = !!quickSetupResult?.isAzureSetupStarted;
  const environment = environments?.find((env) => env._id === quickSetupResult?.environmentId);

  // biome-ignore lint/correctness/useExhaustiveDependencies: restarts only for another integration or environment
  useEffect(() => {
    if (!isActive || !integrationId || !environment || !isStarted) {
      setHealth(undefined);

      return;
    }

    return watchAzureSetup(integrationId, environment, {
      onHealth: setHealth,
      onAppId: (clientId) => {
        setQuickSetupResult((previous) =>
          previous?.integrationId === integrationId ? { ...previous, appId: clientId } : previous
        );
        onSaved();
      },
    });
  }, [isActive, integrationId, environment?._id, isStarted]);

  /**
   * Opens a Microsoft page that needs the integration to exist: creates it first, or saves the typed
   * credentials onto the one an earlier attempt made. Called from the click itself, so the browser lets the
   * tab open.
   */
  function openForIntegration(
    data: IntegrationFormData,
    action: {
      credentials: Record<string, unknown>;
      getUrl: (integrationId: string, environment: IEnvironment) => Promise<string>;
      /** True when the page saves credentials on the server, which the health check then waits for. */
      isAzureSetup: boolean;
      errorMessage: string;
    }
  ) {
    if (isStartingRef.current) return;

    const attempt = setupAttemptRef.current;
    const isCurrent = () => attempt === setupAttemptRef.current;
    // Once the integration exists, it stays in its environment, whatever the pills say.
    const environmentId = quickSetupResult?.environmentId ?? data.environmentId;
    const targetEnvironment = environments?.find((env) => env._id === environmentId);

    if (!provider || !targetEnvironment) {
      showErrorToast('Pick an environment first.');

      return;
    }

    const tab = window.open('', '_blank');
    isStartingRef.current = true;
    setIsStarting(true);

    const existingId = quickSetupResult?.integrationId;

    void (async () => {
      try {
        const integrationOfForm = {
          ...emptyIntegrationOf(provider, targetEnvironment, data),
          credentials: action.credentials,
        };
        // Reuse the integration from an earlier attempt, so a retry doesn't create a second one.
        const startedId = await saveIntegration(existingId, integrationOfForm, targetEnvironment, createIntegration);
        if (!existingId && isCurrent()) {
          setQuickSetupResult({ integrationId: startedId, environmentId: targetEnvironment._id });
        }

        openIn(tab, await action.getUrl(startedId, targetEnvironment));
        onSaved();

        if (action.isAzureSetup && isCurrent()) {
          setQuickSetupResult((previous) => ({
            integrationId: startedId,
            environmentId: targetEnvironment._id,
            appId: previous?.integrationId === startedId ? previous.appId : undefined,
            isAzureSetupStarted: true,
          }));
        }
      } catch (error) {
        tab?.close();
        showErrorToast(error instanceof Error ? error.message : action.errorMessage);
      } finally {
        isStartingRef.current = false;
        setIsStarting(false);
      }
    })();
  }

  const isEnvironmentLocked = isStarting || !!quickSetupResult;

  /** What IntegrationSettings needs to show Quick setup; undefined where only Manual is on offer. */
  const quickSetup = isActive
    ? {
        appId: quickSetupResult?.appId,
        health,
        isStarting,
        isStarted,
        isEnvironmentLocked,
        onSetUpAzure: (data: IntegrationFormData) =>
          openForIntegration(data, {
            credentials: {},
            getUrl: async (id, env) => (await getAzureSetupOauthUrl(id, env)).url,
            isAzureSetup: true,
            errorMessage: "Couldn't start the Azure setup. Try again.",
          }),
      }
    : undefined;

  /** Manual's "Deploy to Azure": the template is built from the saved credentials, so they are saved first. */
  const manualSetup = isMsTeams
    ? {
        isDeploying: isStarting,
        isEnvironmentLocked,
        onDeployBot: (data: IntegrationFormData) =>
          openForIntegration(data, {
            credentials: cleanCredentials(data.credentials),
            getUrl: async (id, env) => (await getMsTeamsArmTemplateDeployUrl(id, env)).deployUrl,
            isAzureSetup: false,
            errorMessage: "Couldn't open the Azure deployment. Try again.",
          }),
      }
    : undefined;

  return { quickSetup, manualSetup, isStarting };
}
