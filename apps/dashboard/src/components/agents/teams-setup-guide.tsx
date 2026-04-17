import { ChatProviderIdEnum } from '@novu/shared';
import { Download } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiArrowDownSLine, RiKey2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { CodeBlock } from '@/components/primitives/code-block';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { API_HOSTNAME } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';
import { downloadTeamsAppPackage } from './teams-app-package';
import { IntegrationCredentialsSidebar, ListeningStatus, SetupButton, SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

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

function buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
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

function WebhookUrlSection({ webhookUrl }: { webhookUrl: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-text-sub text-label-xs font-medium leading-5">Messaging endpoint</p>
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
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the watched integration changes
  useEffect(() => {
    setIsConnected(false);
  }, [integrationId]);

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

  const webhookUrl = buildWebhookUrl(agent._id, integrationIdentifier || 'YOUR_INTEGRATION_IDENTIFIER');
  const manifestJson = JSON.stringify(buildManifest(appId, agent.name), null, 2);

  const canDownload = Boolean(appId);

  const handleDownload = useCallback(() => {
    if (!canDownload) {
      return;
    }

    void downloadTeamsAppPackage(manifestJson, agent.name);
  }, [canDownload, manifestJson, agent.name]);

  const base = stepOffset;

  const firstIncomplete = useMemo(() => {
    if (isConnected) {
      return base + 5;
    }

    if (!hasCredentials) {
      return base;
    }

    return base + 4;
  }, [base, hasCredentials, isConnected]);

  const steps = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncomplete)}
        title="Create an Azure Bot resource"
        description="In the Azure Portal, create a new Azure Bot (Single Tenant). Choose F0 (free) pricing for testing. Once created, note your App ID from the Bot Configuration page."
        rightContent={
          <SetupButton
            href="https://portal.azure.com/#create/Microsoft.AzureBot"
            leadingIcon={
              <ProviderIcon
                providerId={ChatProviderIdEnum.MsTeams}
                providerDisplayName="MS Teams"
                className="size-4 shrink-0"
              />
            }
          >
            Open Azure Portal
          </SetupButton>
        }
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncomplete)}
        title="Configure credentials"
        description="Copy the App ID, Client Secret, and Tenant ID from your Azure Bot registration into the integration."
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
            description="App ID is on the Bot Configuration page. For the secret, click Manage Password → Certificates & secrets → New client secret and copy the Value immediately — it's only shown once. Tenant ID is on the App Registration Overview page."
          />
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncomplete)}
        title="Set the messaging endpoint and enable Teams"
        description="In your Azure Bot, go to Configuration → paste the endpoint below. Then go to Channels → enable Microsoft Teams."
        rightContent={<WebhookUrlSection webhookUrl={webhookUrl} />}
      />

      <SetupStep
        index={base + 3}
        status={deriveStepStatus(base + 3, firstIncomplete)}
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
        index={base + 4}
        status={deriveStepStatus(base + 4, firstIncomplete)}
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
              {' file.'}
            </p>
            <p>
              {'Once installed, @mention the bot in a channel or send it a direct message to confirm it responds.'}
            </p>
          </div>
        }
        extraContent={
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

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <div className={cn('relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6')}>
          <div
            className="absolute bottom-0 left-[22px] top-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
            }}
          />
          {steps}
        </div>
        {listening}
        {credentialsSidebar}
      </div>
    );
  }

  return (
    <>
      {steps}
      {listening}
      {credentialsSidebar}
    </>
  );
}
