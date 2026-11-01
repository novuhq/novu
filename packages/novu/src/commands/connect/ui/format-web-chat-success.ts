import fs from 'node:fs';
import path from 'node:path';
import { describeConnectEmbedPromptAction } from '@novu/shared';
import { resolveConnectEmbedRuntime } from '../pipeline/web-chat/run-web-chat-setup';
import type { AgentConnectMode } from '../types';
import type { ConnectUI } from './ui';

export type ConnectSuccessResult = Parameters<ConnectUI['success']>[0];

export type WebChatMergedScaffoldSuccess = {
  kind: 'merged-scaffold';
  agentName: string;
  agentIdentifier: string;
  appName: string;
  chatUrl: string;
  handlerRoute: string;
  editAgentHint?: string;
  devCommand: string;
  skippedInstall: boolean;
  unknownSocketHost: boolean;
};

export type WebChatStandaloneScaffoldSuccess = {
  kind: 'standalone-scaffold';
  chatUrl: string;
  devCommand: string;
  unknownSocketHost: boolean;
};

export type WebChatEmbedSuccess = {
  kind: 'embed';
  alreadyWired: boolean;
  envSummary: string | null;
  connectMode: ReturnType<typeof resolveConnectEmbedRuntime>;
  embedPrompt?: string;
  embedPromptFile?: string;
  unknownSocketHost: boolean;
};

export type WebChatGenericLinkedSuccess = {
  kind: 'generic-linked';
  dashboardUrl?: string;
  embedPromptFile?: string;
  projectDir?: string;
};

export type WebChatSuccessPresentation =
  | WebChatMergedScaffoldSuccess
  | WebChatStandaloneScaffoldSuccess
  | WebChatEmbedSuccess
  | WebChatGenericLinkedSuccess
  | null;

export function resolveScaffoldDevPort(projectDir: string): number {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const scripts = Object.values(packageJson.scripts ?? {}).join('\n');
    const portMatch = scripts.match(/--port[=\s]+(\d+)/) ?? scripts.match(/-p\s+(\d+)/) ?? scripts.match(/PORT=(\d+)/);

    if (portMatch) {
      return Number.parseInt(portMatch[1], 10);
    }
  } catch {
    // Fall back to the default agent scaffold port.
  }

  return 4005;
}

export function resolveBridgeHandlerRoute(connectMode: AgentConnectMode | undefined): string {
  if (connectMode === 'chat-sdk') {
    return 'POST /api/webhooks/novu';
  }

  return '/api/novu';
}

export function formatLocalUrl(port: number, routePath: string): string {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;

  return `http://localhost:${port}${normalizedPath === '/' ? '' : normalizedPath}`;
}

function summarizeEnvPaths(envPaths: string[] | undefined): string | null {
  const envNames = [...new Set((envPaths ?? []).map((envPath) => path.basename(envPath)))];
  if (envNames.length === 0) {
    return null;
  }

  return envNames.join(', ');
}

export function resolveWebChatSuccessPresentation(result: ConnectSuccessResult): WebChatSuccessPresentation {
  if (result.connectedChannel !== 'web-chat') {
    return null;
  }

  const bridgeOutcome =
    result.chatSdkOutcome ?? result.aiSdkOutcome ?? result.langChainOutcome ?? result.customCodeOutcome;

  if (result.webChatOutcome?.mergedIntoBridge && bridgeOutcome?.scaffolded && bridgeOutcome.projectDir) {
    const port = resolveScaffoldDevPort(bridgeOutcome.projectDir);
    const chatPath = result.webChatOutcome.chatPath ?? '/';

    return {
      kind: 'merged-scaffold',
      agentName: result.agent.name,
      agentIdentifier: result.agent.identifier,
      appName: path.basename(bridgeOutcome.projectDir),
      chatUrl: formatLocalUrl(port, chatPath),
      handlerRoute: resolveBridgeHandlerRoute(result.connectMode),
      editAgentHint:
        result.connectMode !== 'chat-sdk'
          ? `Edit agent logic in app/novu/agents/${result.agent.identifier}.tsx`
          : undefined,
      devCommand: `cd ${JSON.stringify(bridgeOutcome.projectDir)} && ${bridgeOutcome.skippedInstall ? 'npm install && ' : ''}npm run dev:novu`,
      skippedInstall: Boolean(bridgeOutcome.skippedInstall),
      unknownSocketHost: Boolean(result.webChatOutcome.unknownSocketHost),
    };
  }

  if (result.webChatOutcome?.mode === 'embed' && result.webChatOutcome.projectDir) {
    return {
      kind: 'embed',
      alreadyWired: result.webChatOutcome.alreadyWired === true,
      envSummary: summarizeEnvPaths(result.webChatOutcome.envPaths),
      connectMode: resolveConnectEmbedRuntime(result.connectMode ?? 'ai-sdk'),
      embedPrompt: result.webChatHandoff?.embedPrompt,
      embedPromptFile: result.webChatOutcome.embedPromptFile,
      unknownSocketHost: Boolean(result.webChatOutcome.unknownSocketHost),
    };
  }

  if (result.webChatOutcome?.mode === 'scaffold' && result.webChatOutcome.projectDir) {
    const projectDir = result.webChatOutcome.projectDir;
    const port = resolveScaffoldDevPort(projectDir);
    const chatPath = result.webChatOutcome.chatPath ?? '/';

    return {
      kind: 'standalone-scaffold',
      chatUrl: formatLocalUrl(port, chatPath),
      devCommand: `cd ${JSON.stringify(projectDir)} && npm run dev`,
      unknownSocketHost: Boolean(result.webChatOutcome.unknownSocketHost),
    };
  }

  return {
    kind: 'generic-linked',
    dashboardUrl: result.webChatHandoff?.dashboardUrl,
    embedPromptFile: result.webChatOutcome?.embedPromptFile,
    projectDir: result.webChatOutcome?.projectDir,
  };
}

export function formatDemoSubscriberWarning(result: ConnectSuccessResult): string | null {
  const subscriberId = result.webChatOutcome?.demoSubscriberId;
  if (!subscriberId) {
    return null;
  }

  return `Demo subscriber id "${subscriberId}" (no signed-in user): every visitor shares one conversation. Replace it with your app's signed-in user id before production.`;
}

export function describeEmbedSuccessNextStep(connectMode: ReturnType<typeof resolveConnectEmbedRuntime>): string {
  return describeConnectEmbedPromptAction(connectMode);
}

export const UNKNOWN_SOCKET_HOST_WARNING =
  "Could not infer a socket URL for this API host — set NEXT_PUBLIC_NOVU_SOCKET_URL (and NEXT_PUBLIC_NOVU_SOCKET_TYPE if self-hosted) for your deployment, or Web Chat won't receive live replies.";
