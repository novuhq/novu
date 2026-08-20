import path from 'node:path';
import { buildConnectEmbedPrompt, type ConnectEmbedRuntime, SUBSCRIBER_ID_PLACEHOLDER } from '@novu/shared';
import chalk from 'chalk';
import { resolveConnectApplicationIdentifier } from '../../auth/resolve-connect-application-identifier';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  AgentChatConnectOutcome,
  AgentChatSetupMode,
  AgentConnectMode,
  AgentSummary,
  AiSdkConnectOutcome,
  ChatSdkConnectOutcome,
  ConnectAgentChatHandoff,
  ConnectCommandOptions,
  CustomCodeConnectOutcome,
  LangChainConnectOutcome,
} from '../../types';
import { logAgentChatEmbedPromptFileHandoffEvent, writeAgentChatEmbedPromptHandoffFile } from '../../ui/handoff-events';
import type { ConnectUI } from '../../ui/ui';
import {
  defaultAgentChatScaffoldDirName,
  detectAgentChatProjectKind,
  scaffoldAgentChatProject,
} from './scaffold-agent-chat';
import { mergeAgentChatEnv } from './wire-agent-chat-env';

export type BridgeSetupSnapshot =
  | AiSdkConnectOutcome
  | LangChainConnectOutcome
  | ChatSdkConnectOutcome
  | CustomCodeConnectOutcome;

export async function runAgentChatProjectSetup(input: {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
  handoff: ConnectAgentChatHandoff;
  connectMode: AgentConnectMode;
  bridgeOutcome?: BridgeSetupSnapshot;
  bridgeProjectDir?: string;
  autoMergeIntoBridge?: boolean;
  deferAgentPrompt?: boolean;
}): Promise<AgentChatConnectOutcome> {
  const projectDir = path.resolve(input.options.projectDir ?? process.cwd());
  const projectKind = detectAgentChatProjectKind(projectDir);
  const explicitMode = resolveExplicitAgentChatSetupMode(input.options);

  const mode =
    explicitMode ??
    (input.autoMergeIntoBridge && input.bridgeProjectDir
      ? 'scaffold'
      : input.ui.interactive
        ? await input.ui.pickAgentChatSetup({ projectKind })
        : resolveAgentChatSetupMode(input.options, projectKind));

  if (mode === 'skip') {
    return { mode };
  }

  if (mode === 'embed') {
    return runAgentChatEmbedSetup(input, projectDir);
  }

  const applicationIdentifier = await resolveConnectApplicationIdentifier(input.auth);
  const subscriberId = input.auth.user?.id ?? SUBSCRIBER_ID_PLACEHOLDER;

  if (input.ui.interactive) {
    await input.ui.releaseTerminal();
    console.log(chalk.cyan('Scaffolding your Agent Chat example app…'));
    console.log(`${chalk.gray('Installing dependencies — this may take a minute.')}\n`);
  } else {
    input.ui.scaffoldingAgentChat();
  }

  const result = await scaffoldAgentChatProject({
    parentDir: projectDir,
    appName: defaultAgentChatScaffoldDirName(input.agent.identifier),
    agentIdentifier: input.agent.identifier,
    applicationIdentifier,
    subscriberId,
    apiUrl: input.auth.apiUrl,
    mergeIntoProjectDir: input.bridgeProjectDir,
    mergeAtRoot: input.autoMergeIntoBridge,
  });

  return {
    mode: 'scaffold',
    projectDir: result.projectDir,
    scaffolded: result.scaffolded,
    mergedIntoBridge: result.mergedIntoBridge,
    chatPath: result.chatPath,
  };
}

async function runAgentChatEmbedSetup(
  input: {
    options: ConnectCommandOptions;
    ui: ConnectUI;
    auth: ResolvedConnectAuth;
    agent: AgentSummary;
    handoff: ConnectAgentChatHandoff;
    connectMode: AgentConnectMode;
    bridgeOutcome?: BridgeSetupSnapshot;
  },
  projectDir: string
): Promise<AgentChatConnectOutcome> {
  const applicationIdentifier = await resolveConnectApplicationIdentifier(input.auth);
  const subscriberId = input.auth.user?.id ?? SUBSCRIBER_ID_PLACEHOLDER;
  const envResult = mergeAgentChatEnv({
    projectDir,
    applicationIdentifier,
    subscriberId,
    agentIdentifier: input.agent.identifier,
    apiUrl: input.auth.apiUrl,
  });
  const embedPrompt = buildConnectEmbedPrompt({
    agentName: input.agent.name,
    agentIdentifier: input.agent.identifier,
    applicationIdentifier,
    subscriberId,
    envPaths: envResult.envPaths,
    connectMode: resolveConnectEmbedRuntime(input.connectMode),
    handlerWired: resolveHandlerWired(input.bridgeOutcome),
  });
  input.handoff.embedPrompt = embedPrompt;

  const embedPromptFile = input.ui.interactive ? undefined : await writeAgentChatEmbedPromptHandoffFile(embedPrompt);

  input.handoff.embedPromptFile = embedPromptFile;

  if (!input.ui.interactive && embedPromptFile) {
    logAgentChatEmbedPromptFileHandoffEvent({ embedPromptFile });
  }

  await input.ui.awaitAgentChatEmbedReady({
    embedPrompt,
    embedPromptFile,
    envPaths: envResult.envPaths,
  });

  return {
    mode: 'embed',
    projectDir,
    embedPromptFile,
    envPaths: envResult.envPaths,
  };
}

export function resolveConnectEmbedRuntime(connectMode: AgentConnectMode): ConnectEmbedRuntime {
  if (
    connectMode === 'ai-sdk' ||
    connectMode === 'langchain' ||
    connectMode === 'custom-code' ||
    connectMode === 'chat-sdk' ||
    connectMode === 'demo' ||
    connectMode === 'claude' ||
    connectMode === 'claude-aws'
  ) {
    return connectMode;
  }

  return 'ai-sdk';
}

export function resolveHandlerWired(bridgeOutcome?: BridgeSetupSnapshot): boolean {
  if (!bridgeOutcome) {
    return false;
  }

  if ('requirements' in bridgeOutcome && bridgeOutcome.requirements) {
    const wiring = bridgeOutcome.requirements.find((req) => req.id === 'code-wiring');
    if (wiring) {
      return wiring.status === 'ok';
    }
  }

  if ('agentFilePath' in bridgeOutcome && bridgeOutcome.agentFilePath) {
    return true;
  }

  return false;
}

export function resolveAgentChatSetupMode(
  options: ConnectCommandOptions,
  projectKind: 'empty' | 'project'
): AgentChatSetupMode {
  return resolveExplicitAgentChatSetupMode(options) ?? (projectKind === 'empty' ? 'scaffold' : 'embed');
}

function resolveExplicitAgentChatSetupMode(options: ConnectCommandOptions): AgentChatSetupMode | undefined {
  const explicit = options.agentChatSetup?.trim().toLowerCase();
  if (explicit === 'scaffold' || explicit === 'embed' || explicit === 'skip') {
    return explicit;
  }

  return undefined;
}
