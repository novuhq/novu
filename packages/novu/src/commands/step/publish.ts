import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { dim, green, red, yellow } from 'picocolors';
import prompts from 'prompts';
import { StepResolverClient } from './api';
import { bundleRelease, formatBundleSize } from './bundler';
import { extractStepSchemas } from './bundler/schema-extractor';
import { loadConfig } from './config/loader';
import { discoverEmailTemplates, discoverStepFiles } from './discovery';
import { generateReactEmailStepFile, generateStepFileForType } from './templates/step-file';
import type {
  DeploymentResult,
  DiscoveredStep,
  EnvironmentInfo,
  StepResolverManifestStep,
  StepResolverReleaseBundle,
} from './types';
import {
  detectPackageManager,
  getInstallCommand,
  hasZodV3,
  installPackageSync,
  isPackageInstalled,
  renderTable,
  StepFilePathResolver,
  withSpinner,
} from './utils';

interface PublishOptions {
  secretKey?: string;
  apiUrl?: string;
  config?: string;
  out?: string;
  workflow?: string[] | string;
  step?: string[] | string;
  template?: string;
  bundleOutDir?: string | boolean;
  dryRun?: boolean;
}

const DEFAULT_API_URL = 'https://api.novu.co';
const DEFAULT_STEPS_DIR = './novu';
const RELEASE_ARTIFACT_BASENAME = 'step-resolver-release';

type ScaffoldResult = { mode: 'react-email'; templatePath: string } | { mode: 'placeholder'; stepType: string };

const KNOWN_STEP_TYPES = new Set(['email', 'sms', 'push', 'chat', 'in_app', 'delay', 'digest', 'throttle']);

export async function stepPublish(options: PublishOptions): Promise<void> {
  try {
    const startTime = Date.now();
    const rootDir = process.cwd();
    const config = await loadConfig(options.config);
    const apiUrl = options.apiUrl || process.env.NOVU_API_URL || config?.apiUrl || DEFAULT_API_URL;
    const secretKey = options.secretKey || process.env.NOVU_SECRET_KEY;
    assertSecretKey(secretKey);

    const stepsDirLabel = options.out || config?.outDir || DEFAULT_STEPS_DIR;
    const stepsDir = path.resolve(rootDir, stepsDirLabel);
    console.log('');
    const client = new StepResolverClient(apiUrl, secretKey);
    const envInfo = await authenticate(client, apiUrl);

    assertNotProductionEnvironment(envInfo);
    assertStepRequiresWorkflow(options.step, options.workflow);
    assertTemplateRequiresWorkflowAndStep(options.template, options.workflow, options.step);

    const effectiveOutDir = options.out || config?.outDir;

    let scaffoldResult: ScaffoldResult | undefined;
    if (options.template) {
      const workflowIds = normalizeRequestedWorkflows(options.workflow);
      const stepIds = normalizeRequestedWorkflows(options.step);
      const remoteStepType =
        workflowIds[0] && stepIds[0] ? await client.getStepType(workflowIds[0], stepIds[0]) : undefined;

      if (remoteStepType && remoteStepType !== 'email') {
        console.error('');
        console.error(
          red(
            `❌ The --template flag is only supported for email steps, but step '${stepIds[0]}' is of type '${remoteStepType}'.`
          )
        );
        console.error('');
        process.exit(1);
      }

      scaffoldResult = { mode: 'react-email', templatePath: options.template };
    } else {
      scaffoldResult = await resolveScaffoldInteractively(client, options, rootDir, effectiveOutDir);
    }

    let isFirstTimeScaffold = false;
    if (scaffoldResult) {
      const workflowIds = normalizeRequestedWorkflows(options.workflow);
      const stepIds = normalizeRequestedWorkflows(options.step);
      isFirstTimeScaffold = await scaffoldStepFileIfNeeded(
        scaffoldResult,
        workflowIds[0],
        stepIds[0],
        rootDir,
        effectiveOutDir,
        hasZodV3(rootDir)
      );
    }

    const discoveredSteps = await discoverAndValidateSteps(stepsDir, stepsDirLabel);
    const workflowFilteredSteps = selectStepsByWorkflow(discoveredSteps, options.workflow);
    const selectedSteps = selectStepsByStepId(workflowFilteredSteps, options.step);

    const shouldMinifyBundles = !options.bundleOutDir;
    if (!shouldMinifyBundles) {
      console.log(yellow('ℹ Debug bundle mode enabled: generating unminified release bundle.'));
      console.log('');
    }

    const { bundle: releaseBundle, stepsWithSchemas } = await buildReleaseBundle(
      selectedSteps,
      rootDir,
      shouldMinifyBundles,
      config?.aliases
    );
    const manifestSteps = stepsWithSchemas.map((s) => ({
      workflowId: s.workflowId,
      stepId: s.stepId,
      stepType: s.type,
      ...(s.controlSchema && { controlSchema: s.controlSchema }),
    }));

    const bundleOutputDir = resolveBundleOutputDir(options.bundleOutDir, rootDir);
    if (bundleOutputDir) {
      await writeBundleArtifactsWithSpinner(releaseBundle, manifestSteps, bundleOutputDir, rootDir);
    }

    if (options.dryRun) {
      printDryRunSummary(releaseBundle, selectedSteps, startTime, rootDir);
      return;
    }

    if (process.stdout.isTTY && isFirstTimeScaffold) {
      const confirmed = await confirmDeploy(selectedSteps.length);
      if (!confirmed) {
        console.log('');
        console.log(yellow('ℹ  Publish cancelled.'));
        console.log('');
        return;
      }
    }

    const deployment = await deployRelease(client, releaseBundle, manifestSteps);
    printSuccessSummary(deployment, selectedSteps, startTime, rootDir);
  } catch (error) {
    console.error('');
    console.error(red('❌ Publish failed:'), error instanceof Error ? error.message : error);
    console.error('');
    process.exit(1);
  }
}

