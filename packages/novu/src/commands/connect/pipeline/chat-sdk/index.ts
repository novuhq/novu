import { createBridgeAgent, listAgents } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ChatSdkConnectOutcome, ChatSdkRequirement, ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from './derive-identifier';
import { detectChatSdkProject } from './detect-project';
import { applyDevNovuScript, buildDevNovuScript } from './dev-script';
import { buildChatSdkInstallCommand, resolveChatSdkPackagesToInstall, runChatSdkPackageInstall } from './package-install';
import { computeChatSdkRequirements, recomputeCoreReady, writeChatSdkRequirementsFile } from './requirements';
import { runChatSdkBridge } from './run-bridge';
import { scaffoldChatSdkProject } from './scaffold';
import { maskSecretKey, mergeProjectEnv, readEnvSecretKey, resolveProjectEnvPaths } from './wire-env';
import { buildCodeWiringInstructions } from './wiring-instructions';

export type ChatSdkSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

export async function runChatSdkProjectSetup(input: ChatSdkSetupInput): Promise<ChatSdkConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const detected = detectChatSdkProject(projectDir);

  if (detected.kind === 'empty') {
    if (input.options.noScaffold) {
      return {
        projectKind: 'empty',
        projectDir: detected.projectDir,
        scaffolded: false,
        coreReady: false,
      };
    }

    const appName = input.options.scaffoldDir?.trim() || defaultScaffoldAppName(input.agent.identifier);
    const confirmed = await input.ui.confirmScaffold({
      projectDir: detected.projectDir,
      appName,
    });

    if (!confirmed) {
      return {
        projectKind: 'empty',
        projectDir: detected.projectDir,
        scaffolded: false,
        coreReady: false,
      };
    }

    return scaffoldChatSdkApp({
      setup: input,
      parentDir: detected.projectDir,
      appName,
      projectKind: 'empty',
    });
  }

  return reconcileChatSdkProject(input, detected.projectDir, detected.kind);
}

async function reconcileChatSdkProject(
  input: ChatSdkSetupInput,
  projectDir: string,
  projectKind: ChatSdkConnectOutcome['projectKind']
): Promise<ChatSdkConnectOutcome> {
  const secretKey = requireSecretKey(input.auth);
  let snapshot = computeChatSdkRequirements({
    projectDir,
    secretKey,
    agentIdentifier: input.agent.identifier,
  });

  const envPaths: string[] = [];

  const envReq = snapshot.requirements.find((req) => req.id === 'env');
  if (envReq && envReq.status !== 'ok') {
    const merge = await applyEnvRequirement(input, projectDir, secretKey);
    envPaths.push(...merge.envPaths);
    snapshot = refreshRequirements(input, projectDir, snapshot.requirements, 'env');
  }

  const devScriptReq = snapshot.requirements.find((req) => req.id === 'dev-script');
  if (devScriptReq && devScriptReq.status !== 'ok') {
    applyDevNovuScript(projectDir);
    snapshot = refreshRequirements(input, projectDir, snapshot.requirements, 'dev-script');
  }

  const packageReq = snapshot.requirements.find((req) => req.id === 'package');
  if (packageReq && packageReq.status !== 'ok') {
    const packagesToInstall = resolveChatSdkPackagesToInstall(projectDir);
    const installCommand = buildChatSdkInstallCommand(projectDir);

    if (input.options.ci) {
      snapshot.requirements = snapshot.requirements.map((req) =>
        req.id === 'package' ? { ...req, status: 'manual', detail: `Run: ${installCommand}` } : req
      );
    } else {
      const shouldInstall = await input.ui.confirmInstallChatSdkDeps({
        projectDir,
        installCommand,
        packages: packagesToInstall,
      });

      if (shouldInstall) {
        input.ui.installingChatSdkDeps();
        await runChatSdkPackageInstall({
          projectDir,
          silent: input.ui.interactive,
        });
        snapshot = refreshRequirements(input, projectDir, snapshot.requirements, 'package');
      } else {
        snapshot.requirements = snapshot.requirements.map((req) =>
          req.id === 'package' ? { ...req, status: 'manual', detail: `Skipped — run: ${installCommand}` } : req
        );
      }
    }
  }

  snapshot.coreReady = recomputeCoreReady(snapshot.requirements);

  const wiringReq = snapshot.requirements.find((req) => req.id === 'code-wiring');
  const wiringInstructions =
    wiringReq && wiringReq.status !== 'ok' ? buildCodeWiringInstructions(projectDir) : undefined;

  const requirementsFile = await writeChatSdkRequirementsFile({
    projectDir,
    requirements: snapshot.requirements,
    wiringInstructions,
  });

  const tunnelAccepted = await promptChatSdkTunnelIfReady({
    input,
    projectDir,
    coreReady: snapshot.coreReady,
    reconcilePlan: {
      projectDir,
      requirements: snapshot.requirements,
      envPaths,
      wiringInstructions,
      requirementsFile,
    },
  });

  return {
    projectKind,
    projectDir,
    scaffolded: false,
    envPaths: envPaths.length > 0 ? envPaths : undefined,
    requirements: snapshot.requirements,
    requirementsFile,
    coreReady: snapshot.coreReady,
    tunnelAccepted,
    wiringInstructions,
  };
}

