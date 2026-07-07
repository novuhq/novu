import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type {
  AgentSummary,
  AiSdkConnectOutcome,
  BridgeRequirement,
  BridgeRequirementId,
  ConnectCommandOptions,
} from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { defaultCustomCodeScaffoldDirName, resolveAgentHandlerPathIfExists } from '../bridge/agent-paths';
import { confirmEmptyDirScaffold } from '../bridge/confirm-empty-dir-scaffold';
import { requireConnectSecretKey } from '../bridge/require-secret-key';
import { runScaffoldWithConsole } from '../bridge/run-scaffold-with-console';
import { detectAiSdkWiring } from './detect-wiring';
import { applyDevNovuScript, buildDevNovuScript } from './dev-script';
import { buildAiSdkInstallCommand, resolveAiSdkPackagesToInstall, runAiSdkPackageInstall } from './package-install';
import {
  type AiSdkRequirementsSnapshot,
  AUTOFIX_REQUIREMENT_ORDER,
  computeAiSdkRequirements,
  recomputeCoreReady,
  writeAiSdkRequirementsFile,
} from './requirements';
import { runAiSdkBridge } from './run-bridge';
import { scaffoldAiSdkProject } from './scaffold';
import { maskSecretKey, mergeProjectEnv, readEnvSecretKey, resolveProjectEnvPaths } from './wire-env';
import { buildAiSdkWiringInstructions } from './wiring-instructions';

export type AiSdkSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

type ReconcileOptions = {
  scaffolded?: boolean;
  skippedInstall?: boolean;
  agentFilePath?: string;
};