async function resolveScaffoldInteractively(
  client: StepResolverClient,
  options: PublishOptions,
  rootDir: string,
  configOutDir?: string
): Promise<ScaffoldResult | undefined> {
  const workflowIds = normalizeRequestedWorkflows(options.workflow);
  const stepIds = normalizeRequestedWorkflows(options.step);

  if (workflowIds.length !== 1 || stepIds.length !== 1) {
    return undefined;
  }

  const outDir = configOutDir || './novu';
  const outDirPath = path.resolve(rootDir, outDir);
  const pathResolver = new StepFilePathResolver(rootDir, outDirPath);

  const existingStepFilePath = pathResolver.findExistingStepFilePath(workflowIds[0], stepIds[0]);
  if (existingStepFilePath) {
    const relPath = path.relative(rootDir, existingStepFilePath);
    console.log(yellow(`ℹ  Step file found: ${relPath}`));
    console.log(`   Edit this file and re-run to update, or delete it to re-scaffold.`);
    console.log('');

    return undefined;
  }

  const stepType = await client.getStepType(workflowIds[0], stepIds[0]);

  if (stepType && KNOWN_STEP_TYPES.has(stepType)) {
    if (stepType === 'email' && process.stdout.isTTY) {
      return promptForEmailTemplate(rootDir);
    }

    return { mode: 'placeholder', stepType };
  }

  if (!process.stdout.isTTY) {
    console.log(yellow('ℹ  No step file found and step type could not be determined.'));
    console.log(`   Run with --workflow and --step once the workflow exists, or create the file manually.`);
    console.log('');

    return undefined;
  }

  return promptForStepType(rootDir);
}

async function promptForStepType(rootDir: string): Promise<ScaffoldResult | undefined> {
  const response = await prompts(
    {
      type: 'select',
      name: 'stepType',
      message: 'What type is this step?',
      choices: [
        { title: 'Email        — HTML email', value: 'email' },
        { title: 'SMS          — text message', value: 'sms' },
        { title: 'Push         — mobile push notification', value: 'push' },
        { title: 'Chat         — chat message (Slack, MS Teams, etc.)', value: 'chat' },
        { title: 'In-App       — in-app notification', value: 'in_app' },
        { title: 'Delay        — pause execution for a duration', value: 'delay' },
        { title: 'Digest       — batch events over a time window', value: 'digest' },
        { title: 'Throttle     — limit send frequency per subscriber', value: 'throttle' },
        { title: "Skip         — I'll create the file myself", value: 'skip' },
      ],
    },
    {
      onCancel: () => {
        console.log('');
        console.log(yellow('ℹ  Scaffolding cancelled.'));
        console.log('');
      },
    }
  );

  if (!response.stepType || response.stepType === 'skip') {
    return undefined;
  }

  if (response.stepType === 'email') {
    return promptForEmailTemplate(rootDir);
  }

  return { mode: 'placeholder', stepType: response.stepType };
}

