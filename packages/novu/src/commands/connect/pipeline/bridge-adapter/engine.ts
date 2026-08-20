import type { BridgeRequirement, BridgeRequirementId } from '../../types';
import { applyDevNovuScript, buildDevNovuScript } from '../ai-sdk/dev-script';
import { maskSecretKey, mergeProjectEnv, readEnvSecretKey, resolveProjectEnvPaths } from '../ai-sdk/wire-env';
import { defaultCustomCodeScaffoldDirName, resolveAgentHandlerPathIfExists } from '../bridge/agent-paths';
import { resolveEmptyDirScaffoldTarget } from '../bridge/confirm-empty-dir-scaffold';
import { requireConnectSecretKey } from '../bridge/require-secret-key';
import { runScaffoldWithConsole } from '../bridge/run-scaffold-with-console';
import { describeLlmAuthChoice } from '../llm-auth/llm-auth-options';
import { resolveLlmAuthChoice } from '../llm-auth/resolve-llm-auth';
import type { LlmAuthChoice } from '../llm-auth/types';
import type {
  BridgeAdapter,
  BridgeAdapterConnectOutcome,
  BridgeAdapterRequirementsSnapshot,
  BridgeAdapterSetupInput,
} from './types';

type ReconcileOptions = {
  scaffolded?: boolean;
  skippedInstall?: boolean;
  agentFilePath?: string;
};

function deferInkInput(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function runBridgeAdapterProjectSetup(
  input: BridgeAdapterSetupInput,
  adapter: BridgeAdapter
): Promise<BridgeAdapterConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const target = resolveEmptyDirScaffoldTarget({
    projectDir,
    options: input.options,
    ui: input.ui,
    variant: adapter.variant,
    defaultAppName: defaultCustomCodeScaffoldDirName,
    agentIdentifier: input.agent.identifier,
  });

  if (target.status === 'existing-project') {
    return reconcileProject(input, adapter, target.projectDir, 'project', {
      agentFilePath: resolveAgentHandlerPathIfExists(target.projectDir, input.agent.identifier),
    });
  }

  if (target.status === 'skipped') {
    return {
      projectKind: 'empty',
      projectDir: target.projectDir,
      scaffolded: false,
      coreReady: false,
    };
  }

  // Empty-dir scaffold: pick LLM provider, confirm, then install template (see pipeline/llm-auth/README.md).
  const llmAuth = await resolveLlmAuthChoice({
    connectMode: adapter.variant,
    options: input.options,
    ui: input.ui,
  });

  await deferInkInput();

  const confirmed = await input.ui.confirmScaffold({
    projectDir: target.projectDir,
    appName: target.appName,
    variant: adapter.variant,
    llmAuthLabel: describeLlmAuthChoice(llmAuth),
  });

  if (!confirmed) {
    return {
      projectKind: 'empty',
      projectDir: target.projectDir,
      scaffolded: false,
      coreReady: false,
    };
  }

  return scaffoldThenReconcile(input, adapter, target.projectDir, target.appName, llmAuth);
}

