import chalk from 'chalk';
import { createBridgeAgent, listAgents } from '../../api/agents';
import type { ConnectApiClient } from '../../api/client';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  AgentSummary,
  ChatSdkConnectOutcome,
  ChatSdkRequirement,
  ChatSdkRequirementId,
  ConnectCommandOptions,
} from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { confirmEmptyDirScaffold } from '../bridge/confirm-empty-dir-scaffold';
import { defaultChatSdkScaffoldDirName } from '../bridge/detect-project';
import { requireConnectSecretKey } from '../bridge/require-secret-key';
import { runScaffoldWithConsole } from '../bridge/run-scaffold-with-console';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from './derive-identifier';
import { detectChatSdkWiring } from './detect-wiring';
import { applyDevNovuScript, buildDevNovuScript } from './dev-script';
import {
  buildChatSdkInstallCommand,
  resolveChatSdkPackagesToInstall,
  runChatSdkPackageInstall,
} from './package-install';
import {
  AUTOFIX_REQUIREMENT_ORDER,
  type ChatSdkRequirementsSnapshot,
  computeChatSdkRequirements,
  recomputeCoreReady,
  writeChatSdkRequirementsFile,
} from './requirements';
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

type ReconcileOptions = {
  scaffolded?: boolean;
  skippedInstall?: boolean;
};

export async function runChatSdkProjectSetup(input: ChatSdkSetupInput): Promise<ChatSdkConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const decision = await confirmEmptyDirScaffold({
    projectDir,
    options: input.options,
    ui: input.ui,
    variant: 'chat-sdk',
    defaultAppName: defaultChatSdkScaffoldDirName,
    agentIdentifier: input.agent.identifier,
  });

  if (decision.action === 'existing-project') {
    return reconcileChatSdkProject(input, decision.projectDir, 'project');
  }

  if (decision.action === 'skipped') {
    return {
      projectKind: 'empty',
      projectDir: decision.projectDir,
      scaffolded: false,
      coreReady: false,
    };
  }

  return scaffoldThenReconcile(input, decision.projectDir, decision.appName);
}

async function scaffoldThenReconcile(
  input: ChatSdkSetupInput,
  parentDir: string,
  appName: string
): Promise<ChatSdkConnectOutcome> {
  const scaffolded = await runScaffoldWithConsole({
    ui: input.ui,
    variant: 'chat-sdk',
    scaffold: () =>
      scaffoldChatSdkProject({
        parentDir,
        appName,
        secretKey: requireConnectSecretKey(input.auth),
        apiUrl: input.options.apiUrl,
        agentIdentifier: input.agent.identifier,
        silent: false,
      }),
  });

  const envPaths = resolveProjectEnvPaths(scaffolded.root);

  input.ui.bridgeScaffolded({
    variant: 'chat-sdk',
    projectDir: scaffolded.root,
    envPaths,
    skippedInstall: scaffolded.skippedInstall,
  });

  return reconcileChatSdkProject(input, scaffolded.root, 'empty', {
    scaffolded: true,
    skippedInstall: scaffolded.skippedInstall,
  });
}

async function reconcileChatSdkProject(
  input: ChatSdkSetupInput,
  projectDir: string,
  projectKind: ChatSdkConnectOutcome['projectKind'],
  reconcileOptions: ReconcileOptions = {}
): Promise<ChatSdkConnectOutcome> {
  const secretKey = requireConnectSecretKey(input.auth);
  const envPaths: string[] = [];
  let snapshot = computeChatSdkRequirements({
    projectDir,
    secretKey,
    agentIdentifier: input.agent.identifier,
  });

  for (const requirementId of AUTOFIX_REQUIREMENT_ORDER) {
    snapshot = await applyAutofixRequirement({
      input,
      projectDir,
      secretKey,
      requirementId,
      snapshot,
      envPaths,
    });
  }

  snapshot = {
    ...snapshot,
    coreReady: recomputeCoreReady(snapshot.requirements),
  };

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
    scaffolded: reconcileOptions.scaffolded ?? false,
    envPaths: envPaths.length > 0 ? envPaths : undefined,
    skippedInstall: reconcileOptions.skippedInstall,
    requirements: snapshot.requirements,
    requirementsFile,
    coreReady: snapshot.coreReady,
    tunnelAccepted,
    wiringInstructions,
  };
}

type ApplyAutofixInput = {
  input: ChatSdkSetupInput;
  projectDir: string;
  secretKey: string;
  requirementId: ChatSdkRequirementId;
  snapshot: ChatSdkRequirementsSnapshot;
  envPaths: string[];
};