async function promptForEmailTemplate(rootDir: string): Promise<ScaffoldResult | undefined> {
  const templates = await withSpinner('Scanning for React Email templates...', () => discoverEmailTemplates(rootDir), {
    successMessage: (tmpl) =>
      tmpl.length > 0
        ? `Found ${tmpl.length} React Email template${tmpl.length === 1 ? '' : 's'}`
        : 'No React Email templates found — you can enter a path manually or scaffold a generic step',
    failMessage: 'Template scan failed',
  });

  const MANUAL_ENTRY = '__manual__';
  const GENERIC_EMAIL = '__generic__';

  const templateChoices =
    templates.length > 0 ? templates.map((t) => ({ title: t.relativePath, value: t.relativePath })) : [];
  const hasTemplates = templateChoices.length > 0;

  let selectCancelled = false;
  const selectResponse = await prompts(
    {
      type: 'select',
      name: 'template',
      message: hasTemplates
        ? 'Select a React Email template:'
        : 'No React Email templates detected. How would you like to scaffold this step?',
      choices: [
        ...templateChoices,
        { title: 'Enter path manually  — provide a React Email template path', value: MANUAL_ENTRY },
        { title: 'Generic email step   — scaffold a starter with plain HTML body', value: GENERIC_EMAIL },
      ],
    },
    {
      onCancel: () => {
        selectCancelled = true;
        console.log('');
        console.log(yellow('ℹ  Scaffolding cancelled.'));
        console.log('');
      },
    }
  );

  if (selectCancelled) {
    return undefined;
  }

  if (selectResponse.template === GENERIC_EMAIL) {
    return { mode: 'placeholder', stepType: 'email' };
  }

  if (selectResponse.template === MANUAL_ENTRY) {
    let pathCancelled = false;
    const pathResponse = await prompts(
      {
        type: 'text',
        name: 'templatePath',
        message: 'Path to your React Email template (relative to project root):',
        initial: './emails/welcome.tsx',
      },
      {
        onCancel: () => {
          pathCancelled = true;
          console.log('');
          console.log(yellow('ℹ  Scaffolding cancelled.'));
          console.log('');
        },
      }
    );

    if (pathCancelled || !pathResponse.templatePath) {
      return undefined;
    }

    return { mode: 'react-email', templatePath: pathResponse.templatePath };
  }

  return { mode: 'react-email', templatePath: selectResponse.template };
}

async function confirmDeploy(stepCount: number): Promise<boolean> {
  const stepText = stepCount === 1 ? '1 step' : `${stepCount} steps`;
  console.log('');
  console.log(yellow(`⚠  Publishing will override any existing editor content for ${stepText}.`));
  console.log('');

  const response = await prompts({
    type: 'confirm',
    name: 'confirmed',
    message: 'Continue?',
    initial: true,
  });

  return Boolean(response.confirmed);
}

function assertTemplateRequiresWorkflowAndStep(
  templateOption?: string,
  workflowOption?: string[] | string,
  stepOption?: string[] | string
): void {
  if (!templateOption) return;

  const workflows = normalizeRequestedWorkflows(workflowOption);
  const steps = normalizeRequestedWorkflows(stepOption);

  if (workflows.length !== 1) {
    console.error('');
    console.error(red('❌ --template requires exactly one --workflow'));
    console.error('');
    console.error('Example:');
    console.error('  npx novu step publish --workflow=onboarding --step=welcome-email --template=./emails/welcome.tsx');
    console.error('');
    process.exit(1);
  }

  if (steps.length !== 1) {
    console.error('');
    console.error(red('❌ --template requires exactly one --step'));
    console.error('');
    console.error('Example:');
    console.error('  npx novu step publish --workflow=onboarding --step=welcome-email --template=./emails/welcome.tsx');
    console.error('');
    process.exit(1);
  }
}

const FRAMEWORK_PACKAGE = '@novu/framework';

