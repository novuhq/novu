import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RiCheckLine, RiFileCopyLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { getAgent, getAgentDetailQueryKey } from '@/api/agents';
import { Skeleton } from '@/components/primitives/skeleton';
import { ExternalLink } from '@/components/shared/external-link';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

const CLI_DEFAULT_API_URL = 'https://api.novu.co';
const BRIDGE_POLL_INTERVAL_MS = 2000;

// TODO: change to 'latest' when agents are GA and IS_CONVERSATIONAL_AGENTS_ENABLED flag is removed
const CLI_PACKAGE_TAG = 'rc';

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

function getProviderCallToAction(providerId: string | undefined): string {
  switch (providerId) {
    case ChatProviderIdEnum.Slack:
      return 'Head back to Slack and mention your bot again — this time your agent server will handle the message.';
    case ChatProviderIdEnum.WhatsAppBusiness:
      return 'Send a message to your WhatsApp number again — this time your agent server will handle it.';
    default:
      return 'Send a message to your bot from the connected provider again — this time your agent server will handle it.';
  }
}

function BridgeConnectionStatus({
  agent,
  agentIdentifier,
  providerId,
}: {
  agent: AgentResponse;
  agentIdentifier: string;
  providerId: string | undefined;
}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));
  const [connected, setConnected] = useState(isBridgeConnected);

  useEffect(() => {
    if (isBridgeConnected) {
      setConnected(true);

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
        const data = await getAgent(environment, agentIdentifier);
        if (cancelled) return;

        const isConnected = Boolean(data.bridgeUrl || (data.devBridgeActive && data.devBridgeUrl));

        if (isConnected) {
          setConnected(true);
          queryClient.invalidateQueries({
            queryKey: getAgentDetailQueryKey(environment._id, agentIdentifier),
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
  }, [agentIdentifier, currentEnvironment, isBridgeConnected, queryClient]);

  if (connected) {
    return (
      <div className="flex flex-col gap-2 py-4 pl-8">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="text-success-base size-3.5 shrink-0" />
          <span className="text-text-strong text-label-sm font-medium">Bridge connected — try your agent</span>
        </div>
        <p className="text-text-soft text-label-xs font-medium leading-4">{getProviderCallToAction(providerId)}</p>
        <p className="text-text-soft text-label-xs font-medium leading-4">
          Edit <code className="font-code text-[12px] tracking-[-0.24px]">app/novu/agents/</code> to customize how your
          agent responds.
        </p>
        <ExternalLink href="https://docs.novu.co/agents/overview" variant="documentation">
          Agent documentation
        </ExternalLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-4 pl-8">
      <div className="flex items-center gap-1">
        <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
        <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
          Waiting for bridge connection…
        </span>
      </div>
      <p className="text-text-soft text-label-xs font-medium leading-4">
        Run the commands above to scaffold your project and start the dev tunnel.
      </p>
    </div>
  );
}

type AgentCodeSetupSectionProps = {
  agent: AgentResponse;
  stepOffset: number;
  providerId?: string;
};

export function AgentCodeSetupSection({ agent, stepOffset, providerId }: AgentCodeSetupSectionProps) {
  const apiKeysQuery = useFetchApiKeys();
  const secretKey = apiKeysQuery.data?.data?.[0]?.key;

  const currentApiUrl = apiHostnameManager.getHostname();
  const apiUrl = currentApiUrl !== CLI_DEFAULT_API_URL ? currentApiUrl : null;

  const isBridgeConnected = Boolean(agent.bridgeUrl || (agent.devBridgeActive && agent.devBridgeUrl));

  // The caller only renders this section once a provider integration is
  // connected, so the "2/2 Connect your code" steps start out active.
  const firstIncompleteStep = isBridgeConnected ? stepOffset + 2 : stepOffset;

  return (
    <>
      <SetupStep
        index={stepOffset}
        status={deriveStepStatus(stepOffset, firstIncompleteStep)}
        sectionLabel="2/2 CONNECT YOUR CODE"
        title="Scaffold your agent project"
        description={
          <span>
            Run this to create a Next.js project with the bridge endpoint pre-configured for your agent. The CLI
            installs dependencies and writes your secret key to{' '}
            <code className="font-code text-[12px] tracking-[-0.24px]">.env.local</code> automatically.
          </span>
        }
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
        title="Start the dev tunnel"
        description={
          <span>
            Start your app with <code className="font-code text-[12px] tracking-[-0.24px]">npm run dev</code>, then run
            this in a second terminal from your project directory. It creates a tunnel and registers the bridge URL with
            Novu.
          </span>
        }
        rightContent={
          <TerminalBlock
            displayCommand={`npx novu@${CLI_PACKAGE_TAG} dev -p 4000 --no-studio`}
            copyCommand={`npx novu@${CLI_PACKAGE_TAG} dev -p 4000 --no-studio`}
          />
        }
      />

      <BridgeConnectionStatus agent={agent} agentIdentifier={agent.identifier} providerId={providerId} />
    </>
  );
}
