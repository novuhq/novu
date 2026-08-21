import fs from 'node:fs';
import path from 'node:path';
import { describeConnectEmbedPromptAction } from '@novu/shared';
import { resolveConnectEmbedRuntime } from '../pipeline/agent-chat/run-agent-chat-setup';
import type { AgentConnectMode } from '../types';
import type { ConnectUI } from './ui';

export type ConnectSuccessResult = Parameters<ConnectUI['success']>[0];

export type AgentChatMergedScaffoldSuccess = {
  kind: 'merged-scaffold';
  agentName: string;
  agentIdentifier: string;
  appName: string;
  chatUrl: string;
  handlerRoute: string;
  editAgentHint?: string;
  devCommand: string;
  skippedInstall: boolean;
};

export type AgentChatStandaloneScaffoldSuccess = {
  kind: 'standalone-scaffold';
  chatUrl: string;
  devCommand: string;
};

export type AgentChatEmbedSuccess = {
  kind: 'embed';
  alreadyWired: boolean;
  envSummary: string | null;
  connectMode: ReturnType<typeof resolveConnectEmbedRuntime>;
  embedPrompt?: string;
  embedPromptFile?: string;
};

export type AgentChatGenericLinkedSuccess = {
  kind: 'generic-linked';
  dashboardUrl?: string;
  embedPromptFile?: string;
  projectDir?: string;
};

export type AgentChatSuccessPresentation =
  | AgentChatMergedScaffoldSuccess
  | AgentChatStandaloneScaffoldSuccess
  | AgentChatEmbedSuccess
  | AgentChatGenericLinkedSuccess
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

export function resolveAgentChatSuccessPresentation(result: ConnectSuccessResult): AgentChatSuccessPresentation {
  if (result.connectedChannel !== 'agent-chat') {
    return null;
  }

  const bridgeOutcome =
    result.chatSdkOutcome ?? result.aiSdkOutcome ?? result.langChainOutcome ?? result.customCodeOutcome;

  if (result.agentChatOutcome?.mergedIntoBridge && bridgeOutcome?.scaffolded && bridgeOutcome.projectDir) {
    const port = resolveScaffoldDevPort(bridgeOutcome.projectDir);
    const chatPath = result.agentChatOutcome.chatPath ?? '/';

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
    };
  }

  if (result.agentChatOutcome?.mode === 'embed' && result.agentChatOutcome.projectDir) {
    return {
      kind: 'embed',
      alreadyWired: result.agentChatOutcome.alreadyWired === true,
      envSummary: summarizeEnvPaths(result.agentChatOutcome.envPaths),
      connectMode: resolveConnectEmbedRuntime(result.connectMode ?? 'ai-sdk'),
      embedPrompt: result.agentChatHandoff?.embedPrompt,
      embedPromptFile: result.agentChatOutcome.embedPromptFile,
    };
  }

  if (result.agentChatOutcome?.mode === 'scaffold' && result.agentChatOutcome.projectDir) {
    const projectDir = result.agentChatOutcome.projectDir;
    const port = resolveScaffoldDevPort(projectDir);
    const chatPath = result.agentChatOutcome.chatPath ?? '/';

    return {
      kind: 'standalone-scaffold',
      chatUrl: formatLocalUrl(port, chatPath),
      devCommand: `cd ${JSON.stringify(projectDir)} && npm run dev`,
    };
  }

  return {
    kind: 'generic-linked',
    dashboardUrl: result.agentChatHandoff?.dashboardUrl,
    embedPromptFile: result.agentChatOutcome?.embedPromptFile,
    projectDir: result.agentChatOutcome?.projectDir,
  };
}

export function describeEmbedSuccessNextStep(connectMode: ReturnType<typeof resolveConnectEmbedRuntime>): string {
  return describeConnectEmbedPromptAction(connectMode);
}
