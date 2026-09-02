import path from 'node:path';
import { buildConnectEmbedPrompt, type ConnectEmbedRuntime, SUBSCRIBER_ID_PLACEHOLDER } from '@novu/shared';
import chalk from 'chalk';
import { resolveConnectApplicationIdentifier } from '../../auth/resolve-connect-application-identifier';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  WebChatConnectOutcome,
  WebChatSetupMode,
  AgentConnectMode,
  AgentSummary,
  ConnectWebChatHandoff,
  ConnectCommandOptions,
} from '../../types';
import { logWebChatEmbedPromptFileHandoffEvent, writeWebChatEmbedPromptHandoffFile } from '../../ui/handoff-events';
import type { ConnectUI } from '../../ui/ui';
import {
  type BridgeSetupSnapshot,
  resolveWebChatProjectWiringState,
  resolveHandlerWired,
} from './resolve-web-chat-wiring-state';
import {
  defaultWebChatScaffoldDirName,
  detectWebChatProjectKind,
  scaffoldWebChatProject,
} from './scaffold-web-chat';
import { mergeWebChatEnv } from './wire-web-chat-env';

export type { BridgeSetupSnapshot } from './resolve-web-chat-wiring-state';
export { resolveHandlerWired } from './resolve-web-chat-wiring-state';

export async function runWebChatProjectSetup(input: {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
  handoff: ConnectWebChatHandoff;
  connectMode: AgentConnectMode;
  bridgeOutcome?: BridgeSetupSnapshot;
  bridgeProjectDir?: string;
  autoMergeIntoBridge?: boolean;
}): Promise<WebChatConnectOutcome> {
  const projectDir = path.resolve(input.options.projectDir ?? process.cwd());
  const projectKind = detectWebChatProjectKind(projectDir);
  const explicitMode = resolveExplicitWebChatSetupMode(input.options);
  const wiringState =
    projectKind === 'project'
      ? resolveWebChatProjectWiringState(projectDir, input.connectMode, input.bridgeOutcome)
      : 'unwired';

  if (!explicitMode && wiringState === 'wired') {
    return runWebChatEmbedSetup(input, projectDir, { alreadyWired: true });
  }

  const mode =
    explicitMode ??
    (input.autoMergeIntoBridge && input.bridgeProjectDir
      ? 'scaffold'
      : input.ui.interactive
        ? await input.ui.pickWebChatSetup({ projectKind })
        : resolveWebChatSetupMode(input.options, projectKind));

  if (mode === 'skip') {
    return { mode };
  }

  if (mode === 'embed') {
    return runWebChatEmbedSetup(input, projectDir, { alreadyWired: false });
  }

  const applicationIdentifier = await resolveConnectApplicationIdentifier(input.auth);
  const subscriberId = input.auth.user?.id ?? SUBSCRIBER_ID_PLACEHOLDER;

  if (input.ui.interactive) {
    await input.ui.releaseTerminal();
    console.log(chalk.cyan('Scaffolding your Web Chat example app…'));
    console.log(`${chalk.gray('Installing dependencies — this may take a minute.')}\n`);
  } else {
    input.ui.scaffoldingWebChat();
  }

  const result = await scaffoldWebChatProject({
    parentDir: projectDir,
    appName: defaultWebChatScaffoldDirName(input.agent.identifier),
    agentIdentifier: input.agent.identifier,
    applicationIdentifier,
    subscriberId,
    apiUrl: input.auth.apiUrl,
    region: input.options.region,
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

async function runWebChatEmbedSetup(
  input: {
    options: ConnectCommandOptions;
    ui: ConnectUI;
    auth: ResolvedConnectAuth;
    agent: AgentSummary;
    handoff: ConnectWebChatHandoff;
    connectMode: AgentConnectMode;
    bridgeOutcome?: BridgeSetupSnapshot;
  },
  projectDir: string,
  opts: { alreadyWired: boolean }
): Promise<WebChatConnectOutcome> {
  const applicationIdentifier = await resolveConnectApplicationIdentifier(input.auth);
  const subscriberId = input.auth.user?.id ?? SUBSCRIBER_ID_PLACEHOLDER;
  const envResult = mergeWebChatEnv({
    projectDir,
    applicationIdentifier,
    subscriberId,
    agentIdentifier: input.agent.identifier,
    apiUrl: input.auth.apiUrl,
  });
  const handlerWired = opts.alreadyWired ? true : resolveHandlerWired(input.bridgeOutcome);
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

  const embedPromptFile =
    !opts.alreadyWired && !input.ui.interactive ? await writeWebChatEmbedPromptHandoffFile(embedPrompt) : undefined;

  input.handoff.embedPromptFile = embedPromptFile;

  if (!input.ui.interactive && embedPromptFile) {
    logWebChatEmbedPromptFileHandoffEvent({ embedPromptFile });
  }

  return {
    mode: 'embed',
    projectDir,
    embedPromptFile,
    envPaths: envResult.envPaths,
    alreadyWired: opts.alreadyWired,
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

export function resolveWebChatSetupMode(
  options: ConnectCommandOptions,
  projectKind: 'empty' | 'project'
): WebChatSetupMode {
  return resolveExplicitWebChatSetupMode(options) ?? (projectKind === 'empty' ? 'scaffold' : 'embed');
}

function resolveExplicitWebChatSetupMode(options: ConnectCommandOptions): WebChatSetupMode | undefined {
  const explicit = options.webChatSetup?.trim().toLowerCase();
  if (explicit === 'scaffold' || explicit === 'embed' || explicit === 'skip') {
    return explicit;
  }

  return undefined;
}
