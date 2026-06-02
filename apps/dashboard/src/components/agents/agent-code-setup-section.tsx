import { ChatProviderIdEnum, EmailProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiCheckLine, RiFileCopyLine, RiInformation2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { getAgent, getAgentDetailQueryKey } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

const CLI_DEFAULT_API_URL = 'https://api.novu.co';
const BRIDGE_POLL_INTERVAL_MS = 2000;

const CLI_PACKAGE_TAG = 'latest';

function maskSecretKey(key: string): string {
  return `nv-${'•'.repeat(16)}${key.slice(-4)}`;
}

function buildInitCommand({
  agentIdentifier,
  secretKey,
  apiUrl,
  masked,
}: {
  agentIdentifier: string;
  secretKey: string;
  apiUrl: string | null;
  masked: boolean;
}): string {
  const key = masked ? maskSecretKey(secretKey) : secretKey;
  const parts = [`npx novu@${CLI_PACKAGE_TAG} init -t agent`, `--agent-identifier ${agentIdentifier}`, `-s ${key}`];

  if (apiUrl) {
    parts.push(`-a ${apiUrl}`);
  }

  return parts.join(' \\\n  ');
}

function buildInitCopyCommand({
  agentIdentifier,
  secretKey,
  apiUrl,
}: {
  agentIdentifier: string;
  secretKey: string;
  apiUrl: string | null;
}): string {
  const parts = [
    `npx novu@${CLI_PACKAGE_TAG} init -t agent`,
    `--agent-identifier ${agentIdentifier}`,
    `-s ${secretKey}`,
  ];

  if (apiUrl) {
    parts.push(`-a ${apiUrl}`);
  }

  return parts.join(' ');
}

function TerminalBlock({ displayCommand, copyCommand }: { displayCommand: string; copyCommand: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyCommand);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-[inset_0px_0px_0px_1px_#18181b,inset_0px_0px_0px_1.5px_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between bg-[rgba(14,18,27,0.9)] px-4 py-1.5">
        <span className="text-label-xs text-[#99a0ae]">Terminal</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex size-6 items-center justify-center rounded p-1.5 transition-colors hover:bg-white/10"
        >
          {copied ? (
            <RiCheckLine className="size-3.5 text-[#99a0ae]" />
          ) : (
            <RiFileCopyLine className="size-3.5 text-[#99a0ae]" />
          )}
        </button>
      </div>
      <div className="bg-[rgba(14,18,27,0.9)] px-[5px] pb-[5px]">
        <div className="flex gap-4 rounded-md border border-[rgba(14,18,27,0.9)] bg-[rgba(14,18,27,0.9)] p-3">
          <span className="shrink-0 font-mono text-xs text-[#525866]">❯</span>
          <span className="whitespace-pre-wrap break-all font-mono text-xs text-white">{displayCommand}</span>
        </div>
      </div>
    </div>
  );
}

function getProviderSlackMessage(agentName: string): string {
  return `Hey @${agentName}, can you help me?`;
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
      return `Send an email to your agent's configured address to test the connection.`;
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

function BridgeConnectionStatus({ connected, onAddProvider }: { connected: boolean; onAddProvider?: () => void }) {
  if (connected) {
    return (
      <div className="flex items-center gap-2 py-4 pl-6">
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
    <div className="flex flex-col gap-2 py-4 pl-6">
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
  onBridgeConnected?: () => void;
  onAddProvider?: () => void;
};

export function AgentCodeSetupSection({
  agent,
  stepOffset,
  totalSteps,
  providerId,
  onBridgeConnected,
  onAddProvider,
}: AgentCodeSetupSectionProps) {
  const apiKeysQuery = useFetchApiKeys();
  const secretKey = apiKeysQuery.data?.data?.[0]?.key;

  const currentApiUrl = apiHostnameManager.getHostname();
  const apiUrl = currentApiUrl !== CLI_DEFAULT_API_URL ? currentApiUrl : null;

  const bridgeConnected = useBridgeConnectionPolling(agent, onBridgeConnected);

  const firstIncompleteStep = useMemo(
    () => (bridgeConnected ? stepOffset + 3 : stepOffset),
    [bridgeConnected, stepOffset]
  );

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
        description="Run this to create a Next.js project with the bridge endpoint pre-configured for your agent. The CLI installs dependencies and writes your secret key to .env.local automatically."
        rightContent={
          apiKeysQuery.isLoading || !secretKey ? (
            <Skeleton className="h-[80px] w-full rounded-lg" />
          ) : (
            <TerminalBlock
              displayCommand={buildInitCommand({
                agentIdentifier: agent.identifier,
                secretKey,
                apiUrl,
                masked: true,
              })}
              copyCommand={buildInitCopyCommand({
                agentIdentifier: agent.identifier,
                secretKey,
                apiUrl,
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
        rightContent={<TerminalBlock displayCommand="npm run dev:novu" copyCommand="npm run dev:novu" />}
      />

      <SetupStep
        index={stepOffset + 2}
        status={deriveStepStatus(stepOffset + 2, firstIncompleteStep)}
        title={getProviderSendTitle(providerId)}
        description={getProviderSendDescription(providerId, agent.name)}
        rightContent={
          providerId === ChatProviderIdEnum.Slack ? <CopySlackMessageButton agentName={agent.name} /> : undefined
        }
      />

      <BridgeConnectionStatus connected={bridgeConnected} onAddProvider={onAddProvider} />
    </>
  );
}