async function scaffoldThenReconcile(
  input: BridgeAdapterSetupInput,
  adapter: BridgeAdapter,
  parentDir: string,
  appName: string,
  llmAuth: LlmAuthChoice
): Promise<BridgeAdapterConnectOutcome> {
  const scaffolded = await runScaffoldWithConsole({
    ui: input.ui,
    variant: adapter.variant,
    scaffold: () =>
      adapter.scaffold({
        parentDir,
        appName,
        secretKey: requireConnectSecretKey(input.auth),
        apiUrl: input.options.apiUrl,
        agentIdentifier: input.agent.identifier,
        silent: false,
        llmAuth,
      }),
  });

  const envPaths = resolveProjectEnvPaths(scaffolded.root);

  if (!input.deferScaffoldSummary) {
    input.ui.bridgeScaffolded({
      variant: adapter.variant,
      projectDir: scaffolded.root,
      agentFilePath: scaffolded.agentFilePath,
      envPaths,
      skippedInstall: scaffolded.skippedInstall,
    });
  }

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

async function reconcileProject(
  input: BridgeAdapterSetupInput,
  adapter: BridgeAdapter,
  projectDir: string,
  projectKind: BridgeAdapterConnectOutcome['projectKind'],
  reconcileOptions: ReconcileOptions = {}
): Promise<BridgeAdapterConnectOutcome> {
  const secretKey = requireConnectSecretKey(input.auth);
  const envPaths: string[] = [];
  let snapshot = adapter.computeRequirements({
    projectDir,
    secretKey,
    agentIdentifier: input.agent.identifier,
  });

  for (const requirementId of adapter.autofixOrder) {
    snapshot = await applyAutofixRequirement({
      input,
      adapter,
      projectDir,
      secretKey,
      requirementId,
      snapshot,
      envPaths,
    });
  }

  snapshot = {
    ...snapshot,
    coreReady: adapter.recomputeCoreReady(snapshot.requirements),
  };

  const wiringReq = snapshot.requirements.find((req) => req.id === 'code-wiring');
  const wiringInstructions =
    wiringReq && wiringReq.status !== 'ok'
      ? adapter.buildWiringInstructions(projectDir, input.agent.identifier)
      : undefined;

  const agentPrompt = wiringInstructions && !input.deferAgentPrompt ? adapter.agentPrompt : undefined;

  const requirementsFile = await adapter.writeRequirementsFile({
    projectDir,
    requirements: snapshot.requirements,
    wiringInstructions,
    agentPrompt,
  });

  const tunnelAccepted = await promptTunnelIfReady({
    input,
    adapter,
    projectDir,
    coreReady: snapshot.coreReady,
    reconcilePlan: {
      projectDir,
      requirements: snapshot.requirements,
      envPaths,
      wiringInstructions,
      requirementsFile,
      agentPrompt,
      variant: adapter.variant,
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
  input: BridgeAdapterSetupInput;
  adapter: BridgeAdapter;
  projectDir: string;
  secretKey: string;
  requirementId: BridgeRequirementId;
  snapshot: BridgeAdapterRequirementsSnapshot;
  envPaths: string[];
};

async function applyAutofixRequirement(opts: ApplyAutofixInput): Promise<BridgeAdapterRequirementsSnapshot> {
  const requirement = opts.snapshot.requirements.find((req) => req.id === opts.requirementId);
  if (!requirement || requirement.status === 'ok') {
    return opts.snapshot;
  }

  const recompute = () =>
    opts.adapter.computeRequirements({
      projectDir: opts.projectDir,
      secretKey: opts.secretKey,
      agentIdentifier: opts.input.agent.identifier,
    });

  switch (opts.requirementId) {
    case 'env': {
      const merge = await applyEnvRequirement(opts.input, opts.projectDir, opts.secretKey);
      opts.envPaths.push(...merge.envPaths);

      return recompute();
    }

    case 'dev-script': {
      applyDevNovuScript(opts.projectDir);

      return recompute();
    }

    case 'package': {
      return applyPackageRequirement(opts, recompute);
    }

    default:
      return opts.snapshot;
  }
}

async function applyPackageRequirement(
  opts: ApplyAutofixInput,
  recompute: () => BridgeAdapterRequirementsSnapshot
): Promise<BridgeAdapterRequirementsSnapshot> {
  const packagesToInstall = opts.adapter.resolvePackagesToInstall(opts.projectDir);
  const installCommand = opts.adapter.buildInstallCommand(opts.projectDir);

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
    variant: opts.adapter.variant,
  });

  if (shouldInstall) {
    opts.input.ui.installingBridgeDeps(opts.adapter.variant);

    await opts.adapter.runPackageInstall({
      projectDir: opts.projectDir,
      silent: opts.input.ui.interactive,
    });

    return recompute();
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
  input: BridgeAdapterSetupInput,
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
  input: BridgeAdapterSetupInput;
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

type ReconcilePlanInput = Parameters<BridgeAdapterSetupInput['ui']['showBridgeReconcilePlan']>[0];

async function promptTunnelIfReady(opts: {
  input: BridgeAdapterSetupInput;
  adapter: BridgeAdapter;
  projectDir: string;
  coreReady: boolean;
  reconcilePlan: ReconcilePlanInput;
}): Promise<boolean> {
  if (!opts.input.deferAgentPrompt) {
    await opts.input.ui.showBridgeReconcilePlan(opts.reconcilePlan);
  }

  if (!opts.coreReady || opts.input.options.ci) {
    return false;
  }

  if (opts.input.deferAgentPrompt) {
    return false;
  }

  if (!isWiringReadyForTunnel(opts.adapter, opts.reconcilePlan.requirements, opts.reconcilePlan.projectDir)) {
    return false;
  }

  const devCommand = buildDevNovuScript(opts.projectDir);
  const choice = await opts.input.ui.offerBridgeTunnel({
    projectDir: opts.projectDir,
    devCommand,
  });

  return choice === 'accept';
}

export async function maybeRunBridgeAdapterTunnel(input: {
  outcome: BridgeAdapterConnectOutcome | undefined;
  adapter: BridgeAdapter;
  ci?: boolean;
}): Promise<boolean> {
  const { outcome, adapter } = input;
  if (!shouldRunTunnel(adapter, outcome, input.ci)) {
    return false;
  }

  await adapter.runBridge({
    projectDir: outcome.projectDir,
  });

  return true;
}

function shouldRunTunnel(
  adapter: BridgeAdapter,
  outcome: BridgeAdapterConnectOutcome | undefined,
  ci?: boolean
): outcome is BridgeAdapterConnectOutcome {
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

  if (!isWiringReadyForTunnel(adapter, outcome.requirements, outcome.projectDir, outcome.scaffolded)) {
    return false;
  }

  return outcome.tunnelAccepted === true;
}

function isWiringReadyForTunnel(
  adapter: BridgeAdapter,
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

  return adapter.detectIsWired(projectDir);
}
