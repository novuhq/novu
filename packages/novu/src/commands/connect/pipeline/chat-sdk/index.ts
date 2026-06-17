import { createBridgeAgent, listAgents } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ChatSdkConnectOutcome, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from './derive-identifier';
import { detectChatSdkProject } from './detect-project';
import { runChatSdkBridge } from './run-bridge';
import { scaffoldChatSdkProject } from './scaffold';
import { buildChatSdkSkillInstructions, CHAT_SDK_SKILL_INSTALL_COMMAND } from './skill-instructions';
import { mergeEnvLocal, readEnvSecretKey } from './wire-env';

export type ChatSdkSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  client: ConnectApiClient;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

export async function runChatSdkProjectSetup(input: ChatSdkSetupInput): Promise<ChatSdkConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const detected = detectChatSdkProject(projectDir);

  if (detected.kind === 'has-adapter') {
    const existingSecret = readEnvSecretKey(detected.projectDir);
    const secretKey = requireSecretKey(input.auth);
    let overwriteSecretKey = false;

    if (existingSecret && existingSecret !== secretKey) {
      overwriteSecretKey = await input.ui.confirmEnvSecretOverwrite({
        envPath: `${detected.projectDir}/.env.local`,
        existingMasked: maskForUi(existingSecret),
        nextMasked: maskForUi(secretKey),
      });
    }

    const merge = mergeEnvLocal({
      projectDir: detected.projectDir,
      secretKey,
      agentIdentifier: input.agent.identifier,
      apiBaseUrl: input.options.apiUrl,
      overwriteSecretKey,
    });

    input.ui.chatSdkEnvWired({
      envPath: merge.envPath,
      updatedKeys: merge.updatedKeys,
      projectDir: detected.projectDir,
    });

    return {
      projectKind: 'has-adapter',
      projectDir: detected.projectDir,
      scaffolded: false,
      envPath: merge.envPath,
    };
  }

  if (input.options.noScaffold) {
    const instructions = buildChatSdkSkillInstructions({
      agentIdentifier: input.agent.identifier,
      secretKey: requireSecretKey(input.auth),
    });

    input.ui.chatSdkSkillInstructions({
      installCommand: CHAT_SDK_SKILL_INSTALL_COMMAND,
      lines: instructions,
      agentIdentifier: input.agent.identifier,
    });

    return {
      projectKind: detected.kind === 'empty' ? 'empty' : 'project-no-adapter',
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  const appName = input.options.scaffoldDir?.trim() || defaultScaffoldAppName(input.agent.identifier);
  const confirmed = await input.ui.confirmScaffold({
    projectDir: detected.projectDir,
    appName,
  });

  if (!confirmed) {
    return {
      projectKind: detected.kind === 'empty' ? 'empty' : 'project-no-adapter',
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  return scaffoldChatSdkApp({
    setup: input,
    parentDir: detected.projectDir,
    appName,
    projectKind: detected.kind === 'empty' ? 'empty' : 'project-no-adapter',
  });
}

function defaultScaffoldAppName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}

async function scaffoldChatSdkApp(opts: {
  setup: ChatSdkSetupInput;
  parentDir: string;
  appName: string;
  projectKind: ChatSdkConnectOutcome['projectKind'];
}): Promise<ChatSdkConnectOutcome> {
  opts.setup.ui.scaffoldingChatSdk();

  const scaffolded = await scaffoldChatSdkProject({
    parentDir: opts.parentDir,
    appName: opts.appName,
    secretKey: requireSecretKey(opts.setup.auth),
    apiUrl: opts.setup.options.apiUrl,
    agentIdentifier: opts.setup.agent.identifier,
    silent: opts.setup.ui.interactive,
  });

  const merge = mergeEnvLocal({
    projectDir: scaffolded.root,
    secretKey: requireSecretKey(opts.setup.auth),
    agentIdentifier: opts.setup.agent.identifier,
    apiBaseUrl: opts.setup.options.apiUrl,
  });

  opts.setup.ui.chatSdkScaffolded({
    projectDir: scaffolded.root,
    envPath: merge.envPath,
    skippedInstall: scaffolded.skippedInstall,
  });

  return {
    projectKind: opts.projectKind,
    projectDir: scaffolded.root,
    scaffolded: true,
    envPath: merge.envPath,
    skippedInstall: scaffolded.skippedInstall,
  };
}

export async function createBridgeAgentFlow(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions
): Promise<{ agent: AgentSummary; flow: 'created' | 'reused' }> {
  const existingAgents = await listAgents(client);
  const bridgeAgents = existingAgents.filter((agent) => agent.runtime !== 'managed');

  if (bridgeAgents.length > 0 && !options.prompt) {
    const pick = await ui.pickExistingOrCreate(bridgeAgents.map(toSummary));

    if (pick.action === 'use') {
      return { agent: pick.agent, flow: 'reused' };
    }
  }

  const defaultName = defaultAgentNameFromDir(
    options.scaffoldDir?.trim() || options.projectDir?.trim() || pathBasename(process.cwd())
  );
  const name = await ui.promptForAgentName(defaultName);
  const identifier = deriveAgentIdentifier(name);

  ui.creatingAgent(name);
  const created = await createBridgeAgent(client, { name, identifier });

  return { agent: toSummary(created), flow: 'created' };
}

export async function maybeRunChatSdkTunnel(input: {
  outcome: ChatSdkConnectOutcome | undefined;
  options: ConnectCommandOptions;
  client: ConnectApiClient;
  agent: AgentSummary;
}): Promise<boolean> {
  if (!shouldRunChatSdkTunnel(input.outcome)) {
    return false;
  }

  await runChatSdkBridge({
    projectDir: input.outcome!.projectDir,
    agentIdentifier: input.agent.identifier,
    client: input.client,
  });

  return true;
}

function shouldRunChatSdkTunnel(outcome: ChatSdkConnectOutcome | undefined): outcome is ChatSdkConnectOutcome {
  if (!outcome) return false;
  if (outcome.skippedInstall) return false;
  if (outcome.scaffolded) return true;

  return outcome.projectKind === 'has-adapter';
}

function requireSecretKey(auth: ResolvedConnectAuth): string {
  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    throw new Error('Chat SDK connect requires an authenticated Novu session with a secret key.');
  }

  return secretKey;
}

function maskForUi(secretKey: string): string {
  if (secretKey.length <= 8) {
    return '••••••••';
  }

  return `${secretKey.slice(0, 4)}…${secretKey.slice(-4)}`;
}

function pathBasename(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, '').split(/[/\\]/);

  return parts[parts.length - 1] || 'my-chat-sdk-agent';
}

function toSummary(agent: { _id: string; identifier: string; name: string } | AgentSummary): AgentSummary {
  const id = '_id' in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}
