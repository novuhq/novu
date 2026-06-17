import { createBridgeAgent, listAgents } from "../../api/agents";
import type { ConnectApiClient } from "../../api/client";
import type { ResolvedConnectAuth } from "../../auth/resolve-connect-auth";
import type {
  AgentSummary,
  ChatSdkConnectOutcome,
  ConnectCommandOptions,
} from "../../types";
import type { ConnectUI } from "../../ui/ui";
import {
  CHAT_SDK_PROMPT_FILE_ENV,
  writeChatSdkAgentPromptFile,
} from "./agent-prompt-file";
import {
  defaultAgentNameFromDir,
  deriveAgentIdentifier,
} from "./derive-identifier";
import { detectChatSdkProject } from "./detect-project";
import { runChatSdkSkillSetup } from "./integrate-adapter";
import { runChatSdkBridge } from "./run-bridge";
import { scaffoldChatSdkProject } from "./scaffold";
import {
  maskSecretKey,
  mergeProjectEnv,
  readEnvSecretKey,
  resolveProjectEnvPaths,
} from "./wire-env";

export type ChatSdkSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  client: ConnectApiClient;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

export async function runChatSdkProjectSetup(
  input: ChatSdkSetupInput,
): Promise<ChatSdkConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const detected = detectChatSdkProject(projectDir);

  if (detected.kind === "has-adapter") {
    return runHasAdapterEnvSetup({ input, projectDir: detected.projectDir });
  }

  if (detected.kind === "existing") {
    return runExistingProjectSkillSetup({
      input,
      projectDir: detected.projectDir,
    });
  }

  if (input.options.noScaffold) {
    return {
      projectKind: "empty",
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  const appName =
    input.options.scaffoldDir?.trim() ||
    defaultScaffoldAppName(input.agent.identifier);
  const confirmed = await input.ui.confirmScaffold({
    projectDir: detected.projectDir,
    appName,
  });

  if (!confirmed) {
    return {
      projectKind: "empty",
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  return scaffoldChatSdkApp({
    setup: input,
    parentDir: detected.projectDir,
    appName,
    projectKind: "empty",
  });
}

async function runHasAdapterEnvSetup(opts: {
  input: ChatSdkSetupInput;
  projectDir: string;
}): Promise<ChatSdkConnectOutcome> {
  const secretKey = requireSecretKey(opts.input.auth);
  const existingSecret = readEnvSecretKey(opts.projectDir);
  let overwriteSecretKey = false;

  if (existingSecret && existingSecret !== secretKey) {
    overwriteSecretKey = await resolveEnvSecretOverwrite({
      input: opts.input,
      projectDir: opts.projectDir,
      existingSecret,
      secretKey,
    });
  }

  const merge = mergeProjectEnv({
    projectDir: opts.projectDir,
    secretKey,
    agentIdentifier: opts.input.agent.identifier,
    apiBaseUrl: opts.input.options.apiUrl,
    overwriteSecretKey,
  });

  opts.input.ui.chatSdkEnvWired({
    projectDir: opts.projectDir,
    envPaths: merge.envPaths,
    updatedKeys: merge.updatedKeys,
  });

  return {
    projectKind: "has-adapter",
    projectDir: opts.projectDir,
    scaffolded: false,
    envPaths: merge.envPaths,
    needsAgentFollowUp: false,
  };
}

async function runExistingProjectSkillSetup(opts: {
  input: ChatSdkSetupInput;
  projectDir: string;
}): Promise<ChatSdkConnectOutcome> {
  const secretKey = requireSecretKey(opts.input.auth);
  const shouldInstall = await opts.input.ui.promptInstallChatSdkSkill({
    projectDir: opts.projectDir,
    agentIdentifier: opts.input.agent.identifier,
  });

  if (!shouldInstall) {
    return {
      projectKind: "existing",
      projectDir: opts.projectDir,
      scaffolded: false,
      needsAgentFollowUp: true,
    };
  }

  const existingSecret = readEnvSecretKey(opts.projectDir);
  let overwriteSecretKey = false;

  if (existingSecret && existingSecret !== secretKey) {
    overwriteSecretKey = await resolveEnvSecretOverwrite({
      input: opts.input,
      projectDir: opts.projectDir,
      existingSecret,
      secretKey,
    });
  }

  opts.input.ui.installingChatSdkSkill();

  const setup = await runChatSdkSkillSetup({
    projectDir: opts.projectDir,
    secretKey,
    agentIdentifier: opts.input.agent.identifier,
    apiBaseUrl: opts.input.options.apiUrl,
    overwriteSecretKey,
  });

  opts.input.ui.chatSdkEnvWired({
    projectDir: opts.projectDir,
    envPaths: setup.envPaths,
    updatedKeys: setup.updatedKeys,
  });

  await opts.input.ui.awaitChatSdkAgentPrompt({
    projectDir: opts.projectDir,
    envPaths: setup.envPaths,
    skillDestinations: setup.skillsInstalled.map((skill) => skill.destination),
    agentPrompt: setup.agentPrompt,
    agentPromptFile: writeChatSdkAgentPromptFile(setup.agentPrompt),
  });

  return {
    projectKind: "existing",
    projectDir: opts.projectDir,
    scaffolded: false,
    envPaths: setup.envPaths,
    needsAgentFollowUp: true,
  };
}

async function resolveEnvSecretOverwrite(opts: {
  input: ChatSdkSetupInput;
  projectDir: string;
  existingSecret: string;
  secretKey: string;
}): Promise<boolean> {
  if (opts.input.options.ci) {
    throw new Error(
      `${resolveProjectEnvPaths(opts.projectDir)[0]} already has a different NOVU_SECRET_KEY. ` +
        "Remove it or align the key before re-running connect in --ci mode.",
    );
  }

  return opts.input.ui.confirmEnvSecretOverwrite({
    envPath: resolveProjectEnvPaths(opts.projectDir)[0],
    existingMasked: maskSecretKey(opts.existingSecret),
    nextMasked: maskSecretKey(opts.secretKey),
  });
}

function defaultScaffoldAppName(agentIdentifier: string): string {
  return `${agentIdentifier}-chat-sdk`;
}

async function scaffoldChatSdkApp(opts: {
  setup: ChatSdkSetupInput;
  parentDir: string;
  appName: string;
  projectKind: ChatSdkConnectOutcome["projectKind"];
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

  const merge = mergeProjectEnv({
    projectDir: scaffolded.root,
    secretKey: requireSecretKey(opts.setup.auth),
    agentIdentifier: opts.setup.agent.identifier,
    apiBaseUrl: opts.setup.options.apiUrl,
  });

  opts.setup.ui.chatSdkScaffolded({
    projectDir: scaffolded.root,
    envPaths: merge.envPaths,
    skippedInstall: scaffolded.skippedInstall,
  });

  return {
    projectKind: opts.projectKind,
    projectDir: scaffolded.root,
    scaffolded: true,
    envPaths: merge.envPaths,
    skippedInstall: scaffolded.skippedInstall,
  };
}

export async function createBridgeAgentFlow(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions,
): Promise<{ agent: AgentSummary; flow: "created" | "reused" }> {
  const existingAgents = await listAgents(client);
  const bridgeAgents = existingAgents.filter(
    (agent) => agent.runtime !== "managed",
  );

  if (bridgeAgents.length > 0 && !options.prompt) {
    const pick = await ui.pickExistingOrCreate(bridgeAgents.map(toSummary));

    if (pick.action === "use") {
      return { agent: pick.agent, flow: "reused" };
    }
  }

  const defaultName = defaultAgentNameFromDir(
    options.scaffoldDir?.trim() ||
      options.projectDir?.trim() ||
      pathBasename(process.cwd()),
  );
  const name = await ui.promptForAgentName(defaultName);
  const identifier = deriveAgentIdentifier(name);

  ui.creatingAgent(name);
  const created = await createBridgeAgent(client, { name, identifier });

  return { agent: toSummary(created), flow: "created" };
}

export async function maybeRunChatSdkTunnel(input: {
  outcome: ChatSdkConnectOutcome | undefined;
}): Promise<boolean> {
  const { outcome } = input;
  if (!shouldRunChatSdkTunnel(outcome)) {
    return false;
  }

  await runChatSdkBridge({
    projectDir: outcome.projectDir,
  });

  return true;
}

function shouldRunChatSdkTunnel(
  outcome: ChatSdkConnectOutcome | undefined,
): outcome is ChatSdkConnectOutcome {
  if (!outcome) return false;
  if (outcome.skippedInstall) return false;

  return outcome.scaffolded === true;
}

function requireSecretKey(auth: ResolvedConnectAuth): string {
  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    throw new Error(
      "Chat SDK connect requires an authenticated Novu session with a secret key.",
    );
  }

  return secretKey;
}

function pathBasename(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, "").split(/[/\\]/);

  return parts[parts.length - 1] || "my-chat-sdk-agent";
}

function toSummary(
  agent: { _id: string; identifier: string; name: string } | AgentSummary,
): AgentSummary {
  const id = "_id" in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}

export { CHAT_SDK_PROMPT_FILE_ENV };
