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

  if (detected.kind === 'empty' && !input.options.noScaffold) {
    input.ui.scaffoldingChatSdk();

    const scaffolded = await scaffoldChatSdkProject({
      parentDir: projectDir,
      appName: input.options.scaffoldDir?.trim(),
      secretKey: requireSecretKey(input.auth),
      apiUrl: input.options.apiUrl,
      agentIdentifier: input.agent.identifier,
    });

    const merge = mergeEnvLocal({
      projectDir: scaffolded.root,
      secretKey: requireSecretKey(input.auth),
      agentIdentifier: input.agent.identifier,
      apiBaseUrl: input.options.apiUrl,
    });

    input.ui.chatSdkScaffolded({ projectDir: scaffolded.root, envPath: merge.envPath });

    return {
      projectKind: 'empty',
      projectDir: scaffolded.root,
      scaffolded: true,
      envPath: merge.envPath,
    };
  }

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
    projectKind: 'project-no-adapter',
    projectDir: detected.projectDir,
    scaffolded: false,
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
  if (!input.outcome?.scaffolded) {
    return false;
  }

  await runChatSdkBridge({
    projectDir: input.outcome.projectDir,
    agentIdentifier: input.agent.identifier,
    client: input.client,
  });

  return true;
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