async function installFrameworkPackageIfNeeded(rootDir: string): Promise<void> {
  if (isPackageInstalled(FRAMEWORK_PACKAGE, rootDir)) {
    return;
  }

  const pm = detectPackageManager(rootDir);
  const installCmd = getInstallCommand(pm, FRAMEWORK_PACKAGE);

  try {
    await withSpinner(
      `Installing ${FRAMEWORK_PACKAGE} for TypeScript types...`,
      async () => {
        installPackageSync(FRAMEWORK_PACKAGE, rootDir);
      },
      { successMessage: `Installed ${FRAMEWORK_PACKAGE}`, failMessage: `Failed to install ${FRAMEWORK_PACKAGE}` }
    );
  } catch {
    console.log(`   ${yellow('ℹ')}  For TypeScript types in your editor, run:`);
    console.log(`      ${installCmd}`);
    console.log('');
  }
}

async function scaffoldStepFileIfNeeded(
  scaffoldResult: ScaffoldResult,
  workflowId: string,
  stepId: string,
  rootDir: string,
  configOutDir?: string,
  useZod = false
): Promise<boolean> {
  const outDir = configOutDir || './novu';
  const outDirPath = path.resolve(rootDir, outDir);
  const pathResolver = new StepFilePathResolver(rootDir, outDirPath);
  const stepFilePath = pathResolver.getStepFilePath(workflowId, stepId);

  if (fsSync.existsSync(stepFilePath)) {
    const relPath = path.relative(rootDir, stepFilePath);
    console.log(yellow(`ℹ  ${relPath} already exists — scaffold skipped`));
    console.log('');

    return false;
  }

  const workflowDir = pathResolver.getWorkflowDir(workflowId);
  fsSync.mkdirSync(workflowDir, { recursive: true });

  let stepFileContent: string;

  if (scaffoldResult.mode === 'react-email') {
    const { templatePath } = scaffoldResult;
    const templateAbsPath = path.resolve(rootDir, templatePath);
    if (!fsSync.existsSync(templateAbsPath)) {
      console.error('');
      console.error(red(`❌ Template not found: ${templatePath}`));
      console.error('');
      console.error(`  Resolved to: ${templateAbsPath}`);
      console.error('  Make sure the path is relative to your project root.');
      console.error('');
      process.exit(1);
    }
    const templateImportPath = pathResolver.getTemplateImportPath(workflowId, templatePath);
    stepFileContent = generateReactEmailStepFile(stepId, templateImportPath, useZod);
  } else {
    stepFileContent = generateStepFileForType(stepId, scaffoldResult.stepType, useZod);
  }

  fsSync.writeFileSync(stepFilePath, stepFileContent, 'utf8');

  const relPath = path.relative(rootDir, stepFilePath);
  console.log(`   ${green('✓')} Created ${relPath}`);
  console.log('');
  console.log(`   ${yellow('ℹ')}  Customize the resolver logic in this file anytime, then re-run publish to redeploy.`);
  console.log('');

  await installFrameworkPackageIfNeeded(rootDir);

  return true;
}

function assertNotProductionEnvironment(envInfo: EnvironmentInfo): void {
  if (envInfo.type !== 'prod') {
    return;
  }

  console.error('');
  console.error(red('❌ Publishing to Production is not allowed via the CLI'));
  console.error('');
  console.error(`   Current environment: ${envInfo.name}`);
  console.error('');
  console.error('   The CLI publishes to non-production environments only.');
  console.error('   To promote changes to Production, use the Promote button in the Novu dashboard:');
  console.error('');
  console.error('     https://dashboard.novu.co');
  console.error('');
  console.error('   Learn more about environments and the publish flow:');
  console.error('     https://docs.novu.co/platform/developer/environments#publish-changes-to-other-environments');
  console.error('');
  console.error('   Switch to a non-production environment by using its secret key:');
  console.error('     npx novu step publish --secret-key <dev-environment-secret-key>');
  console.error('');
  process.exit(1);
}

function assertStepRequiresWorkflow(stepOption?: string[] | string, workflowOption?: string[] | string): void {
  const steps = normalizeRequestedWorkflows(stepOption);
  if (steps.length === 0) return;

  const workflows = normalizeRequestedWorkflows(workflowOption);
  if (workflows.length > 0) return;

  console.error('');
  console.error(red('❌ --step requires --workflow'));
  console.error('');
  console.error(
    'The --step flag must be used together with --workflow because step IDs are only unique within a workflow.'
  );
  console.error('');
  console.error('Example:');
  console.error('  npx novu step publish --workflow=onboarding --step=welcome-email');
  console.error('');
  process.exit(1);
}

