import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  getNovuConnectInvocation,
  getNovuConnectTargetFlags,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiFileCopyLine, RiInformation2Line, RiMailSendLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { getAgent, getAgentDetailQueryKey } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { CopyableTerminalBlock } from '@/components/primitives/copyable-terminal-block';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { cn } from '@/utils/ui';
import type { ConnectorId } from './connectors/connector-options';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';
import { SharedInboundAddressField } from './shared-inbound-address-field';

const BRIDGE_POLL_INTERVAL_MS = 2000;

function maskSecretKey(key: string): string {
  return `nv-${'•'.repeat(16)}${key.slice(-4)}`;
}

type ConnectRuntimeFlag = 'ai-sdk' | 'langchain' | 'custom-code';

const DEFAULT_CONNECT_RUNTIME: ConnectRuntimeFlag = 'ai-sdk';

function resolveConnectRuntime(connectorId: ConnectorId | undefined): ConnectRuntimeFlag {
  if (connectorId === 'ai-sdk' || connectorId === 'langchain' || connectorId === 'custom-code') {
    return connectorId;
  }

  return DEFAULT_CONNECT_RUNTIME;
}

function buildConnectScaffoldParts({
  secretKey,
  apiUrl,
  runtime,
}: {
  secretKey: string;
  apiUrl: string;
  runtime: ConnectRuntimeFlag;
}): string[] {
  return [
    `${getNovuConnectInvocation(apiUrl)} --runtime ${runtime}`,
    `--secret-key ${secretKey}`,
    ...getNovuConnectTargetFlags(apiUrl),
    '--channel skip',
  ];
}

function buildConnectScaffoldCommand({
  secretKey,
  apiUrl,
  runtime,
  masked,
}: {
  secretKey: string;
  apiUrl: string;
  runtime: ConnectRuntimeFlag;
  masked: boolean;
}): string {
  const key = masked ? maskSecretKey(secretKey) : secretKey;

  return buildConnectScaffoldParts({ secretKey: key, apiUrl, runtime }).join(' \\\n  ');
}

function buildConnectScaffoldCopyCommand({
  secretKey,
  apiUrl,
  runtime,
}: {
  secretKey: string;
  apiUrl: string;
  runtime: ConnectRuntimeFlag;
}): string {
  return buildConnectScaffoldParts({ secretKey, apiUrl, runtime }).join(' ');
}

function getProviderSlackMessage(agentName: string): string {
  return `Hey @${agentName}, can you help me?`;
}