function refreshRequirements(
  input: ChatSdkSetupInput,
  projectDir: string,
  previous: ChatSdkRequirement[],
  fixedId: ChatSdkRequirement['id']
): ReturnType<typeof computeChatSdkRequirements> {
  const next = computeChatSdkRequirements({
    projectDir,
    secretKey: requireSecretKey(input.auth),
    agentIdentifier: input.agent.identifier,
  });

  next.requirements = next.requirements.map((req) => {
    if (req.id === fixedId && req.status === 'ok') {
      return { ...req, fixed: true };
    }

    const prev = previous.find((entry) => entry.id === req.id);
    if (prev?.fixed) {
      return { ...req, fixed: true };
    }

    return req;
  });

  next.coreReady = recomputeCoreReady(next.requirements);

  return next;
}

async function applyEnvRequirement(
  input: ChatSdkSetupInput,
  projectDir: string,
  secretKey: string
): Promise<{ envPaths: string[] }> {
  const existingSecret = readEnvSecretKey(projectDir);
  let overwriteSecretKey = false;

  if (existingSecret && existingSecret !== secretKey) {
    overwriteSecretKey = await resolveEnvSecretOverwrite({
      input,
      projectDir,
      existingSecret,
      secretKey,
    });
  }

  const merge = mergeProjectEnv({
    projectDir,
    secretKey,
    agentIdentifier: input.agent.identifier,
    apiBaseUrl: input.options.apiUrl,
    overwriteSecretKey,
  });

  return { envPaths: merge.envPaths };
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
        'Remove it or align the key before re-running connect in --ci mode.'
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

  const snapshot = computeChatSdkRequirements({
    projectDir: scaffolded.root,
    secretKey: requireSecretKey(opts.setup.auth),
    agentIdentifier: opts.setup.agent.identifier,
  });

  const requirementsFile = await writeChatSdkRequirementsFile({
    projectDir: scaffolded.root,
    requirements: snapshot.requirements,
  });

  let tunnelAccepted = false;
  if (snapshot.coreReady && !opts.setup.options.ci && !scaffolded.skippedInstall) {
    tunnelAccepted = await promptChatSdkTunnelIfReady({
      input: opts.setup,
      projectDir: scaffolded.root,
      coreReady: snapshot.coreReady,
      reconcilePlan: {
        projectDir: scaffolded.root,
        requirements: snapshot.requirements,
        envPaths: merge.envPaths,
        requirementsFile,
      },
    });
  } else {
    await opts.setup.ui.showChatSdkReconcilePlan({
      projectDir: scaffolded.root,
      requirements: snapshot.requirements,
      envPaths: merge.envPaths,
      wiringInstructions: undefined,
      requirementsFile,
    });
  }

  return {
    projectKind: opts.projectKind,
    projectDir: scaffolded.root,
    scaffolded: true,
    envPaths: merge.envPaths,
    skippedInstall: scaffolded.skippedInstall,
    requirements: snapshot.requirements,
    requirementsFile,
    coreReady: snapshot.coreReady,
    tunnelAccepted,
  };
}

type ChatSdkReconcilePlanInput = Parameters<ConnectUI['showChatSdkReconcilePlan']>[0];

async function promptChatSdkTunnelIfReady(opts: {
  input: ChatSdkSetupInput;
  projectDir: string;
  coreReady: boolean;
  reconcilePlan: ChatSdkReconcilePlanInput;
}): Promise<boolean> {
  if (!opts.coreReady || opts.input.options.ci) {
    await opts.input.ui.showChatSdkReconcilePlan(opts.reconcilePlan);

    return false;
  }

  const devCommand = buildDevNovuScript(opts.projectDir);

  while (true) {
    await opts.input.ui.showChatSdkReconcilePlan(opts.reconcilePlan);

    const choice = await opts.input.ui.offerChatSdkTunnel({
      projectDir: opts.projectDir,
      devCommand,
    });

    if (choice === 'back') {
      continue;
    }

    return choice === 'accept';
  }
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
  ci?: boolean;
}): Promise<boolean> {
  const { outcome } = input;
  if (!shouldRunChatSdkTunnel(outcome, input.ci)) {
    return false;
  }

  await runChatSdkBridge({
    projectDir: outcome.projectDir,
  });

  return true;
}

function shouldRunChatSdkTunnel(
  outcome: ChatSdkConnectOutcome | undefined,
  ci?: boolean
): outcome is ChatSdkConnectOutcome {
  if (!outcome) {
    return false;
  }

  if (ci) {
    return false;
  }

  if (outcome.skippedInstall) {
    return false;
  }

  if (!outcome.coreReady) {
    return false;
  }

  return outcome.tunnelAccepted === true;
}

function requireSecretKey(auth: ResolvedConnectAuth): string {
  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    throw new Error('Chat SDK connect requires an authenticated Novu session with a secret key.');
  }

  return secretKey;
}

function pathBasename(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, '').split(/[/\\]/);

  return parts[parts.length - 1] || 'my-chat-sdk-agent';
}

function toSummary(agent: { _id: string; identifier: string; name: string } | AgentSummary): AgentSummary {
  const id = '_id' in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}