function selectStepsByStepId(
  workflowFilteredSteps: DiscoveredStep[],
  requestedStepOption?: string[] | string
): DiscoveredStep[] {
  const requestedSteps = normalizeRequestedWorkflows(requestedStepOption);
  if (requestedSteps.length === 0) {
    return workflowFilteredSteps;
  }

  const requestedSet = new Set(requestedSteps);
  const selectedSteps = workflowFilteredSteps.filter((step) => requestedSet.has(step.stepId));
  const missingSteps = requestedSteps.filter((stepId) => !selectedSteps.some((step) => step.stepId === stepId));

  if (missingSteps.length > 0) {
    console.error(red(`❌ Step(s) not found: ${missingSteps.join(', ')}`));
    console.error('');
    console.error('Available steps in the selected workflow(s):');
    for (const step of workflowFilteredSteps) {
      console.error(`  • ${step.stepId} (workflow: ${step.workflowId})`);
    }
    console.error('');
    process.exit(1);
  }

  return selectedSteps;
}

function assertSecretKey(secretKey?: string): asserts secretKey is string {
  if (secretKey) {
    return;
  }

  console.error('');
  console.error(red('❌ Authentication required'));
  console.error('');
  console.error('Provide your API key via:');
  console.error('  1. CLI flag: npx novu step publish --secret-key nv-xxx');
  console.error('  2. Environment: export NOVU_SECRET_KEY=nv-xxx');
  console.error('  3. .env file: NOVU_SECRET_KEY=nv-xxx');
  console.error('');
  console.error('Get your API key at: https://dashboard.novu.co/api-keys');
  console.error('');
  process.exit(1);
}

async function authenticate(client: StepResolverClient, apiUrl: string): Promise<EnvironmentInfo> {
  return withSpinner(
    'Authenticating...',
    async () => {
      try {
        await client.validateConnection();
        return await client.getEnvironmentInfo();
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`${msg}\n   API URL: ${apiUrl}\n   For EU region: --api-url https://eu.api.novu.co`);
      }
    },
    {
      successMessage: (envInfo) => `Authenticated${dim(` · ${envInfo.name}`)}`,
      failMessage: 'Authentication failed',
    }
  );
}

async function discoverAndValidateSteps(stepsDir: string, stepsDirLabel: string): Promise<DiscoveredStep[]> {
  return withSpinner(
    `Discovering steps in ${stepsDirLabel}...`,
    async () => {
      const discovery = await discoverStepFiles(stepsDir);

      if (discovery.matchedFiles === 0) {
        console.error('');
        console.error(red(`❌ No step files found in ${stepsDir}`));
        console.error('');
        console.error('Expected *.step.tsx, *.step.ts, *.step.jsx, or *.step.js files.');
        console.error('');
        console.error(`Run 'npx novu step publish --workflow=<id> --step=<id>' to scaffold your first step handler.`);
        console.error('');
        throw new Error('No step files found');
      }

      if (!discovery.valid) {
        console.error('');
        console.error(red('❌ Step file validation failed'));
        console.error('');

        for (const fileError of discovery.errors) {
          console.error(red(`Errors in ${fileError.filePath}:`));
          for (const error of fileError.errors) {
            console.error(red(`  • ${error}`));
          }
          console.error('');
        }

        console.error("Fix these errors and re-run 'npx novu step publish' after correcting the handler files.");
        console.error('');
        throw new Error('Step file validation failed');
      }

      return discovery.steps;
    },
    {
      successMessage: (steps) => {
        const workflowCount = new Set(steps.map((s) => s.workflowId)).size;
        const stepText = steps.length === 1 ? 'step' : 'steps';
        const workflowText = workflowCount === 1 ? 'workflow' : 'workflows';

        return `Discovered ${steps.length} ${stepText} in ${workflowCount} ${workflowText}`;
      },
      failMessage: 'Discovery failed',
    }
  );
}