export async function runAiSdkProjectSetup(input: AiSdkSetupInput): Promise<AiSdkConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const decision = await confirmEmptyDirScaffold({
    projectDir,
    options: input.options,
    ui: input.ui,
    variant: 'ai-sdk',
    defaultAppName: defaultCustomCodeScaffoldDirName,
    agentIdentifier: input.agent.identifier,
  });

  if (decision.action === 'existing-project') {
    return reconcileAiSdkProject(input, decision.projectDir, 'project', {
      agentFilePath: resolveAgentHandlerPathIfExists(decision.projectDir, input.agent.identifier),
    });
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
  input: AiSdkSetupInput,
  parentDir: string,
  appName: string
): Promise<AiSdkConnectOutcome> {
  const scaffolded = await runScaffoldWithConsole({
    ui: input.ui,
    variant: 'ai-sdk',
    scaffold: () =>
      scaffoldAiSdkProject({
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
    variant: 'ai-sdk',
    projectDir: scaffolded.root,
    agentFilePath: scaffolded.agentFilePath,
    envPaths,
    skippedInstall: scaffolded.skippedInstall,
  });

  return {
    projectKind: 'empty',
    projectDir: scaffolded.root,
    scaffolded: true,
    envPaths,
    skippedInstall: scaffolded.skippedInstall,
    agentFilePath: scaffolded.agentFilePath,
    coreReady: true,
  };
}

async function reconcileAiSdkProject(
  input: AiSdkSetupInput,
  projectDir: string,
  projectKind: AiSdkConnectOutcome['projectKind'],
  reconcileOptions: ReconcileOptions = {}
): Promise<AiSdkConnectOutcome> {
  const secretKey = requireConnectSecretKey(input.auth);
  const envPaths: string[] = [];
  let snapshot = computeAiSdkRequirements({
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
    wiringReq && wiringReq.status !== 'ok'
      ? buildAiSdkWiringInstructions(projectDir, input.agent.identifier)
      : undefined;

  const requirementsFile = await writeAiSdkRequirementsFile({
    projectDir,
    requirements: snapshot.requirements,
    wiringInstructions,
  });

  const tunnelAccepted = await promptAiSdkTunnelIfReady({
    input,
    projectDir,
    coreReady: snapshot.coreReady,
    reconcilePlan: {
      projectDir,
      requirements: snapshot.requirements,
      envPaths,
      wiringInstructions,
      requirementsFile,
      variant: 'ai-sdk',
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
    agentFilePath:
      reconcileOptions.agentFilePath ?? resolveAgentHandlerPathIfExists(projectDir, input.agent.identifier),
  };
}

type ApplyAutofixInput = {
  input: AiSdkSetupInput;
  projectDir: string;
  secretKey: string;
  requirementId: BridgeRequirementId;
  snapshot: AiSdkRequirementsSnapshot;
  envPaths: string[];
};

async function applyAutofixRequirement(opts: ApplyAutofixInput): Promise<AiSdkRequirementsSnapshot> {
  const requirement = opts.snapshot.requirements.find((req) => req.id === opts.requirementId);
  if (!requirement || requirement.status === 'ok') {
    return opts.snapshot;
  }

  switch (opts.requirementId) {
    case 'env': {
      const merge = await applyEnvRequirement(opts.input, opts.projectDir, opts.secretKey);
      opts.envPaths.push(...merge.envPaths);

      return computeAiSdkRequirements({
        projectDir: opts.projectDir,
        secretKey: opts.secretKey,
        agentIdentifier: opts.input.agent.identifier,
      });
    }

    case 'dev-script': {
      applyDevNovuScript(opts.projectDir);

      return computeAiSdkRequirements({
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

async function applyPackageRequirement(opts: ApplyAutofixInput): Promise<AiSdkRequirementsSnapshot> {
  const packagesToInstall = resolveAiSdkPackagesToInstall(opts.projectDir);
  const installCommand = buildAiSdkInstallCommand(opts.projectDir);

  if (opts.input.options.ci) {
    return {
      ...opts.snapshot,
      requirements: opts.snapshot.requirements.map((req) =>
        req.id === 'package' ? { ...req, status: 'manual', detail: `Run: ${installCommand}` } : req
      ),
    };
  }

  const shouldInstall = await opts.input.ui.confirmInstallBridgeDeps({
    projectDir: opts.projectDir,
    installCommand,
    packages: packagesToInstall,
    variant: 'ai-sdk',
  });

  if (shouldInstall) {
    opts.input.ui.installingBridgeDeps('ai-sdk');

    await runAiSdkPackageInstall({
      projectDir: opts.projectDir,
      silent: opts.input.ui.interactive,
    });

    return computeAiSdkRequirements({
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
  input: AiSdkSetupInput,
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
    apiBaseUrl: input.options.apiUrl,
    overwriteSecretKey,
  });

  return { envPaths: merge.envPaths };
}

async function resolveEnvSecretOverwrite(opts: {
  input: AiSdkSetupInput;
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

type AiSdkReconcilePlanInput = Parameters<ConnectUI['showBridgeReconcilePlan']>[0];

async function promptAiSdkTunnelIfReady(opts: {
  input: AiSdkSetupInput;
  projectDir: string;
  coreReady: boolean;
  reconcilePlan: AiSdkReconcilePlanInput;
}): Promise<boolean> {
  await opts.input.ui.showBridgeReconcilePlan(opts.reconcilePlan);

  if (!opts.coreReady || opts.input.options.ci) {
    return false;
  }

  if (!isAiSdkWiringReadyForTunnel(opts.reconcilePlan.requirements, opts.reconcilePlan.projectDir)) {
    return false;
  }

  const devCommand = buildDevNovuScript(opts.projectDir);
  const choice = await opts.input.ui.offerBridgeTunnel({
    projectDir: opts.projectDir,
    devCommand,
  });

  return choice === 'accept';
}

export async function maybeRunAiSdkTunnel(input: {
  outcome: AiSdkConnectOutcome | undefined;
  ci?: boolean;
}): Promise<boolean> {
  const { outcome } = input;
  if (!shouldRunAiSdkTunnel(outcome, input.ci)) {
    return false;
  }

  await runAiSdkBridge({
    projectDir: outcome.projectDir,
  });

  return true;
}

function shouldRunAiSdkTunnel(outcome: AiSdkConnectOutcome | undefined, ci?: boolean): outcome is AiSdkConnectOutcome {
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

  if (!isAiSdkWiringReadyForTunnel(outcome.requirements, outcome.projectDir, outcome.scaffolded)) {
    return false;
  }

  return outcome.tunnelAccepted === true;
}

function isAiSdkWiringReadyForTunnel(
  requirements: BridgeRequirement[] | undefined,
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

  return detectAiSdkWiring(projectDir).isWired;
}

export async function shutdownConnectUiAndMaybeRunAiSdkTunnel(input: {
  ui: ConnectUI;
  outcome: AiSdkConnectOutcome | undefined;
  ci?: boolean;
}): Promise<number> {
  const exitCode = await input.ui.shutdown();

  if (await maybeRunAiSdkTunnel({ outcome: input.outcome, ci: input.ci })) {
    return 0;
  }

  return exitCode;
}
