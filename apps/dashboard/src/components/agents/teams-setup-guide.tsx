import { MsTeamsConnectButton, MsTeamsLinkUser, useNovu } from '@novu/react';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiCheckLine, RiCloseLine, RiKey2Line, RiLoader4Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import {
  getAzureSetupOauthUrl,
  getMsTeamsArmTemplateDeployUrl,
  getMsTeamsHealthCheck,
  type HealthCheckStatus,
  type MsTeamsHealthCheckResult,
} from '@/api/integrations';
import { useConnectSubscriber } from '@/components/connect/connect-subscriber-provider';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CodeBlock } from '@/components/primitives/code-block';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { getAgentApiBaseUrl } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildAgentConnectionIdentifier } from '@/utils/connect-subscriber-id';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  type SetupMode,
  SetupModeToggle,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { buildTeamsManifest } from './teams-app-manifest';
import { downloadTeamsAppPackage } from './teams-app-package';

export type TeamsSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

type IntegrationProvisioningState = {
  status: HealthCheckStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  teamsAppCatalogId?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOAuthCallbackUrl(): string {
  return `${getAgentApiBaseUrl()}/v1/integrations/chat/oauth/callback`;
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------

function RedirectUriSection({ redirectUri }: { redirectUri: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-text-sub text-label-xs font-medium leading-5">OAuth callback URL</p>
      <div className="border-stroke-soft bg-bg-white flex h-7 items-center overflow-hidden rounded-md border shadow-xs">
        <input
          type="text"
          readOnly
          value={redirectUri}
          aria-label="OAuth callback URL"
          className="text-text-soft min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-[12px] leading-4 outline-none"
        />
        <CopyButton valueToCopy={redirectUri} size="xs" className="shrink-0 border-l border-stroke-soft" />
      </div>
    </div>
  );
}

function WebhookEndpointSection({ webhookUrl }: { webhookUrl: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-text-sub text-label-xs font-medium leading-5">Messaging endpoint (webhook URL)</p>
      <div className="border-stroke-soft bg-bg-white flex h-7 items-center overflow-hidden rounded-md border shadow-xs">
        <input
          type="text"
          readOnly
          value={webhookUrl}
          aria-label="Messaging endpoint URL"
          className="text-text-soft min-w-0 flex-1 truncate bg-transparent px-2 font-mono text-[12px] leading-4 outline-none"
        />
        <CopyButton valueToCopy={webhookUrl} size="xs" className="shrink-0 border-l border-stroke-soft" />
      </div>
    </div>
  );
}

function ManifestPreview({ manifestJson }: { manifestJson: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        className="text-text-sub hover:text-text-strong flex items-center gap-1 self-start transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <RiArrowDownSLine className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
        <span className="text-label-xs font-medium">{open ? 'Hide manifest' : 'Preview manifest.json'}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="min-w-0 overflow-hidden"
          >
            <CodeBlock code={manifestJson} language="json" title="manifest.json" className="max-h-64" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualBotDeployFallback({ webhookUrl }: { webhookUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        className="text-text-sub hover:text-text-strong flex items-center gap-1 self-start transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <RiArrowDownSLine className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')} />
        <span className="text-label-xs font-medium">
          {open ? 'Hide manual instructions' : 'Can\'t use "Deploy to Azure"? Follow manual steps'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="min-w-0 overflow-hidden"
          >
            <div className="border-stroke-soft bg-bg-weak flex flex-col gap-3 rounded-lg border p-4">
              <p className="text-text-sub text-label-xs font-medium">Manual Azure Bot deployment</p>
              <ol className="text-text-sub flex flex-col gap-1.5 pl-4 text-[12px] leading-5 [list-style:decimal]">
                <li>
                  Go to the{' '}
                  <a
                    href="https://portal.azure.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Azure Portal
                  </a>{' '}
                  and click <strong>+ Create a resource</strong> in the top-left.
                </li>
                <li>
                  Search for <strong>Azure Bot</strong> and select it from the results, then click{' '}
                  <strong>Create</strong>.
                </li>
                <li>
                  Fill in the form:
                  <ul className="mt-1 flex flex-col gap-1 pl-4 [list-style:disc]">
                    <li>
                      <strong>Bot handle:</strong> a unique name (e.g., your agent name)
                    </li>
                    <li>
                      <strong>Subscription:</strong> select your Azure subscription
                    </li>
                    <li>
                      <strong>Resource group:</strong> create new or select existing
                    </li>
                    <li>
                      <strong>Pricing tier:</strong> F0 (Free)
                    </li>
                    <li>
                      <strong>Type of App:</strong> Single Tenant
                    </li>
                    <li>
                      <strong>Creation type:</strong> Use existing app registration
                    </li>
                    <li>
                      <strong>Microsoft App ID:</strong> paste the App ID from Step 1
                    </li>
                    <li>
                      <strong>Microsoft App Tenant ID:</strong> paste the Tenant ID from Step 1
                    </li>
                  </ul>
                </li>
                <li>
                  Click <strong>Review + create</strong>, review the summary, then click <strong>Create</strong>. Wait
                  for the deployment to complete (usually 1–2 minutes).
                </li>
                <li>
                  Once deployed, click <strong>Go to resource</strong> to open the Azure Bot.
                </li>
                <li>
                  In the left sidebar, under <strong>Settings</strong>, click <strong>Configuration</strong>. In the{' '}
                  <strong>Messaging endpoint</strong> field, paste the URL below, then click <strong>Apply</strong>.
                </li>
              </ol>
              <WebhookEndpointSection webhookUrl={webhookUrl} />
              <ol
                className="text-text-sub flex flex-col gap-1.5 pl-4 text-[12px] leading-5 [list-style:decimal]"
                start={7}
              >
                <li>
                  In the left sidebar, click <strong>Channels</strong>. Click <strong>Microsoft Teams</strong> in the
                  available channels list, accept the terms, and click <strong>Apply</strong> to enable the Teams
                  channel.
                </li>
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup mode toggle
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Health-check constants and components
// ---------------------------------------------------------------------------

const HEALTH_POLL_INTERVAL_MS = 10_000;

const CHECKPOINT_LABELS: Record<keyof Omit<MsTeamsHealthCheckResult, 'allReady'>, string> = {
  appRegistration: 'App Registration',
  azureBotCreated: 'Azure Bot Created',
  teamsAppCatalog: 'Teams App Catalog',
  permissions: 'Permission Propagation',
};

function CheckpointRow({ label, status }: { label: string; status: HealthCheckStatus }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-stroke-soft bg-bg-weak">
        {status === 'ready' && <RiCheckLine className="size-3 text-success-base" />}
        {status === 'pending' && <RiLoader4Line className="size-3 animate-spin text-text-sub" />}
        {status === 'failed' && <RiCloseLine className="size-3 text-error-base" />}
      </div>
      <span
        className={cn(
          'text-label-xs',
          status === 'ready' && 'text-text-strong',
          status === 'pending' && 'text-text-sub',
          status === 'failed' && 'text-error-base'
        )}
      >
        {label}
      </span>
    </div>
  );
}

type HealthCheckViewProps = {
  integrationId: string;
  /** True while the Azure setup popup is still open, polling is suspended until credentials are saved */
  waitingForSetup: boolean;
  onReady: () => void;
  compact?: boolean;
};

function HealthCheckView({ integrationId, waitingForSetup, onReady, compact = false }: HealthCheckViewProps) {
  const { currentEnvironment } = useEnvironment();
  const [status, setStatus] = useState<MsTeamsHealthCheckResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!currentEnvironment || waitingForSetup) return;

    try {
      const result = await getMsTeamsHealthCheck(integrationId, currentEnvironment);
      setStatus(result);

      if (result.allReady) {
        stopPolling();
        onReadyRef.current();

        return;
      }
    } catch {
      // ignore transient errors and keep polling
    }
  }, [currentEnvironment, integrationId, waitingForSetup, stopPolling]);

  useEffect(() => {
    void poll();
    pollRef.current = setInterval(() => void poll(), HEALTH_POLL_INTERVAL_MS);

    return stopPolling;
  }, [poll, stopPolling]);

  const allPending: HealthCheckStatus = 'pending';
  const checkpoints = (Object.keys(CHECKPOINT_LABELS) as Array<keyof typeof CHECKPOINT_LABELS>).map((key) => ({
    key,
    label: CHECKPOINT_LABELS[key],
    status: (status ? (status[key] ?? allPending) : allPending) as HealthCheckStatus,
  }));

  const hasFailed = status?.appRegistration === 'failed' || status?.azureBotCreated === 'failed';

  return (
    <div className={cn('flex flex-col', compact ? 'w-[260px] gap-2.5' : 'gap-4')}>
      {!compact && (
        <p className="text-text-sub text-paragraph-sm">
          {waitingForSetup
            ? 'Complete authorization in the popup window. Teams readiness will be verified once setup finishes.'
            : 'Verifying that the Teams app, bot credentials, and permissions are ready. This usually takes 1–3 minutes; permissions can take up to 60 minutes to propagate.'}
        </p>
      )}

      <div className="flex flex-col gap-2.5 rounded-lg border border-stroke-soft bg-bg-weak p-4">
        {checkpoints.map(({ key, label, status: s }) => (
          <CheckpointRow key={key} label={label} status={s} />
        ))}
      </div>

      {!waitingForSetup && hasFailed && (
        <InlineToast
          variant="error"
          title="Setup error"
          description="App Registration or Azure Bot could not be verified. Please retry the Azure setup step."
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectAndLinkSection
// ---------------------------------------------------------------------------

const ENDPOINT_POLL_INTERVAL_MS = 3_000;
const ENDPOINT_POLL_GRACE_MS = 30_000;

type ConnectAndLinkSectionProps = {
  integrationIdentifier: string;
  subscriberId: string;
  connectionIdentifier: string;
  connectLabel: string;
  onFullyConnected: () => void;
};

/**
 * Renders inside a NovuProvider so it can access the Novu SDK instance.
 * Shows the MsTeamsConnectButton. After admin consent succeeds, polls for
 * the channel-endpoint (link_user leg). If the endpoint appears within the
 * grace window both steps complete silently. If it times out, a
 * MsTeamsLinkUser recovery button is surfaced as a required follow-up action.
 */
function ConnectAndLinkSection({
  integrationIdentifier,
  subscriberId,
  connectionIdentifier,
  connectLabel,
  onFullyConnected,
}: ConnectAndLinkSectionProps) {
  const novu = useNovu();
  const [needsLinkUser, setNeedsLinkUser] = useState(false);
  const [isPollingEndpoint, setIsPollingEndpoint] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // On mount, check if the workspace is already connected but the user link is
  // still missing (e.g. the user refreshed before completing the link step).
  // Admin consent creates a channelConnection; the link_user step creates a
  // channelEndpoint of type ms_teams_user. We need to check both.
  useEffect(() => {
    if (!integrationIdentifier || !connectionIdentifier) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const connResponse = await novu.channelConnections.get({ identifier: connectionIdentifier });
        if (cancelled || !connResponse.data) return;

        const epResponse = await novu.channelEndpoints.list({ integrationIdentifier, connectionIdentifier });
        if (cancelled) return;

        const hasUserEndpoint = epResponse.data?.some((ep: { type: string }) => ep.type === 'ms_teams_user') ?? false;

        if (hasUserEndpoint) {
          onFullyConnected();
        } else {
          setNeedsLinkUser(true);
        }
      } catch {
        // ignore, surfaced after the next connect attempt
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [novu, integrationIdentifier, connectionIdentifier, onFullyConnected]);

  const startEndpointPoll = useCallback(() => {
    stopPolling();
    setIsPollingEndpoint(true);
    pollStartedAtRef.current = Date.now();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await novu.channelEndpoints.list({
          integrationIdentifier,
          connectionIdentifier,
        });
        const found = response.data?.find((ep: { type: string }) => ep.type === 'ms_teams_user') ?? null;

        if (found) {
          stopPolling();
          setIsPollingEndpoint(false);
          onFullyConnected();

          return;
        }
      } catch {
        // ignore transient errors during polling
      }

      if (Date.now() - pollStartedAtRef.current >= ENDPOINT_POLL_GRACE_MS) {
        stopPolling();
        setIsPollingEndpoint(false);
        setNeedsLinkUser(true);
      }
    }, ENDPOINT_POLL_INTERVAL_MS);
  }, [novu, integrationIdentifier, connectionIdentifier, onFullyConnected, stopPolling]);

  const handleConnectSuccess = useCallback(() => {
    startEndpointPoll();
  }, [startEndpointPoll]);

  const handleLinkSuccess = useCallback(() => {
    setNeedsLinkUser(false);
    onFullyConnected();
  }, [onFullyConnected]);

  return (
    <div className="flex min-w-0 flex-col gap-3 w-full">
      {/* container={undefined} satisfies the Pick<NovuUIOptions, 'container' | 'appearance'> requirement */}
      <MsTeamsConnectButton
        integrationIdentifier={integrationIdentifier}
        subscriberId={subscriberId}
        connectionIdentifier={connectionIdentifier}
        connectLabel={connectLabel}
        connectedLabel="Connected to MS Teams"
        onConnectSuccess={handleConnectSuccess}
        container={undefined}
      />

      {isPollingEndpoint && (
        <p className="text-text-soft flex items-center gap-1.5 text-label-xs">
          <RiLoader4Line className="size-3 shrink-0 animate-spin" aria-hidden />
          Verifying user link…
        </p>
      )}

      <AnimatePresence initial={false}>
        {needsLinkUser && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex min-w-0 flex-col gap-3 w-full">
              <InlineToast
                className="w-full"
                variant="warning"
                title="One more step required"
                description="Workspace connected, but we couldn't link your Teams identity automatically. This can fail because of Azure caching, so try linking again after some time if it doesn't work right away."
              />
              <MsTeamsLinkUser
                integrationIdentifier={integrationIdentifier}
                connectionIdentifier={connectionIdentifier}
                linkLabel="Link your Teams identity ↗"
                onLinkSuccess={handleLinkSuccess}
                container={undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual flow health-check polling hook
// ---------------------------------------------------------------------------

const MANUAL_HEALTH_CHECKS = ['teamsAppCatalog', 'permissions'] as const;

type ManualHealthState = Pick<MsTeamsHealthCheckResult, 'azureBotCreated' | 'teamsAppCatalog' | 'permissions'>;

function useManualHealthPoll(integrationId: string, enabled: boolean): ManualHealthState | null {
  const { currentEnvironment } = useEnvironment();
  const [state, setState] = useState<ManualHealthState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async () => {
    if (!currentEnvironment || !enabled) return;

    try {
      const result = await getMsTeamsHealthCheck(integrationId, currentEnvironment, [...MANUAL_HEALTH_CHECKS]);
      const next: ManualHealthState = {
        azureBotCreated: null,
        teamsAppCatalog: result.teamsAppCatalog,
        permissions: result.permissions,
      };

      setState(next);

      if (next.teamsAppCatalog === 'ready' && next.permissions === 'ready') {
        stopPolling();
      }
    } catch {
      // ignore transient errors and keep polling
    }
  }, [currentEnvironment, enabled, integrationId, stopPolling]);

  useEffect(() => {
    if (!enabled) {
      stopPolling();
      setState(null);

      return stopPolling;
    }

    void poll();
    pollRef.current = setInterval(() => void poll(), HEALTH_POLL_INTERVAL_MS);

    return stopPolling;
  }, [enabled, poll, stopPolling]);

  return state;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TeamsSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: TeamsSetupGuideProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { subscriberId: connectSubscriberId, isReady: isConnectSubscriberReady } = useConnectSubscriber();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const isQuickSetupEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MSTEAMS_QUICK_SETUP_ENABLED, false);
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployedBot, setHasDeployedBot] = useState(
    () => sessionStorage.getItem(`novu:bot-deployed:${integrationId}`) === 'true'
  );
  const [isConnectingAzure, setIsConnectingAzure] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('quick');
  const [teamsAppUploaded, setTeamsAppUploaded] = useState<boolean | null>(null);
  /**
   * Whether the health-check gate has been cleared.
   * Set to `true` once the health-check poll confirms Teams readiness.
   * On page load with existing credentials we run a one-time check; if it passes immediately
   * we skip the polling UI, if not, we show the full HealthCheckView.
   */
  const [healthCheckCleared, setHealthCheckCleared] = useState(false);
  /**
   * Whether the health-check polling view is actively running.
   * Set to `true` by the OAuth popup completing, OR on mount when credentials exist but
   * the initial health check has not yet confirmed all resources are ready.
   */
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const azurePopupRef = useRef<Window | null>(null);
  const hasCheckedOnMountRef = useRef(false);
  const [initialCheckLoading, setInitialCheckLoading] = useState(false);
  const activeSetupMode = isQuickSetupEnabled ? setupMode : 'manual';

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.MsTeams),
    [integrations, integrationId]
  );

  const integrationIdentifier = selectedIntegration?.identifier ?? '';
  const connectionIdentifier =
    isUserLoaded && currentUser?._id ? buildAgentConnectionIdentifier(currentUser._id, agent._id) : null;
  const provisioning = (selectedIntegration as { provisioning?: IntegrationProvisioningState } | undefined)
    ?.provisioning;
  const credentials = selectedIntegration?.credentials as Record<string, string> | undefined;
  const appId = credentials?.clientId ?? '';
  // teamsAppCatalogId is retained for future use (e.g. restoring an "Open in Teams" deep link once catalog propagation is confirmed)
  const teamsAppCatalogId = provisioning?.teamsAppCatalogId ?? null;
  const hasCredentials = Boolean(appId && credentials?.secretKey && credentials?.tenantId);
  const hasQuickSetupProvisioning = Boolean(provisioning);
  const isExistingManualSetup = hasCredentials && !hasQuickSetupProvisioning;

  useEffect(() => {
    setIsConnected(false);
    setHealthCheckCleared(false);
    // Seed from provisioning: if a catalog ID already exists, the upload previously succeeded.
    setTeamsAppUploaded(teamsAppCatalogId !== null ? true : null);
    setShowHealthCheck(false);
    hasCheckedOnMountRef.current = false;
    setHasDeployedBot(sessionStorage.getItem(`novu:bot-deployed:${integrationId}`) === 'true');
  }, [integrationId, teamsAppCatalogId]);

  // On page load (or when credentials first appear), run a one-time health check.
  // If the Teams health check passes immediately we silently mark the gate cleared.
  // If any check is still pending/failed we show the HealthCheckView so the user
  // sees live status rather than a falsely-completed step.
  useEffect(() => {
    if (!isQuickSetupEnabled || !hasCredentials || !currentEnvironment || hasCheckedOnMountRef.current) {
      return;
    }

    if (!hasQuickSetupProvisioning) {
      setShowHealthCheck(false);
      setHealthCheckCleared(false);

      return;
    }

    hasCheckedOnMountRef.current = true;
    setInitialCheckLoading(true);

    (async () => {
      try {
        const result = await getMsTeamsHealthCheck(integrationId, currentEnvironment);

        if (result.allReady) {
          setHealthCheckCleared(true);
        } else {
          setShowHealthCheck(true);
        }
      } catch {
        // If the check itself fails, show the health-check view so polling can retry.
        setShowHealthCheck(true);
      } finally {
        setInitialCheckLoading(false);
      }
    })();
  }, [hasCredentials, hasQuickSetupProvisioning, currentEnvironment, integrationId, isQuickSetupEnabled]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const manifestJson = JSON.stringify(buildTeamsManifest(appId, agent.name), null, 2);

  const canDownload = Boolean(appId);

  const handleDownload = useCallback(() => {
    if (!canDownload) {
      return;
    }

    void downloadTeamsAppPackage(manifestJson, agent.name);
  }, [canDownload, manifestJson, agent.name]);

  const handleDeployToAzure = useCallback(async () => {
    if (!currentEnvironment || !hasCredentials || isDeploying) {
      return;
    }

    setIsDeploying(true);

    try {
      const { deployUrl } = await getMsTeamsArmTemplateDeployUrl(integrationId, currentEnvironment);
      window.open(deployUrl, '_blank', 'noopener,noreferrer');
      sessionStorage.setItem(`novu:bot-deployed:${integrationId}`, 'true');
      setHasDeployedBot(true);
    } finally {
      setIsDeploying(false);
    }
  }, [currentEnvironment, hasCredentials, integrationId, isDeploying]);

  const handleConnectToAzure = useCallback(async () => {
    if (!currentEnvironment || isConnectingAzure) {
      return;
    }

    const popup = window.open('', '_blank');
    azurePopupRef.current = popup;
    setIsConnectingAzure(true);
    // Show health-check checkpoints immediately so the user can see what's happening
    setShowHealthCheck(true);
    setHealthCheckCleared(false);

    try {
      const { url } = await getAzureSetupOauthUrl(integrationId, currentEnvironment);

      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      popup?.close();
      azurePopupRef.current = null;
      // Reset health-check state if we couldn't even get the OAuth URL
      setShowHealthCheck(false);
      throw error;
    } finally {
      setIsConnectingAzure(false);
    }
  }, [currentEnvironment, integrationId, isConnectingAzure]);

  const base = stepOffset;

  // Manual flow: poll only the checks needed to drive steps 4-6 once credentials are saved.
  const manualHealth = useManualHealthPoll(integrationId, hasCredentials && activeSetupMode === 'manual');

  // Build the webhook URL used in the manual Bot deployment instructions.
  const webhookUrl = `${getAgentApiBaseUrl()}/v1/agents/${agent._id}/webhook/${integrationIdentifier}`;

  // Steps: App Reg + Redirect URI (base+0), Graph perms (base+1),
  //        Credentials (base+2), Deploy to Azure (base+3), Download pkg (base+4), Upload (base+5), Connect (base+6)
  //
  // Steps 1-3 are gated by hasCredentials (saving valid credentials = steps 1-3 done).
  // Steps 4-7 advance automatically as the health-check reports resources ready.
  const firstIncomplete = useMemo(() => {
    if (isConnected && manualHealth?.teamsAppCatalog === 'ready') {
      return base + 7;
    }

    if (!hasCredentials) {
      return base;
    }

    // Step 4 (Deploy Azure Bot) is current until the user has clicked "Deploy to Azure".
    if (!hasDeployedBot) {
      return base + 3;
    }

    if (manualHealth?.teamsAppCatalog === 'ready') {
      return base + 6;
    }

    // Step 6 (upload) becomes active once bot is deployed.
    return base + 5;
  }, [base, hasCredentials, hasDeployedBot, isConnected, manualHealth]);

  // Quick Setup: step 0 = Set Up Azure, step 1 = health-check gate, step 2 = Add bot to Teams, step 3 = Connect MS Teams
  //
  // The health-check gate (step 1) is active when:
  //   - The OAuth popup just completed this session and we're waiting for Azure propagation, OR
  //   - The page loaded with existing credentials but the initial health check found resources not yet ready.
  // Once `healthCheckCleared` is true (either via polling or immediate pass on mount) we advance to step 2.
  const healthGateActive = showHealthCheck && !healthCheckCleared;

  const quickFirstIncomplete = useMemo(() => {
    if (isConnected) return base + 4;
    if (!hasCredentials) return base; // no credentials yet: start at step 0
    if (isExistingManualSetup) return base; // credentials exist, but Quick Setup provisioning has not run
    if (initialCheckLoading) return base + 1; // credentials exist but initial check still in-flight
    if (healthCheckCleared) return base + 2; // check confirmed all resources ready
    if (showHealthCheck) return base + 1; // health-check actively running (polling)

    return base + 1; // has credentials but neither cleared nor actively showing; uncommon edge case
  }, [
    base,
    hasCredentials,
    healthCheckCleared,
    showHealthCheck,
    isConnected,
    initialCheckLoading,
    isExistingManualSetup,
  ]);

  let quickReadinessTitle = 'Verify Teams Readiness';
  let quickReadinessDescription =
    'After Azure setup completes, Novu will verify the Teams app, Azure Bot, and permissions.';

  if (isExistingManualSetup) {
    quickReadinessTitle = 'Quick Setup Not Verified';
    quickReadinessDescription =
      'This integration was configured manually or outside Quick Setup, so Novu cannot verify Azure Bot provisioning from the setup record.';
  } else if (healthGateActive || initialCheckLoading) {
    quickReadinessDescription = 'Verifying the Teams app catalog entry, Azure Bot, and Graph permissions.';
  } else if (healthCheckCleared) {
    quickReadinessTitle = 'Teams Readiness Verified';
    quickReadinessDescription = 'Teams app, Azure Bot, and permissions are ready.';
  }

  const quickSteps = (
    <>
      {/* Step 1: Single "Set Up Azure" button (creates App Registration + Bot Service) */}
      <SetupStep
        index={base}
        status={deriveStepStatus(base, quickFirstIncomplete)}
        title="Set Up Azure"
        description={
          isExistingManualSetup ? (
            <span>
              {
                'This integration already has manually saved credentials. Run Quick Setup if you want Novu to create and track the Azure resources automatically.'
              }
            </span>
          ) : (
            <span>
              {'Authorize Novu to create an '}
              <strong>App Registration</strong>
              {', deploy an '}
              <strong>Azure Bot Service</strong>
              {
                ", and enable the Teams channel in one click. Novu will also attempt to upload the Teams app to your org's app catalog automatically."
              }
            </span>
          )
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            <SetupButton
              leadingIcon={
                isConnectingAzure ? null : (
                  <ProviderIcon
                    providerId={ChatProviderIdEnum.MsTeams}
                    providerDisplayName="MS Teams"
                    className="size-4 shrink-0"
                  />
                )
              }
              onClick={handleConnectToAzure}
              disabled={isConnectingAzure}
            >
              {isConnectingAzure ? 'Opening Azure…' : 'Set Up Azure'}
            </SetupButton>
          </div>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title={isExistingManualSetup ? 'Manual setup detected:' : 'What Novu does automatically:'}
            description={
              isExistingManualSetup ? (
                <span>
                  {
                    'Novu cannot confirm Azure Bot creation from manual setup history. Continue with Manual setup to verify the catalog and permissions, or run Quick Setup to create a tracked provisioning record.'
                  }
                </span>
              ) : (
                <span>
                  {
                    'Creates the App Registration, Bot Service resource, enables the Teams channel, and grants the required Graph permissions without manual Azure Portal steps.'
                  }
                </span>
              )
            }
          />
        }
      />

      {/* Health-check gate: runs on mount when credentials exist, and after the OAuth popup completes */}
      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, quickFirstIncomplete)}
        dimmed={!hasCredentials}
        title={quickReadinessTitle}
        description={quickReadinessDescription}
        rightContent={
          isExistingManualSetup ? (
            <SetupButton onClick={() => setSetupMode('manual')}>Continue manual setup</SetupButton>
          ) : initialCheckLoading ? (
            <p className="text-text-soft flex items-center gap-1.5 text-label-xs">
              <RiLoader4Line className="size-3 shrink-0 animate-spin" aria-hidden />
              Checking Teams readiness…
            </p>
          ) : healthGateActive ? (
            <HealthCheckView
              integrationId={integrationId}
              waitingForSetup={!hasCredentials || !hasQuickSetupProvisioning}
              onReady={() => {
                setHealthCheckCleared(true);
                setShowHealthCheck(false);
                queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
              }}
              compact
            />
          ) : undefined
        }
      />

      {/* Step 3: Add bot in Teams */}
      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, quickFirstIncomplete)}
        dimmed={!hasCredentials}
        title="Add the bot to Microsoft Teams"
        description={
          <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
            <li className="text-paragraph-xs text-text-sub">
              Click <strong>Download app package</strong> on the right to save the{' '}
              <code className="font-code text-[11px]">.zip</code> file.
            </li>
            <li className="text-paragraph-xs text-text-sub">
              Open{' '}
              <a
                href="https://teams.microsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Microsoft Teams
              </a>
              .
            </li>
            <li className="text-paragraph-xs text-text-sub">
              Click <strong>Apps</strong> in the left sidebar.
            </li>
            <li className="text-paragraph-xs text-text-sub">
              Click <strong>Manage your apps</strong> at the bottom of the panel.
            </li>
            <li className="text-paragraph-xs text-text-sub">
              Click <strong>Upload an app</strong>, then select <strong>Upload a custom app</strong>.
            </li>
            <li className="text-paragraph-xs text-text-sub">
              Choose the downloaded <code className="font-code text-[11px]">.zip</code> file, then click{' '}
              <strong>Add</strong> in the app modal.
            </li>
          </ol>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            <div className="self-start">
              <SetupButton
                leadingIcon={<Download className="size-3.5" />}
                onClick={handleDownload}
                disabled={!canDownload}
              >
                Download app package
              </SetupButton>
            </div>
            <ManifestPreview manifestJson={manifestJson} />
          </div>
        }
        extraContent={
          teamsAppUploaded !== true ? (
            <InlineToast
              className="mt-2 w-full"
              variant="tip"
              title="Organization-wide deployment:"
              description={
                <span>
                  {'For org-wide rollout, use the '}
                  <a
                    href="https://admin.teams.microsoft.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Teams Admin Center
                  </a>
                  {' → Teams apps → Manage apps → Upload new app, then users can find the bot in their app store.'}
                </span>
              }
            />
          ) : null
        }
      />

      {/* Step 4: Connect Novu to MS Teams */}
      <SetupStep
        index={base + 3}
        status={deriveStepStatus(base + 3, quickFirstIncomplete)}
        dimmed={!hasCredentials}
        title="Connect Novu to MS Teams"
        description="Grant admin consent and verify the connection by signing in with a Microsoft account that has Teams admin permissions."
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            {/* teamsAppCatalogId is available here for future use (e.g. an "Open in Teams" deep link once catalog propagation is confirmed) */}
            {hasCredentials && isConnectSubscriberReady && connectionIdentifier ? (
              <ConnectAndLinkSection
                integrationIdentifier={integrationIdentifier}
                subscriberId={connectSubscriberId}
                connectionIdentifier={connectionIdentifier}
                connectLabel={`Connect ${agent.name} ↗`}
                onFullyConnected={handleConnected}
              />
            ) : (
              <>
                <SetupButton disabled>{`Connect ${agent.name} ↗`}</SetupButton>
                {!hasCredentials && <p className="text-text-soft text-label-xs">Complete step {base} first.</p>}
                {healthGateActive && <p className="text-text-soft text-label-xs">Waiting for Teams readiness.</p>}
              </>
            )}
          </div>
        }
      />
    </>
  );

  const steps = (
    <>
      {/* Step 1: Create an App Registration */}
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncomplete)}
        title="Create an App Registration"
        description={
          <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
            <li>
              Click <strong>Open App Registrations</strong> to go to the Azure Portal. Sign in with your Microsoft
              account if prompted.
            </li>
            <li>
              Click <strong>+ New registration</strong> near the top of the page.
            </li>
            <li>
              In the <strong>Name</strong> field, enter a name for your bot (e.g., "{agent.name}").
            </li>
            <li>
              Under <strong>Supported account types</strong>, select{' '}
              <strong>Accounts in this organizational directory only (Single tenant)</strong>.
            </li>
            <li>
              Under <strong>Redirect URI</strong>, choose <strong>Web</strong> from the platform dropdown, then paste
              the OAuth callback URL shown below into the URL field.
            </li>
            <li>
              Click <strong>Register</strong> at the bottom.
            </li>
            <li>
              On the <strong>Overview</strong> page that opens, copy the <strong>Application (client) ID</strong>. You
              will need it in Step 3.
            </li>
            <li>
              On the same page, copy the <strong>Directory (tenant) ID</strong>. You will need it in Step 3.
            </li>
            <li>
              In the left sidebar, scroll to the <strong>Manage</strong> section and click{' '}
              <strong>Certificates &amp; secrets</strong>.
            </li>
            <li>
              Click <strong>+ New client secret</strong>. Enter a description (e.g., "Novu Bot Secret"), choose an
              expiry period, then click <strong>Add</strong>.
            </li>
            <li>
              In the <strong>Value</strong> column of the new secret, click the copy icon immediately. This value is
              only shown once and will be hidden after you navigate away. Save it for Step 3.
            </li>
          </ol>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            <SetupButton
              href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps"
              leadingIcon={
                <ProviderIcon
                  providerId={ChatProviderIdEnum.MsTeams}
                  providerDisplayName="MS Teams"
                  className="size-4 shrink-0"
                />
              }
            >
              Open App Registrations
            </SetupButton>
            <RedirectUriSection redirectUri={buildOAuthCallbackUrl()} />
          </div>
        }
      />

      {/* Step 2: Add Microsoft Graph API permissions */}
      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncomplete)}
        title="Add Microsoft Graph API permissions"
        description={
          <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
            <li>
              If your App Registration is still open in the Azure Portal, in the left sidebar scroll to the{' '}
              <strong>Manage</strong> section and click <strong>API permissions</strong>. Otherwise, click{' '}
              <strong>Open App Registrations</strong>, find the app you just created (e.g., "{agent.name}"), click on
              it, then in the left sidebar scroll to <strong>Manage</strong> and click <strong>API permissions</strong>.
            </li>
            <li>
              Click <strong>+ Add a permission</strong>.
            </li>
            <li>
              Select <strong>Microsoft Graph</strong>, then choose <strong>Application permissions</strong>.
            </li>
            <li>
              Search for and check the <strong>required</strong> permissions, then click{' '}
              <strong>Add permissions</strong>:
              <ul className="mt-1.5 flex flex-col gap-1 pl-4 [list-style:disc]">
                <li>
                  <code className="font-code text-[11px]">Team.ReadBasic.All</code>
                </li>
                <li>
                  <code className="font-code text-[11px]">Channel.ReadBasic.All</code>
                </li>
                <li>
                  <code className="font-code text-[11px]">AppCatalog.Read.All</code>
                </li>
              </ul>
            </li>
            <li>
              <strong>Recommended:</strong> While still in <strong>Application permissions</strong>, also search for and
              add these two optional permissions before clicking <strong>Add permissions</strong>:
              <ul className="mt-1.5 flex flex-col gap-1 pl-4 [list-style:disc]">
                <li>
                  <code className="font-code text-[11px]">TeamsAppInstallation.ReadWriteSelfForTeam.All</code>
                  <span className="text-text-soft">
                    {' '}
                    Lets the bot install itself into Teams channels automatically. Without it, users must add the bot to
                    each channel manually.
                  </span>
                </li>
                <li>
                  <code className="font-code text-[11px]">TeamsAppInstallation.ReadWriteSelfForUser.All</code>
                  <span className="text-text-soft">
                    {' '}
                    Lets the bot install itself for individual users automatically. Without it, users must manually
                    install the bot before they can receive direct messages.
                  </span>
                </li>
              </ul>
            </li>
            <li>
              Back on the API permissions page, click <strong>Grant admin consent for [your organization]</strong> and
              confirm when prompted.{' '}
              <span className="text-text-soft">
                (Requires Global Admin or Privileged Role Administrator rights. Ask your IT admin if you don't see this
                button.)
              </span>
            </li>
            <li>
              Verify that all permissions show a green checkmark under the <strong>Status</strong> column.
            </li>
          </ol>
        }
        rightContent={
          <SetupButton href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps">
            Open App Registrations
          </SetupButton>
        }
      />

      {/* Step 3: Configure credentials */}
      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncomplete)}
        title="Configure credentials"
        description={
          <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
            <li>
              Click the <strong>Configure credentials</strong> button to open the credentials panel.
            </li>
            <li>
              Paste the <strong>Application (client) ID</strong> from Step 1 into the <strong>Microsoft App ID</strong>{' '}
              field.
            </li>
            <li>
              Paste the <strong>Client Secret value</strong> from Step 1 into the <strong>Client Secret</strong> field.
            </li>
            <li>
              Paste the <strong>Directory (tenant) ID</strong> from Step 1 into the{' '}
              <strong>Directory (tenant) ID</strong> field.
            </li>
            <li>
              Click <strong>Save Changes</strong>.
            </li>
          </ol>
        }
        rightContent={
          <SetupButton
            leadingIcon={<RiKey2Line className="size-3.5" />}
            onClick={() => setIsCredentialsSidebarOpen(true)}
          >
            Configure credentials
          </SetupButton>
        }
      />

      {/* Step 4: Deploy the Azure Bot */}
      <SetupStep
        index={base + 3}
        status={deriveStepStatus(base + 3, firstIncomplete)}
        dimmed={!hasCredentials}
        title="Deploy the Azure Bot to your subscription"
        description={
          <div className="flex flex-col gap-3">
            <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
              <li>
                Click <strong>Deploy to Azure</strong>. This opens the Azure Portal with a pre-filled deployment
                template.
              </li>
              <li>
                Select the <strong>Subscription</strong> you want to deploy the bot into.
              </li>
              <li>
                Review the pre-filled parameters: resource group, bot name, App ID, Tenant ID, and messaging endpoint.
                They are already populated from the credentials you saved.
              </li>
              <li>
                Click <strong>Review + create</strong>, check the summary, then click <strong>Create</strong>.
              </li>
              <li>Wait for the deployment to complete (usually 1–2 minutes), then return here.</li>
            </ol>
            <ManualBotDeployFallback webhookUrl={webhookUrl} />
          </div>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            <SetupButton
              leadingIcon={
                isDeploying ? null : (
                  <ProviderIcon
                    providerId={ChatProviderIdEnum.MsTeams}
                    providerDisplayName="MS Teams"
                    className="size-4 shrink-0"
                  />
                )
              }
              onClick={handleDeployToAzure}
              disabled={!hasCredentials || isDeploying}
            >
              {isDeploying ? 'Opening Azure Portal…' : 'Deploy to Azure'}
            </SetupButton>
            {!hasCredentials && (
              <p className="text-text-soft text-label-xs">Configure credentials in step {base + 2} first.</p>
            )}
            {hasDeployedBot && <CheckpointRow label="Azure Bot deployment initiated" status="ready" />}
          </div>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="What this deploys:"
            description="An Azure Bot resource (F0 free tier, Single Tenant) with your messaging endpoint pre-filled and the Microsoft Teams channel enabled. Your App ID and Tenant ID are pre-populated from the credentials you saved."
          />
        }
      />

      {/* Step 5: Download the Teams app package */}
      <SetupStep
        index={base + 4}
        status={deriveStepStatus(base + 4, firstIncomplete)}
        dimmed={!hasCredentials}
        title="Download the Teams app package"
        description={
          <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
            <li>
              Click <strong>Download app package</strong> to save the{' '}
              <code className="font-code text-[11px]">.zip</code> file to your computer.
            </li>
            <li>
              <span className="text-text-soft">
                (For production) Unzip the file and replace <code className="font-code text-[11px]">color.png</code>{' '}
                (192×192 px) and <code className="font-code text-[11px]">outline.png</code> (32×32 px) with your company
                icons, and update the <code className="font-code text-[11px]">developer</code> fields in{' '}
                <code className="font-code text-[11px]">manifest.json</code> with your company name and URLs. Re-zip the
                three files before uploading.
              </span>
            </li>
          </ol>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 self-stretch w-full">
            <div className="self-start">
              <SetupButton
                leadingIcon={<Download className="size-3.5" />}
                onClick={handleDownload}
                disabled={!canDownload}
              >
                Download app package
              </SetupButton>
            </div>
            <ManifestPreview manifestJson={manifestJson} />
          </div>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Receiving all messages:"
            description="By default, Teams bots only receive @mentions. The manifest includes RSC permissions so the bot receives every message in channels it's added to."
          />
        }
      />

      {/* Step 6: Upload to Teams and verify */}
      <SetupStep
        index={base + 5}
        status={deriveStepStatus(base + 5, firstIncomplete)}
        dimmed={!hasCredentials}
        title="Upload to Teams and verify"
        description={
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-text-strong text-label-xs font-medium">
                Option A: Organization-wide (recommended for production)
              </p>
              <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
                <li>
                  Go to the{' '}
                  <a
                    href="https://admin.teams.microsoft.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    Teams Admin Center
                  </a>
                  .
                </li>
                <li>
                  In the left sidebar, expand <strong>Teams apps</strong> and click <strong>Manage apps</strong>.
                </li>
                <li>
                  Click <strong>Actions</strong>, then click <strong>Upload new app</strong> (or{' '}
                  <strong>+ Upload</strong> depending on the portal version).
                </li>
                <li>
                  Click <strong>Upload</strong>, then select the downloaded{' '}
                  <code className="font-code text-[11px]">.zip</code> file.
                </li>
                <li>
                  Wait for the upload to finish. It can take some time, and a success modal appears when it completes.
                </li>
                <li>
                  Find the app in the list. If it is not already unblocked, select it and set its{' '}
                  <strong>Status</strong> to <strong>Unblocked</strong>.
                </li>
              </ol>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-text-strong text-label-xs font-medium">
                Option B: Personal sideload (for testing only)
              </p>
              <ol className="flex flex-col gap-1.5 pl-4 [list-style:decimal]">
                <li>Open Microsoft Teams.</li>
                <li>
                  Click <strong>Apps</strong> in the left sidebar.
                </li>
                <li>
                  Click <strong>Manage your apps</strong> at the bottom of the panel.
                </li>
                <li>
                  Click <strong>Upload an app</strong>, then select <strong>Upload a custom app</strong>.
                </li>
                <li>
                  Choose the downloaded <code className="font-code text-[11px]">.zip</code> file.
                </li>
                <li>
                  In the app modal, click <strong>Add</strong>.
                </li>
              </ol>
            </div>
            {manualHealth?.teamsAppCatalog != null && (
              <CheckpointRow
                label={
                  manualHealth.teamsAppCatalog === 'ready'
                    ? 'App found in Teams catalog'
                    : 'Waiting for app in Teams catalog…'
                }
                status={manualHealth.teamsAppCatalog}
              />
            )}
          </div>
        }
      />

      {/* Step 7: Connect Novu to MS Teams */}
      <SetupStep
        index={base + 6}
        status={deriveStepStatus(base + 6, firstIncomplete)}
        dimmed={!hasCredentials}
        title="Connect Novu to MS Teams"
        description="Grant admin consent and verify the connection by signing in with a Microsoft account that has Teams admin permissions."
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 w-full">
            {hasCredentials && isConnectSubscriberReady && connectionIdentifier ? (
              <ConnectAndLinkSection
                integrationIdentifier={integrationIdentifier}
                subscriberId={connectSubscriberId}
                connectionIdentifier={connectionIdentifier}
                connectLabel={`Connect ${agent.name} ↗`}
                onFullyConnected={handleConnected}
              />
            ) : (
              <>
                <SetupButton disabled>{`Connect ${agent.name} ↗`}</SetupButton>
                {!hasCredentials && <p className="text-text-soft text-label-xs">Complete step {base + 2} first.</p>}
                {manualHealth?.teamsAppCatalog !== 'ready' && (
                  <p className="text-text-soft text-label-xs">Complete step {base + 5} first.</p>
                )}
              </>
            )}
          </div>
        }
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Your Teams workspace is connected. This agent is ready to receive messages."
      listeningMessage="@mention the bot in a Teams channel or send it a direct message to verify configuration."
    />
  );

  const credentialsSidebar = (
    <IntegrationCredentialsSidebar
      integrationId={integrationId}
      isOpen={isCredentialsSidebarOpen}
      onClose={() => setIsCredentialsSidebarOpen(false)}
      onSaveSuccess={() => {}}
      agentOnboarding
    />
  );

  const modeToggle = (
    <div className="flex items-start pl-6">
      <SetupModeToggle mode={setupMode} onChange={setSetupMode} />
    </div>
  );

  const activeSteps = activeSetupMode === 'quick' ? quickSteps : steps;
  const stepsContent = (
    <>
      {isQuickSetupEnabled && modeToggle}
      {activeSteps}
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsContent}</SetupStepperRail>
        <div className="pl-8">{listening}</div>
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      <SetupStepperRail>{stepsContent}</SetupStepperRail>
      <div className="pl-8">{listening}</div>
      {credentialsSidebar}
    </>
  );
}