function selectStepsByWorkflow(
  discoveredSteps: DiscoveredStep[],
  requestedWorkflowOption?: string[] | string
): DiscoveredStep[] {
  const requestedWorkflows = normalizeRequestedWorkflows(requestedWorkflowOption);
  if (requestedWorkflows.length === 0) {
    return discoveredSteps;
  }

  const requestedSet = new Set(requestedWorkflows);
  const selectedSteps = discoveredSteps.filter((step) => requestedSet.has(step.workflowId));
  const missingWorkflows = requestedWorkflows.filter(
    (workflowId) => !selectedSteps.some((step) => step.workflowId === workflowId)
  );

  if (missingWorkflows.length > 0) {
    console.error(red(`❌ Step(s) not found for workflow(s): ${missingWorkflows.join(', ')}`));
    console.error('');
    console.error('Available workflows:');
    const availableWorkflows = Array.from(new Set(discoveredSteps.map((step) => step.workflowId))).sort();
    for (const workflow of availableWorkflows) {
      console.error(`  • ${workflow}`);
    }
    console.error('');
    process.exit(1);
  }

  return selectedSteps;
}

function normalizeRequestedWorkflows(requestedWorkflowOption?: string[] | string): string[] {
  if (!requestedWorkflowOption) {
    return [];
  }

  if (Array.isArray(requestedWorkflowOption)) {
    return requestedWorkflowOption;
  }

  return [requestedWorkflowOption];
}

async function buildReleaseBundle(
  selectedSteps: DiscoveredStep[],
  rootDir: string,
  minify: boolean,
  aliases?: Record<string, string>
): Promise<{ bundle: StepResolverReleaseBundle; stepsWithSchemas: DiscoveredStep[] }> {
  return withSpinner(
    'Packaging...',
    async () => {
      const stepsWithSchemas = await Promise.all(
        selectedSteps.map(async (step) => {
          const schemas = await extractStepSchemas(step.filePath);

          return { ...step, ...schemas };
        })
      );
      const bundle = await bundleRelease(stepsWithSchemas, rootDir, { minify, aliases });

      return { bundle, stepsWithSchemas };
    },
    {
      successMessage: ({ bundle }) => `Packaged${dim(` · ${formatBundleSize(bundle.size)}`)}`,
      failMessage: 'Packaging failed',
    }
  );
}

async function deployRelease(
  client: StepResolverClient,
  releaseBundle: StepResolverReleaseBundle,
  manifestSteps: StepResolverManifestStep[]
): Promise<DeploymentResult> {
  return withSpinner('Publishing...', () => client.deployRelease(releaseBundle, manifestSteps), {
    successMessage: (result) => {
      const skippedCount = result.skippedSteps.length;

      if (skippedCount > 0) {
        return `Published (${skippedCount} ${skippedCount === 1 ? 'step' : 'steps'} skipped — plan limit)`;
      }

      return 'Published';
    },
    failMessage: 'Publishing failed',
  });
}

function printDryRunSummary(
  bundle: StepResolverReleaseBundle,
  selectedSteps: DiscoveredStep[],
  startTime: number,
  rootDir: string
): void {
  const workflowCount = new Set(selectedSteps.map((step) => step.workflowId)).size;
  const stepText = selectedSteps.length === 1 ? 'step' : 'steps';
  const workflowText = workflowCount === 1 ? 'workflow' : 'workflows';
  const elapsed = formatElapsed(Date.now() - startTime);

  console.log('');
  console.log(yellow('Dry run — nothing was published'));
  console.log('');
  renderTable(
    selectedSteps,
    [
      { header: 'Step', getValue: (s) => s.stepId },
      { header: 'Workflow', getValue: (s) => s.workflowId },
      { header: 'File', getValue: (s) => path.relative(rootDir, s.filePath) },
    ],
    '   '
  );
  console.log('');
  console.log(
    `   ${selectedSteps.length} ${stepText} in ${workflowCount} ${workflowText}${dim(` · ${formatBundleSize(bundle.size)} · ${elapsed}`)} · remove --dry-run to publish`
  );
  console.log('');
}

