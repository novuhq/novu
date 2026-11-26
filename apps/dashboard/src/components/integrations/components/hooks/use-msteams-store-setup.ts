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
/** How many polls in a row find nothing saved, with the sign-in tab gone, before the setup counts as stalled. */
const STALLED_AFTER_POLLS = 3;

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
  handlers: {
    onHealth: (health: MsTeamsHealthCheckResult) => void;
    onAppId: (clientId: string) => void;
    /** The sign-in tab is gone and nothing was saved: it was closed, denied, or the setup failed early. */
    onStalled: (isStalled: boolean) => void;
  },
  options: {
    /** The client ID an earlier attempt saved. It stays on the integration until this attempt replaces it. */
    staleClientId?: string;
    isSignInOpen: () => boolean;
  }
): () => void {
  const { staleClientId, isSignInOpen } = options;
  let isCancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastClientId: string | undefined;
  let pollsWithNothingSaved = 0;

  const poll = async () => {
    // Nothing is saved until the Microsoft sign-in finishes, so early checks can fail. Keep polling.
    const result = await getMsTeamsHealthCheck(integrationId, environment).catch(() => undefined);
    // The app registration is the first thing Novu creates; its client ID is what the app package needs.
    // Read until this attempt's ID shows up, then no more: the list holds every integration of the environment.
    const clientId =
      result?.appRegistration === 'ready' && !lastClientId ? await readClientId(integrationId, environment) : undefined;
    if (isCancelled) return;

    if (clientId && clientId !== staleClientId) {
      lastClientId = clientId;
      handlers.onAppId(clientId);
    }

    // With no credentials yet the health check answers "failed" for everything, and on a retry it still
    // describes the earlier attempt. Neither is this attempt failing, so its checks read as waiting until
    // its credentials are there.
    if (result && lastClientId) handlers.onHealth(result);

    if (result?.allReady && lastClientId) return;

    // The callback page closes itself whether the setup worked or not, so a closed tab with nothing saved a
    // few polls later is the only sign that it didn't. Polling goes on: a slow save still clears the notice.
    const isNothingSaved = result?.appRegistration === 'failed' || (!!clientId && clientId === staleClientId);
    pollsWithNothingSaved = isNothingSaved && !isSignInOpen() ? pollsWithNothingSaved + 1 : 0;
    handlers.onStalled(pollsWithNothingSaved >= STALLED_AFTER_POLLS);

    timer = setTimeout(poll, HEALTH_POLL_INTERVAL_MS);
  };

  void poll();

  return () => {
    isCancelled = true;
    clearTimeout(timer);
  };
}

/** The integration as the form has it, paused and with no credentials yet: the Azure setup saves those on the server. */
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
    // Paused until setup finishes: an unfinished one with no credentials mustn't take over sends.
    // "Connect provider" then saves the form's own Active setting.
    active: false,
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

/** The setup state after a Microsoft page was opened for the integration. */
function nextSetupResult(
  previous: QuickSetupResult | undefined,
  opened: { integrationId: string; environmentId: string; isAzureSetup: boolean; savedBefore?: string }
): QuickSetupResult {
  const base = { integrationId: opened.integrationId, environmentId: opened.environmentId };

  // Manual just replaced whatever credentials Quick setup had saved: its client ID and progress no longer
  // describe this integration, so Quick setup starts over.
  if (!opened.isAzureSetup) return base;

  const earlier = previous?.integrationId === opened.integrationId ? previous : undefined;

  // A retry creates another app registration: forget the earlier client ID, so the app package waits for
  // this attempt's.
  return {
    ...base,
    staleAppId: opened.savedBefore ?? earlier?.appId ?? earlier?.staleAppId,
    isAzureSetupStarted: true,
    azureSetupAttempt: (earlier?.azureSetupAttempt ?? 0) + 1,
  };
}

/** Sends the tab opened on the click to the URL, or opens a new one if it was blocked or closed. */
function openIn(tab: Window | null, url: string): Window | null {
  if (tab && !tab.closed) {
    tab.location.href = url;

    return tab;
  }

  return window.open(url, '_blank');
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
  const [isStalled, setIsStalled] = useState(false);
  /** The Microsoft sign-in tab of the running Azure setup. */
  const signInTabRef = useRef<Window | null>(null);

  const integrationId = quickSetupResult?.integrationId;
  const isStarted = !!quickSetupResult?.isAzureSetupStarted;
  const environment = environments?.find((env) => env._id === quickSetupResult?.environmentId);

  const azureSetupAttempt = quickSetupResult?.azureSetupAttempt;
  const staleAppId = quickSetupResult?.staleAppId;

  // biome-ignore lint/correctness/useExhaustiveDependencies: restarts only for another integration, environment or attempt
  useEffect(() => {
    if (!isActive || !integrationId || !environment || !isStarted) {
      setHealth(undefined);
      setIsStalled(false);

      return;
    }

    setHealth(undefined);
    setIsStalled(false);

    return watchAzureSetup(
      integrationId,
      environment,
      {
        onHealth: setHealth,
        onStalled: setIsStalled,
        onAppId: (clientId) => {
          setQuickSetupResult((previous) =>
            previous?.integrationId === integrationId ? { ...previous, appId: clientId } : previous
          );
          onSaved();
        },
      },
      { staleClientId: staleAppId, isSignInOpen: () => !!signInTabRef.current && !signInTabRef.current.closed }
    );
  }, [isActive, integrationId, environment?._id, isStarted, azureSetupAttempt]);

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
      onOpened: (tab: Window | null) => void;
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

        // On a retry, what the earlier attempt saved is still there until this one replaces it. Read it now,
        // so the watcher can tell the two apart even if it never saw the earlier one.
        const savedBefore =
          action.isAzureSetup && existingId ? await readClientId(startedId, targetEnvironment) : undefined;

        action.onOpened(openIn(tab, await action.getUrl(startedId, targetEnvironment)));
        onSaved();

        if (isCurrent()) {
          setQuickSetupResult((previous) =>
            nextSetupResult(previous, {
              integrationId: startedId,
              environmentId: targetEnvironment._id,
              isAzureSetup: action.isAzureSetup,
              savedBefore,
            })
          );
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
        isStalled,
        isEnvironmentLocked,
        onSetUpAzure: (data: IntegrationFormData) =>
          openForIntegration(data, {
            credentials: {},
            getUrl: async (id, env) => (await getAzureSetupOauthUrl(id, env)).url,
            isAzureSetup: true,
            errorMessage: "Couldn't start the Azure setup. Try again.",
            onOpened: (tab) => {
              signInTabRef.current = tab;
            },
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
            onOpened: () => undefined,
          }),
      }
    : undefined;

  return { quickSetup, manualSetup, isStarting };
}
