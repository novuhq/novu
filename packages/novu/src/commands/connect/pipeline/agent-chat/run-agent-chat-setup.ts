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
  ConnectAgentChatHandoff,
  ConnectCommandOptions,
} from '../../types';
import { logAgentChatEmbedPromptFileHandoffEvent, writeAgentChatEmbedPromptHandoffFile } from '../../ui/handoff-events';
import type { ConnectUI } from '../../ui/ui';
import {
  type AgentChatProjectWiringState,
  type BridgeSetupSnapshot,
  resolveAgentChatProjectWiringState,
  resolveHandlerWired,
} from './resolve-agent-chat-wiring-state';
import {
  defaultAgentChatScaffoldDirName,
  detectAgentChatProjectKind,
  scaffoldAgentChatProject,
} from './scaffold-agent-chat';
import { mergeAgentChatEnv } from './wire-agent-chat-env';

export type { BridgeSetupSnapshot } from './resolve-agent-chat-wiring-state';
export { resolveHandlerWired } from './resolve-agent-chat-wiring-state';

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
  const wiringState =
    projectKind === 'project'
      ? resolveAgentChatProjectWiringState(projectDir, input.connectMode, input.bridgeOutcome)
      : 'unwired';

  if (!explicitMode && wiringState === 'wired') {
    return runAgentChatAlreadyWiredSetup(input, projectDir);
  }

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
    return runAgentChatEmbedSetup(input, projectDir, wiringState);
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

async function runAgentChatAlreadyWiredSetup(
  input: {
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
    handlerWired: true,
  });
  input.handoff.embedPrompt = embedPrompt;

  return {
    mode: 'embed',
    projectDir,
    envPaths: envResult.envPaths,
    alreadyWired: true,
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
  projectDir: string,
  _wiringState: AgentChatProjectWiringState
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
  const handlerWired = resolveHandlerWired(input.bridgeOutcome);
  const embedPrompt = buildConnectEmbedPrompt({
    agentName: input.agent.name,
    agentIdentifier: input.agent.identifier,
    applicationIdentifier,
    subscriberId,
    envPaths: envResult.envPaths,
    connectMode: resolveConnectEmbedRuntime(input.connectMode),
    handlerWired,
  });
  input.handoff.embedPrompt = embedPrompt;

  const embedPromptFile = input.ui.interactive ? undefined : await writeAgentChatEmbedPromptHandoffFile(embedPrompt);

  input.handoff.embedPromptFile = embedPromptFile;

  if (!input.ui.interactive && embedPromptFile) {
    logAgentChatEmbedPromptFileHandoffEvent({ embedPromptFile });
  }

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
