import path from 'node:path';
import { APPLICATION_IDENTIFIER_PLACEHOLDER, SUBSCRIBER_ID_PLACEHOLDER } from '@novu/shared';
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
  detectAgentChatProjectKind,
  defaultAgentChatScaffoldDirName,
  scaffoldAgentChatProject,
} from './scaffold-agent-chat';

export async function runAgentChatProjectSetup(input: {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
  handoff: ConnectAgentChatHandoff;
  bridgeProjectDir?: string;
}): Promise<AgentChatConnectOutcome> {
  const projectDir = path.resolve(input.options.projectDir ?? process.cwd());
  const projectKind = detectAgentChatProjectKind(projectDir);

  const mode = input.ui.interactive
    ? await input.ui.pickAgentChatSetup({ projectKind })
    : resolveAgentChatSetupMode(input.options, projectKind);

  if (mode === 'skip' || mode === 'embed') {
    return { mode };
  }

  const applicationIdentifier = input.auth.keylessApplicationIdentifier?.trim() || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const subscriberId = input.auth.user?.id ?? SUBSCRIBER_ID_PLACEHOLDER;

  const result = await scaffoldAgentChatProject({
    parentDir: projectDir,
    appName: defaultAgentChatScaffoldDirName(input.agent.identifier),
    agentIdentifier: input.agent.identifier,
    applicationIdentifier,
    subscriberId,
    apiUrl: input.auth.apiUrl,
    secretKey: input.auth.secretKey,
    mergeIntoProjectDir: input.bridgeProjectDir,
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
  const explicit = options.agentChatSetup?.trim().toLowerCase();
  if (explicit === 'scaffold' || explicit === 'embed' || explicit === 'skip') {
    return explicit;
  }

  return projectKind === 'empty' ? 'scaffold' : 'embed';
}