async function applyAutofixRequirement(opts: ApplyAutofixInput): Promise<ChatSdkRequirementsSnapshot> {
  const requirement = opts.snapshot.requirements.find((req) => req.id === opts.requirementId);
  if (!requirement || requirement.status === 'ok') {
    return opts.snapshot;
  }

  switch (opts.requirementId) {
    case 'env': {
      const merge = await applyEnvRequirement(opts.input, opts.projectDir, opts.secretKey);
      opts.envPaths.push(...merge.envPaths);

      return computeChatSdkRequirements({
        projectDir: opts.projectDir,
        secretKey: opts.secretKey,
        agentIdentifier: opts.input.agent.identifier,
      });
    }

    case 'dev-script': {
      applyDevNovuScript(opts.projectDir);

      return computeChatSdkRequirements({
        projectDir: opts.projectDir,
        secretKey: opts.secretKey,
        agentIdentifier: opts.input.agent.identifier,
      });
    }

    case 'package': {
      return applyPackageRequirement(opts);
    }
  }
}

async function applyPackageRequirement(opts: ApplyAutofixInput): Promise<ChatSdkRequirementsSnapshot> {
  const packagesToInstall = resolveChatSdkPackagesToInstall(opts.projectDir);
  const installCommand = buildChatSdkInstallCommand(opts.projectDir);

  if (opts.input.options.ci) {
    return {
      ...opts.snapshot,
      requirements: opts.snapshot.requirements.map((req) =>
        req.id === 'package' ? { ...req, status: 'manual', detail: `Run: ${installCommand}` } : req
      ),
    };
  }

  const shouldInstall = await opts.input.ui.confirmInstallChatSdkDeps({
    projectDir: opts.projectDir,
    installCommand,
    packages: packagesToInstall,
  });

  if (shouldInstall) {
    if (opts.input.ui.interactive) {
      await opts.input.ui.releaseTerminal();
      console.log(`${chalk.cyan('Installing Chat SDK packages…')}\n`);
    } else {
      opts.input.ui.installingChatSdkDeps();
    }

    await runChatSdkPackageInstall({
      projectDir: opts.projectDir,
      silent: false,
    });

    return computeChatSdkRequirements({
      projectDir: opts.projectDir,
      secretKey: opts.secretKey,
      agentIdentifier: opts.input.agent.identifier,
    });
  }

  return {
    ...opts.snapshot,
    requirements: opts.snapshot.requirements.map((req) =>
      req.id === 'package'
        ? {
            ...req,
            status: 'manual',
            detail: `Skipped — run: ${installCommand}`,
          }
        : req
    ),
  };
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

type ChatSdkReconcilePlanInput = Parameters<ConnectUI['showChatSdkReconcilePlan']>[0];

async function promptChatSdkTunnelIfReady(opts: {
  input: ChatSdkSetupInput;
  projectDir: string;
  coreReady: boolean;
  reconcilePlan: ChatSdkReconcilePlanInput;
}): Promise<boolean> {
  await opts.input.ui.showChatSdkReconcilePlan(opts.reconcilePlan);

  if (!opts.coreReady || opts.input.options.ci) {
    return false;
  }

  if (!isChatSdkWiringReadyForTunnel(opts.reconcilePlan.requirements, opts.reconcilePlan.projectDir)) {
    return false;
  }

  const devCommand = buildDevNovuScript(opts.projectDir);
  const choice = await opts.input.ui.offerChatSdkTunnel({
    projectDir: opts.projectDir,
    devCommand,
  });

  return choice === 'accept';
}

export async function createBridgeAgentFlow(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions
): Promise<{ agent: AgentSummary; flow: 'created' | 'reused' }> {
  const existingAgents = await listAgents(client);
  const bridgeAgents = existingAgents.filter((agent) => agent.runtime !== 'managed');

  if (bridgeAgents.length > 0) {
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

  if (!isChatSdkWiringReadyForTunnel(outcome.requirements, outcome.projectDir, outcome.scaffolded)) {
    return false;
  }

  return outcome.tunnelAccepted === true;
}

function isChatSdkWiringReadyForTunnel(
  requirements: ChatSdkRequirement[] | undefined,
  projectDir: string,
  scaffolded = false
): boolean {
  if (scaffolded) {
    return true;
  }

  const wiring = requirements?.find((req) => req.id === 'code-wiring');
  if (wiring) {
    return wiring.status === 'ok';
  }

  return detectChatSdkWiring(projectDir).isWired;
}

export async function shutdownConnectUiAndMaybeRunChatSdkTunnel(input: {
  ui: ConnectUI;
  outcome: ChatSdkConnectOutcome | undefined;
  ci?: boolean;
}): Promise<number> {
  const exitCode = await input.ui.shutdown();

  if (await maybeRunChatSdkTunnel({ outcome: input.outcome, ci: input.ci })) {
    return 0;
  }

  return exitCode;
}

function pathBasename(dir: string): string {
  const parts = dir.replace(/[/\\]+$/, '').split(/[/\\]/);

  return parts[parts.length - 1] || 'my-chat-sdk-agent';
}

function toSummary(agent: { _id: string; identifier: string; name: string } | AgentSummary): AgentSummary {
  const id = '_id' in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}