function buildTestEmailMailto(agentName: string, inboundAddress: string): string {
  const subject = `Hi ${agentName}!`;
  const body = `Hey ${agentName},\n\nThis is my first email: say hi back and tell me what you can do?\n\nThanks!`;

  return `mailto:${inboundAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getProviderSendTitle(providerId: string | undefined): string {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return 'Send a message to the Slack App on Slack';
    case ChatProviderIdEnum.MsTeams:
      return 'Send a message to the bot on MS Teams';
    case ChatProviderIdEnum.Telegram:
      return 'Send a message to your Telegram bot';
    case ChatProviderIdEnum.WhatsAppBusiness:
      return 'Send a message on WhatsApp';
    case EmailProviderIdEnum.NovuAgent:
      return 'Send an email to the agent';
    default:
      return 'Send a message to test the connection';
  }
}

function getProviderSendDescription(providerId: string | undefined, agentName: string): string {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return `Open your Slack workspace and send a message to ${agentName}. Make sure to send in a channel or directly to the bot.`;
    case ChatProviderIdEnum.MsTeams:
      return `Open Microsoft Teams and send a message to ${agentName} in a channel or direct chat.`;
    case ChatProviderIdEnum.Telegram:
      return `Open Telegram and send a message to your bot to test the connection.`;
    case ChatProviderIdEnum.WhatsAppBusiness:
      return `Send a message to your WhatsApp number to test the connection.`;
    case EmailProviderIdEnum.NovuAgent:
      return `Email starts with you sending the first message: your agent reads it and replies to the same inbox. Send from the email address registered in your Novu account.`;
    default:
      return `Send a message to your bot from the connected provider to test the connection.`;
  }
}

export function CopySlackMessageButton({ agentName }: { agentName: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getProviderSlackMessage(agentName));
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-text-sub hover:text-text-strong flex cursor-pointer items-center gap-1 transition-colors"
    >
      {copied ? <RiCheckLine className="size-4" /> : <RiFileCopyLine className="size-4" />}
      <span className="text-label-xs font-medium">{copied ? 'Copied!' : 'Copy Slack message'}</span>
    </button>
  );
}

function EmailTestActions({ agentName, inboundAddress }: { agentName: string; inboundAddress: string }) {
  const mailtoUrl = buildTestEmailMailto(agentName, inboundAddress);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={mailtoUrl}
        className="text-text-sub hover:text-text-strong inline-flex items-center gap-1 transition-colors"
      >
        <RiMailSendLine className="size-4" />
        <span className="text-label-xs font-medium">Open in email client</span>
      </a>
    </div>
  );
}

function AgentSendStepExtraContent({
  providerId,
  agentName,
  sharedInboundAddress,
  bridgeConnected,
  onAddProvider,
}: {
  providerId?: string;
  agentName: string;
  sharedInboundAddress?: string;
  bridgeConnected: boolean;
  onAddProvider?: () => void;
}) {
  const isEmailSendStep = providerId === EmailProviderIdEnum.NovuAgent && Boolean(sharedInboundAddress);
  const sendActions = renderProviderSendActions(providerId, agentName, sharedInboundAddress);

  return (
    <div className="flex w-full flex-col gap-4">
      {isEmailSendStep && sharedInboundAddress ? (
        <>
          <SharedInboundAddressField sharedInboundAddress={sharedInboundAddress} />
          {sendActions}
        </>
      ) : null}
      <BridgeConnectionStatus connected={bridgeConnected} onAddProvider={onAddProvider} inline />
    </div>
  );
}

function renderProviderSendActions(
  providerId: string | undefined,
  agentName: string,
  sharedInboundAddress: string | undefined
) {
  if (providerId === ChatProviderIdEnum.Slack) {
    return <CopySlackMessageButton agentName={agentName} />;
  }

  if (providerId === EmailProviderIdEnum.NovuAgent && sharedInboundAddress) {
    return <EmailTestActions agentName={agentName} inboundAddress={sharedInboundAddress} />;
  }

  return undefined;
}

function useBridgeConnectionPolling(agent: AgentResponse, onBridgeConnected?: () => void) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));
  const [connected, setConnected] = useState(isBridgeConnected);
  const onBridgeConnectedRef = useRef(onBridgeConnected);
  onBridgeConnectedRef.current = onBridgeConnected;

  useEffect(() => {
    if (isBridgeConnected) {
      setConnected(true);
      onBridgeConnectedRef.current?.();

      return;
    }

    if (!currentEnvironment) {
      return;
    }

    let cancelled = false;
    const environment = currentEnvironment;

    const intervalId = setInterval(async () => {
      if (cancelled) return;

      try {
        const data = await getAgent(environment, agent.identifier);
        if (cancelled) return;

        const isConnected = Boolean(data.bridgeUrl || (data.devBridgeActive && data.devBridgeUrl));

        if (isConnected) {
          setConnected(true);
          onBridgeConnectedRef.current?.();
          queryClient.invalidateQueries({
            queryKey: getAgentDetailQueryKey(environment._id, agent.identifier),
          });
          clearInterval(intervalId);
        }
      } catch {
        // ignore transient errors while polling
      }
    }, BRIDGE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [agent.identifier, currentEnvironment, isBridgeConnected, queryClient]);

  return connected;
}

function BridgeConnectionStatus({
  connected,
  onAddProvider,
  inline = false,
}: {
  connected: boolean;
  onAddProvider?: () => void;
  inline?: boolean;
}) {
  const wrapperClass = inline ? 'flex flex-col gap-2' : 'flex flex-col gap-2 py-4 pl-6';

  if (connected) {
    return (
      <div className={cn(inline ? 'flex items-center gap-2' : 'flex items-center gap-2 py-4 pl-6')}>
        <RiCheckLine className="size-3.5 shrink-0 text-[#dd2476]" />
        <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
          Setup complete
        </span>
        {onAddProvider && <span className="text-text-soft text-label-xs font-medium">·</span>}
        {onAddProvider && (
          <Button
            variant="secondary"
            mode="outline"
            size="xs"
            className="text-text-sub gap-0.5 px-2 py-1.5"
            onClick={onAddProvider}
          >
            <span className="text-label-xs font-medium">Add another provider</span>
            <RiArrowRightSLine className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div className="flex items-center gap-1">
        <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
        <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
          Waiting for your agent to connect
        </span>
      </div>
      <p className="text-text-soft text-label-xs font-medium leading-4">
        Run the commands above, then come back here; we'll detect the connection automatically.
      </p>
    </div>
  );
}

type AgentCodeSetupSectionProps = {
  agent: AgentResponse;
  stepOffset: number;
  /**
   * Total number of steps across every visible section in the current context.
   * Used to render the "X/Y SETUP AGENT HANDLER" section label so the count
   * matches what the user actually sees (onboarding vs agent details, managed
   * vs self-hosted).
   */
  totalSteps: number;
  providerId?: string;
  sharedInboundAddress?: string;
  onBridgeConnected?: () => void;
  onAddProvider?: () => void;
  /** Self-hosted connector picked at agent creation (defaults to AI SDK). */
  connectorId?: ConnectorId;
};

export function AgentCodeSetupSection({
  agent,
  stepOffset,
  totalSteps,
  providerId,
  sharedInboundAddress,
  onBridgeConnected,
  onAddProvider,
  connectorId,
}: AgentCodeSetupSectionProps) {
  const apiKeysQuery = useFetchApiKeys();
  const secretKey = apiKeysQuery.data?.data?.[0]?.key;
  const connectRuntime = resolveConnectRuntime(connectorId);

  const currentApiUrl = apiHostnameManager.getHostname();

  const bridgeConnected = useBridgeConnectionPolling(agent, onBridgeConnected);

  const firstIncompleteStep = useMemo(
    () => (bridgeConnected ? stepOffset + 3 : stepOffset),
    [bridgeConnected, stepOffset]
  );

  const isEmailSendStep = providerId === EmailProviderIdEnum.NovuAgent && Boolean(sharedInboundAddress);

  return (
    <>
      <SetupStep
        index={stepOffset}
        status={deriveStepStatus(stepOffset, firstIncompleteStep)}
        sectionLabel={`${stepOffset}/${totalSteps} SETUP AGENT HANDLER`}
        title={
          <span className="inline-flex items-center gap-1">
            Scaffold your agent project
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-text-soft inline-block">
                  <RiInformation2Line className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Novu routes messages to your agent. This step generates starter scaffolding for its response logic, runs
                it locally, and connects it to Novu automatically via bridge.
              </TooltipContent>
            </Tooltip>
          </span>
        }
        description="Run this in an empty directory to scaffold a Next.js bridge app. When prompted, select the agent you created above. `--channel skip` skips channel setup because you already connected a provider in the dashboard."
        rightContent={
          apiKeysQuery.isLoading || !secretKey ? (
            <Skeleton className="h-[80px] w-full rounded-lg" />
          ) : (
            <CopyableTerminalBlock
              displayCommand={buildConnectScaffoldCommand({
                secretKey,
                apiUrl: currentApiUrl,
                runtime: connectRuntime,
                masked: true,
              })}
              copyCommand={buildConnectScaffoldCopyCommand({
                secretKey,
                apiUrl: currentApiUrl,
                runtime: connectRuntime,
              })}
            />
          )
        }
      />

      <SetupStep
        index={stepOffset + 1}
        status={deriveStepStatus(stepOffset + 1, firstIncompleteStep)}
        title="Start your agent locally"
        description="Run this from your project directory. It starts the app, opens a dev tunnel, and registers the bridge URL with Novu."
        rightContent={<CopyableTerminalBlock displayCommand="npm run dev:novu" copyCommand="npm run dev:novu" />}
      />

      <SetupStep
        index={stepOffset + 2}
        status={deriveStepStatus(stepOffset + 2, firstIncompleteStep)}
        title={getProviderSendTitle(providerId)}
        description={getProviderSendDescription(providerId, agent.name)}
        extraContent={
          <AgentSendStepExtraContent
            providerId={providerId}
            agentName={agent.name}
            sharedInboundAddress={sharedInboundAddress}
            bridgeConnected={bridgeConnected}
            onAddProvider={onAddProvider}
          />
        }
        rightContent={
          isEmailSendStep ? undefined : renderProviderSendActions(providerId, agent.name, sharedInboundAddress)
        }
      />
    </>
  );
}