function printSuccessSummary(
  deployment: DeploymentResult,
  steps: DiscoveredStep[],
  startTime: number,
  rootDir: string
): void {
  const skippedSet = new Set(deployment.skippedSteps.map((s) => `${s.workflowId}::${s.stepId}`));
  const hasSkipped = skippedSet.size > 0;
  const elapsed = formatElapsed(Date.now() - startTime);

  console.log('');

  if (hasSkipped) {
    renderTable(
      steps,
      [
        { header: 'Step', getValue: (s) => s.stepId },
        { header: 'Workflow', getValue: (s) => s.workflowId },
        { header: 'File', getValue: (s) => path.relative(rootDir, s.filePath) },
        {
          header: 'Status',
          getValue: (s) => (skippedSet.has(`${s.workflowId}::${s.stepId}`) ? yellow('⚠ skipped') : green('✓ deployed')),
        },
      ],
      '   '
    );
    console.log('');
    const attemptedCount = steps.length;
    const deployedCount = deployment.deployedStepsCount;
    const skippedCount = deployment.skippedSteps.length;
    console.log(
      `   ${attemptedCount} attempted · ${green(`${deployedCount} deployed`)} · ${yellow(`${skippedCount} skipped`)} (plan limit)${dim(` · Version ${deployment.stepResolverHash} · ${elapsed}`)}`
    );
    console.log('');
    console.log(
      `   ${yellow('ℹ')}  Upgrade your plan to deploy more code steps: https://dashboard.novu.co/settings/billing`
    );
  } else {
    const workflowCount = new Set(steps.map((step) => step.workflowId)).size;
    const stepText = steps.length === 1 ? 'step' : 'steps';
    const workflowText = workflowCount === 1 ? 'workflow' : 'workflows';
    renderTable(
      steps,
      [
        { header: 'Step', getValue: (s) => s.stepId },
        { header: 'Workflow', getValue: (s) => s.workflowId },
        { header: 'File', getValue: (s) => path.relative(rootDir, s.filePath) },
      ],
      '   '
    );
    console.log('');
    console.log(
      `   ${green(`${steps.length} ${stepText}`)} live in ${workflowCount} ${workflowText}${dim(` · Version ${deployment.stepResolverHash} · ${elapsed}`)}`
    );
  }

  console.log('');
}

interface ReleaseArtifactFiles {
  bundlePath: string;
  manifestPath: string;
  metadataPath: string;
}

async function writeBundleArtifactsWithSpinner(
  bundle: StepResolverReleaseBundle,
  manifestSteps: StepResolverManifestStep[],
  outputDir: string,
  rootDir: string
): Promise<void> {
  const outputDirLabel = path.relative(rootDir, outputDir) || '.';

  return withSpinner(
    `Writing bundle artifacts to ${outputDirLabel}...`,
    async () => {
      const artifacts = await writeBundleArtifacts(bundle, manifestSteps, outputDir);

      console.log(`   ${green('✓')} ${path.relative(rootDir, artifacts.bundlePath)}`);
      console.log(`   ${green('✓')} ${path.relative(rootDir, artifacts.manifestPath)}`);
      console.log(`   ${green('✓')} ${path.relative(rootDir, artifacts.metadataPath)}`);
      console.log('');
    },
    { successMessage: `Saved bundle artifacts to ${outputDirLabel}`, failMessage: 'Failed to write bundle artifacts' }
  );
}

async function writeBundleArtifacts(
  bundle: StepResolverReleaseBundle,
  manifestSteps: StepResolverManifestStep[],
  outputDir: string
): Promise<ReleaseArtifactFiles> {
  await fs.mkdir(outputDir, { recursive: true });

  const bundlePath = path.join(outputDir, `${RELEASE_ARTIFACT_BASENAME}.worker.mjs`);
  const manifestPath = path.join(outputDir, `${RELEASE_ARTIFACT_BASENAME}.manifest.json`);
  const metadataPath = path.join(outputDir, `${RELEASE_ARTIFACT_BASENAME}.meta.json`);
  const workflowIds = Array.from(new Set(manifestSteps.map((step) => step.workflowId))).sort((a, b) =>
    a.localeCompare(b)
  );
  const stepIds = manifestSteps.map((step) => step.stepId);

  await fs.writeFile(bundlePath, bundle.code, 'utf8');
  await fs.writeFile(manifestPath, `${JSON.stringify({ steps: manifestSteps }, null, 2)}\n`, 'utf8');
  await fs.writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        releaseId: RELEASE_ARTIFACT_BASENAME,
        size: bundle.size,
        workflowIds,
        stepIds,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  return {
    bundlePath,
    manifestPath,
    metadataPath,
  };
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);

  return `${m}m ${s}s`;
}

function resolveBundleOutputDir(bundleOutDir: PublishOptions['bundleOutDir'], rootDir: string): string | undefined {
  if (!bundleOutDir) {
    return undefined;
  }

  if (bundleOutDir === true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.resolve(rootDir, '.novu', 'bundles', timestamp);
  }

  return path.resolve(rootDir, bundleOutDir);
}
