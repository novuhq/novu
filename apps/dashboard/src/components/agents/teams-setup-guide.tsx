import { useUser } from '@clerk/clerk-react';
import { MsTeamsConnectButton, MsTeamsLinkUser, NovuProvider, useNovu } from '@novu/react';
import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowDownSLine, RiFlashlightLine, RiKey2Line, RiListCheck2, RiLoader4Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { getAzureSetupOauthUrl, getMsTeamsArmTemplateDeployUrl } from '@/api/integrations';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CodeBlock } from '@/components/primitives/code-block';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { API_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { downloadTeamsAppPackage } from './teams-app-package';

export type TeamsSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiBaseUrl(): string {
  return (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');
}

function getApiHostname(): string {
  try {
    return new URL(getApiBaseUrl()).hostname;
  } catch {
    return 'api.novu.co';
  }
}

function buildOAuthCallbackUrl(): string {
  return `${getApiBaseUrl()}/v1/integrations/chat/oauth/callback`;
}

function buildManifest(appId: string, agentName: string): Record<string, unknown> {
  const id = appId || 'YOUR_APP_ID';
  const name = agentName || 'Novu Agent';
  const hostname = getApiHostname();

  return {
    $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json',
    manifestVersion: '1.16',
    version: '1.0.0',
    id,
    developer: {
      name: 'Your Company',
      websiteUrl: 'https://your-domain.com',
      privacyUrl: 'https://your-domain.com/privacy',
      termsOfUseUrl: 'https://your-domain.com/terms',
    },
    name: { short: name, full: `${name} — powered by Novu` },
    description: { short: `${name} bot`, full: 'A conversational agent powered by Novu.' },
    icons: { outline: 'outline.png', color: 'color.png' },
    accentColor: '#FFFFFF',
    bots: [
      {
        botId: id,
        scopes: ['personal', 'team', 'groupchat'],
        supportsFiles: false,
        isNotificationOnly: false,
      },
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: [hostname],
    webApplicationInfo: { id, resource: `api://${hostname}/${id}` },
    authorization: {
      permissions: {
        resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
      },
    },
  };
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

// ---------------------------------------------------------------------------
// Setup mode toggle
// ---------------------------------------------------------------------------

type SetupMode = 'quick' | 'manual';

function SetupModeToggle({ mode, onChange }: { mode: SetupMode; onChange: (m: SetupMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-stroke-soft bg-bg-weak p-1">
      <button
        type="button"
        onClick={() => onChange('quick')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-xs font-medium transition-colors',
          mode === 'quick' ? 'bg-bg-white text-text-strong shadow-xs' : 'text-text-sub hover:text-text-strong'
        )}
      >
        <RiFlashlightLine className="size-3.5" />
        Quick Setup
      </button>
      <button
        type="button"
        onClick={() => onChange('manual')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-xs font-medium transition-colors',
          mode === 'manual' ? 'bg-bg-white text-text-strong shadow-xs' : 'text-text-sub hover:text-text-strong'
        )}
      >
        <RiListCheck2 className="size-3.5" />
        Manual Setup
      </button>
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
        // ignore — will be surfaced after the next connect attempt
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
    <div className="flex min-w-0 flex-col gap-3">
      {/* container={undefined} satisfies the Pick<NovuUIOptions, 'container' | 'appearance'> requirement */}
      <MsTeamsConnectButton
        integrationIdentifier={integrationIdentifier}
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
            <div className="flex min-w-0 flex-col gap-3">
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
// Main component
// ---------------------------------------------------------------------------

export function TeamsSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: TeamsSetupGuideProps) {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [hasDeployedToAzure, setHasDeployedToAzure] = useState(false);
  const [isConnectingAzure, setIsConnectingAzure] = useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>('quick');
  const [teamsAppUploaded, setTeamsAppUploaded] = useState<boolean | null>(null);
  const azurePopupRef = useRef<Window | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
  }, [integrationId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'novu:azure-setup-complete') {
        return;
      }

      azurePopupRef.current?.close();
      azurePopupRef.current = null;

      if (event.data.success) {
        setTeamsAppUploaded(event.data.teamsAppUploaded === true);
        void queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations] });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const { integrations } = useFetchIntegrations();

  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.MsTeams),
    [integrations, integrationId]
  );

  const integrationIdentifier = selectedIntegration?.identifier ?? '';
  const credentials = selectedIntegration?.credentials as Record<string, string> | undefined;
  const appId = credentials?.clientId ?? '';
  const hasCredentials = Boolean(appId && credentials?.secretKey && credentials?.tenantId);

  const manifestJson = JSON.stringify(buildManifest(appId, agent.name), null, 2);

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
      setHasDeployedToAzure(true);
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
      throw error;
    } finally {
      setIsConnectingAzure(false);
    }
  }, [currentEnvironment, integrationId, isConnectingAzure]);

  const base = stepOffset;

  // Steps: App Reg + Redirect URI (base+0), Graph perms (base+1),
  //        Credentials (base+2), Deploy to Azure (base+3), Download pkg (base+4), Upload+connect (base+5)
  const firstIncomplete = useMemo(() => {
    if (isConnected) {
      return base + 7;
    }

    if (!hasCredentials) {
      return base;
    }

    return base + 5;
  }, [base, hasCredentials, isConnected]);

  // Quick Setup: step 1 = Connect to Azure, step 2 = Deploy to Azure, step 3 = Connect & admin consent
  const quickFirstIncomplete = useMemo(() => {
    if (isConnected) return base + 4;
    if (hasCredentials && hasDeployedToAzure) return base + 2;
    if (hasCredentials) return base + 1;

    return base;
  }, [base, hasCredentials, hasDeployedToAzure, isConnected]);

  const quickSteps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, quickFirstIncomplete)}
        title="Connect to Azure"
        description={
          <span>
            {'Authorize Novu to create an '}
            <strong>App Registration</strong>
            {
              " in your Azure AD tenant on your behalf. Novu will configure the required Graph permissions, generate a client secret, and attempt to upload the Teams app to your org's app catalog automatically. No manual steps in Azure Portal."
            }
          </span>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
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
              {isConnectingAzure ? 'Opening Azure…' : 'Connect to Azure'}
            </SetupButton>
          </div>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="What Novu requests:"
            description={
              <span>
                {'Novu requests '}
                <code className="font-code text-[11px]">Application.ReadWrite.All</code>
                {' and '}
                <code className="font-code text-[11px]">AppRoleAssignment.ReadWrite.All</code>
                {
                  ' — both require admin consent. This lets Novu create the App Registration and service principal on your behalf via Microsoft Graph.'
                }
              </span>
            }
          />
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, quickFirstIncomplete)}
        title="Deploy the Azure Bot to your subscription"
        description="Click the button to open a pre-filled Azure deployment. It creates the Azure Bot resource, sets the messaging endpoint, and enables the Microsoft Teams channel — all in one click."
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
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
            {!hasCredentials && <p className="text-text-soft text-label-xs">Complete step {base} first.</p>}
          </div>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="What this deploys:"
            description="An Azure Bot resource (F0 free tier, Single Tenant) with your messaging endpoint pre-filled and the Microsoft Teams channel enabled."
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, quickFirstIncomplete)}
        title="Upload to Teams and verify"
        description={
          <div className="flex flex-col gap-2">
            {teamsAppUploaded === true && (
              <p>
                {
                  "Novu uploaded the Teams app to your org's app catalog automatically. Use the button below to grant admin consent and verify the connection."
                }
              </p>
            )}
            {teamsAppUploaded === false && (
              <p>
                {
                  'Automatic upload to the Teams app catalog failed (likely due to org policy). Download the package below and upload it manually, then use the button to grant admin consent and verify.'
                }
              </p>
            )}
            {teamsAppUploaded === null && (
              <p>
                {
                  'Novu will attempt to upload the Teams app package automatically after the Azure setup completes. If it fails (e.g. due to org policy), you can download and upload it manually below.'
                }
              </p>
            )}
          </div>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
            {(teamsAppUploaded === false || teamsAppUploaded === null) && (
              <SetupButton
                leadingIcon={<Download className="size-3.5" />}
                onClick={handleDownload}
                disabled={!canDownload}
              >
                Download app package
              </SetupButton>
            )}
            {hasCredentials && user?.externalId && currentEnvironment?.identifier ? (
              <NovuProvider
                subscriber={{
                  subscriberId: `${user.externalId}:agent-quickstart:${agent._id}`,
                  firstName: user.firstName ?? '',
                  lastName: user.lastName ?? '',
                  avatar: user.imageUrl ?? '',
                }}
                applicationIdentifier={currentEnvironment.identifier}
                apiUrl={apiHostnameManager.getHostname()}
                socketUrl={apiHostnameManager.getWebSocketHostname()}
              >
                <ConnectAndLinkSection
                  integrationIdentifier={integrationIdentifier}
                  connectionIdentifier={`${user.externalId}:agent-quickstart:${agent._id}`}
                  connectLabel={`Connect ${agent.name} ↗`}
                  onFullyConnected={handleConnected}
                />
              </NovuProvider>
            ) : (
              <>
                <SetupButton disabled>{`Connect ${agent.name} ↗`}</SetupButton>
                {!hasCredentials && <p className="text-text-soft text-label-xs">Complete step {base + 1} first.</p>}
              </>
            )}
          </div>
        }
        extraContent={
          teamsAppUploaded !== true ? (
            <InlineToast
              className="mt-2 w-full"
              variant="tip"
              title="Organization-wide:"
              description={
                <span>
                  {'For org deployment, use the '}
                  <a
                    href="https://admin.teams.microsoft.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Teams Admin Center
                  </a>
                  {' → Teams apps → Manage apps → Upload new app.'}
                </span>
              }
            />
          ) : null
        }
      />
    </>
  );

  const steps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncomplete)}
        title="Create an App Registration"
        description={
          <span>
            {'In the Azure Portal, create a new '}
            <strong>App Registration</strong>
            {' (Single Tenant). When prompted for a Redirect URI, add the OAuth callback URL shown below as a '}
            <strong>Web</strong>
            {' platform URI. Once created, note the App ID from the Overview page.'}
          </span>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
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

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncomplete)}
        title="Add Microsoft Graph API permissions"
        description={
          <span>
            {'In your App Registration, go to '}
            <strong>API permissions</strong>
            {' → '}
            <strong>Add a permission</strong>
            {' → '}
            <strong>Microsoft Graph</strong>
            {' → '}
            <strong>Application permissions</strong>
            {'. Search for and add: '}
            <code className="font-code text-[11px]">Team.ReadBasic.All</code>
            {', '}
            <code className="font-code text-[11px]">Channel.ReadBasic.All</code>
            {', '}
            <code className="font-code text-[11px]">AppCatalog.Read.All</code>
            {'. Then click '}
            <strong>Grant admin consent</strong>
            {' for your organization.'}
          </span>
        }
        rightContent={
          <SetupButton href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps">
            Open App Registrations
          </SetupButton>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Required permissions:"
            description={
              <span>
                {'These Graph permissions let your bot discover Teams and channels. Optionally add '}
                <code className="font-code text-[11px]">TeamsAppInstallation.ReadWriteSelfForTeam.All</code>
                {' and '}
                <code className="font-code text-[11px]">TeamsAppInstallation.ReadWriteSelfForUser.All</code>
                {' to enable programmatic app installation.'}
              </span>
            }
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncomplete)}
        title="Configure credentials"
        description="Copy the App ID, Client Secret, and Tenant ID from your App Registration into the integration."
        rightContent={
          <SetupButton
            leadingIcon={<RiKey2Line className="size-3.5" />}
            onClick={() => setIsCredentialsSidebarOpen(true)}
          >
            Configure credentials
          </SetupButton>
        }
        extraContent={
          <InlineToast
            className="mt-2 w-full"
            variant="tip"
            title="Where to find these:"
            description="App ID is on the Overview page. For the secret, go to Certificates & secrets → New client secret and copy the Value immediately — it's only shown once. Tenant ID is also on the Overview page."
          />
        }
      />

      <SetupStep
        index={base + 3}
        status={deriveStepStatus(base + 3, firstIncomplete)}
        title="Deploy the Azure Bot to your subscription"
        description="Click the button to open a pre-filled Azure deployment. It creates the Azure Bot resource, sets the messaging endpoint, and enables the Microsoft Teams channel — all in one click."
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
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

      <SetupStep
        index={base + 4}
        status={deriveStepStatus(base + 4, firstIncomplete)}
        title="Download the Teams app package"
        description="We've generated a ready-to-upload app package with your manifest and placeholder icons. Before deploying to production, replace the icons and update the developer fields in manifest.json with your company info."
        rightContent={
          <div className="flex min-w-0 flex-col gap-3 self-stretch">
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

      <SetupStep
        index={base + 5}
        status={deriveStepStatus(base + 5, firstIncomplete)}
        title="Upload to Teams and verify"
        description={
          <div className="flex flex-col gap-2">
            <p>
              {'In Teams, click '}
              <strong>Apps</strong>
              {' in the sidebar → '}
              <strong>Manage your apps</strong>
              {' → '}
              <strong>Upload an app</strong>
              {' → '}
              <strong>Upload a custom app</strong>
              {' and select the downloaded '}
              <code className="font-code text-[11px]">.zip</code>
              {' file. Then use the button to grant admin consent and verify the connection.'}
            </p>
          </div>
        }
        rightContent={
          <div className="flex min-w-0 flex-col gap-3">
            {hasCredentials && user?.externalId && currentEnvironment?.identifier ? (
              <NovuProvider
                subscriber={{
                  subscriberId: `${user.externalId}:agent-quickstart:${agent._id}`,
                  firstName: user.firstName ?? '',
                  lastName: user.lastName ?? '',
                  avatar: user.imageUrl ?? '',
                }}
                applicationIdentifier={currentEnvironment.identifier}
                apiUrl={apiHostnameManager.getHostname()}
                socketUrl={apiHostnameManager.getWebSocketHostname()}
              >
                <ConnectAndLinkSection
                  integrationIdentifier={integrationIdentifier}
                  connectionIdentifier={`${user.externalId}:agent-quickstart:${agent._id}`}
                  connectLabel={`Connect ${agent.name} ↗`}
                  onFullyConnected={handleConnected}
                />
              </NovuProvider>
            ) : (
              <>
                <SetupButton disabled>{`Connect ${agent.name} ↗`}</SetupButton>
                {!hasCredentials && <p className="text-text-soft text-label-xs">Complete step {base + 2} first.</p>}
              </>
            )}
          </div>
        }
        extraContent={
          <div className="mt-2 flex flex-col gap-2">
            <InlineToast
              className="w-full"
              variant="tip"
              title="Organization-wide:"
              description={
                <span>
                  {'For org deployment, use the '}
                  <a
                    href="https://admin.teams.microsoft.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Teams Admin Center
                  </a>
                  {' → Teams apps → Manage apps → Upload new app.'}
                </span>
              }
            />
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
    />
  );

  const modeToggle = (
    <div className="mb-2 flex items-start">
      <SetupModeToggle mode={setupMode} onChange={setSetupMode} />
    </div>
  );

  const activeSteps = setupMode === 'quick' ? quickSteps : steps;

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className="px-6 pt-4 pb-2">{modeToggle}</div>
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6')}>
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          {activeSteps}
        </div>
        {listening}
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      {modeToggle}
      {activeSteps}
      {listening}
      {credentialsSidebar}
    </>
  );
}
