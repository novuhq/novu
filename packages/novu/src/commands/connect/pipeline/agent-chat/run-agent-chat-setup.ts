import fs from 'node:fs';
import path from 'node:path';
import { SUBSCRIBER_ID_PLACEHOLDER } from '@novu/shared';
import chalk from 'chalk';
import { resolveConnectApplicationIdentifier } from '../../auth/resolve-connect-application-identifier';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  AgentChatConnectOutcome,
  AgentChatSetupMode,
  AgentSummary,
  ConnectAgentChatHandoff,
  ConnectCommandOptions,
} from '../../types';
import type { ConnectUI } from '../../ui/ui';
import {
  defaultAgentChatScaffoldDirName,
  detectAgentChatProjectKind,
  scaffoldAgentChatProject,
} from './scaffold-agent-chat';

export async function runAgentChatProjectSetup(input: {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
  handoff: ConnectAgentChatHandoff;
  bridgeProjectDir?: string;
  autoMergeIntoBridge?: boolean;
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

  if (mode === 'skip' || mode === 'embed') {
    if (mode === 'embed') {
      const embedPromptFile = path.join(projectDir, 'novu-agent-chat-embed-prompt.txt');
      fs.writeFileSync(embedPromptFile, input.handoff.embedPrompt, 'utf8');

      return { mode, embedPromptFile };
    }

    return { mode };
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
  };
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
