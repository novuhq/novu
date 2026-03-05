import * as fsSync from 'fs';
import * as fs from 'fs/promises';
import ora from 'ora';
import * as path from 'path';
import { green, red, yellow } from 'picocolors';
import prompts from 'prompts';
import type { RendererConflictStep } from './api';
import { RendererConflictError, StepResolverClient } from './api';
import { bundleRelease, formatBundleSize } from './bundler';
import { extractStepSchemas } from './bundler/schema-extractor';
import { loadConfig } from './config/loader';
import type { DiscoveredTemplate } from './discovery';
import { discoverEmailTemplates, discoverStepFiles } from './discovery';
import { generateStepFile } from './templates/step-file';
import type {
  DeploymentResult,
  DiscoveredStep,
  EnvironmentInfo,
  StepResolverManifestStep,
  StepResolverReleaseBundle,
} from './types';
import { renderTable, StepFilePathResolver, withSpinner } from './utils';

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

export async function emailPublish(options: PublishOptions): Promise<void> {
  try {
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
    const templatePath = options.template ?? (await resolveTemplateInteractively(options, rootDir, effectiveOutDir));

    if (templatePath) {
      const workflowIds = normalizeRequestedWorkflows(options.workflow);
      const stepIds = normalizeRequestedWorkflows(options.step);
      await scaffoldStepFileIfNeeded(templatePath, workflowIds[0], stepIds[0], rootDir, effectiveOutDir);
    }

    const discoveredSteps = await discoverAndValidateSteps(stepsDir, stepsDirLabel);
    const workflowFilteredSteps = selectStepsByWorkflow(discoveredSteps, options.workflow);
    const selectedSteps = selectStepsByStepId(workflowFilteredSteps, options.step);
    printDiscoveredSteps(selectedSteps, discoveredSteps.length, options.workflow, options.step);

    const stepsWithSchemas = await extractSchemasForSteps(selectedSteps);

    const shouldMinifyBundles = !options.bundleOutDir;
    if (!shouldMinifyBundles) {
      console.log(yellow('ℹ Debug bundle mode enabled: generating unminified release bundle.'));
      console.log('');
    }

    const releaseBundle = await buildReleaseBundle(stepsWithSchemas, rootDir, shouldMinifyBundles, config?.aliases);
    const manifestSteps = stepsWithSchemas.map((step) => ({
      workflowId: step.workflowId,
      stepId: step.stepId,
      ...(step.controlSchema && { controlSchema: step.controlSchema }),
    }));

    const bundleOutputDir = resolveBundleOutputDir(options.bundleOutDir, rootDir);
    if (bundleOutputDir) {
      await writeBundleArtifactsWithSpinner(releaseBundle, manifestSteps, bundleOutputDir, rootDir);
    }

    if (options.dryRun) {
      printDryRunSummary(releaseBundle, selectedSteps, manifestSteps);
      return;
    }

    try {
      const deployment = await deployRelease(client, releaseBundle, manifestSteps);
      printSuccessSummary(deployment, selectedSteps);
    } catch (error) {
      if (error instanceof RendererConflictError) {
        printRendererConflictError(error);
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('');
    console.error(red('❌ Publish failed:'), error instanceof Error ? error.message : error);
    console.error('');
    process.exit(1);
  }
}

async function resolveTemplateInteractively(
  options: PublishOptions,
  rootDir: string,
  configOutDir?: string
): Promise<string | undefined> {
  const workflowIds = normalizeRequestedWorkflows(options.workflow);
  const stepIds = normalizeRequestedWorkflows(options.step);

  if (workflowIds.length !== 1 || stepIds.length !== 1) {
    return undefined;
  }

  const outDir = configOutDir || './novu';
  const outDirPath = path.resolve(rootDir, outDir);
  const pathResolver = new StepFilePathResolver(rootDir, outDirPath);
  const stepFilePath = pathResolver.getStepFilePath(workflowIds[0], stepIds[0]);

  if (fsSync.existsSync(stepFilePath)) {
    return undefined;
  }

  if (!process.stdout.isTTY) {
    console.log(yellow('ℹ  No --template provided. Use --template=<path> to scaffold a step file.'));
    console.log('');

    return undefined;
  }

  const templates = await withSpinner('Discovering React Email templates...', () => discoverEmailTemplates(rootDir), {
    successMessage: 'Template discovery complete',
    failMessage: 'Template discovery failed',
  });

  if (templates.length === 0) {
    console.log(yellow('ℹ  No React Email templates found in this project.'));
    console.log('');
    console.log(
      `   Templates must import from ${yellow('@react-email/components')}, use JSX, and have a default export.`
    );
    console.log('');
    console.log(`   To specify a template path manually, re-run with:`);
    console.log(
      `   npx novu email publish --workflow=${workflowIds[0]} --step=${stepIds[0]} --template=<path-to-template>`
    );
    console.log('');

    return undefined;
  }

  return promptForTemplate(templates);
}

const MANUAL_ENTRY_VALUE = '__manual__';

async function promptForTemplate(templates: DiscoveredTemplate[]): Promise<string | undefined> {
  console.log('');

  const selectResponse = await prompts(
    {
      type: 'select',
      name: 'template',
      message: 'Select a React Email template for this step',
      choices: [
        ...templates.map((t) => ({ title: t.relativePath, value: t.relativePath })),
        { title: 'Enter path manually...', value: MANUAL_ENTRY_VALUE },
      ],
    },
    {
      onCancel: () => {
        console.log('');
        console.log(yellow('ℹ  Template selection cancelled. Step file will not be scaffolded.'));
        console.log('');
      },
    }
  );

  if (!selectResponse.template) {
    return undefined;
  }

  if (selectResponse.template !== MANUAL_ENTRY_VALUE) {
    console.log('');

    return selectResponse.template;
  }

  const textResponse = await prompts(
    {
      type: 'text',
      name: 'template',
      message: 'Template path (relative to project root)',
      initial: './emails/your-template.tsx',
    },
    {
      onCancel: () => {
        console.log('');
        console.log(yellow('ℹ  Template selection cancelled. Step file will not be scaffolded.'));
        console.log('');
      },
    }
  );

  console.log('');

  const manualTemplatePath = textResponse.template?.trim();
  if (!manualTemplatePath) {
    return undefined;
  }

  return manualTemplatePath;
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
    console.error(
      '  npx novu email publish --workflow=onboarding --step=welcome-email --template=./emails/welcome.tsx'
    );
    console.error('');
    process.exit(1);
  }

  if (steps.length !== 1) {
    console.error('');
    console.error(red('❌ --template requires exactly one --step'));
    console.error('');
    console.error('Example:');
    console.error(
      '  npx novu email publish --workflow=onboarding --step=welcome-email --template=./emails/welcome.tsx'
    );
    console.error('');
    process.exit(1);
  }
}

async function scaffoldStepFileIfNeeded(
  templatePath: string,
  workflowId: string,
  stepId: string,
  rootDir: string,
  configOutDir?: string
): Promise<void> {
  const outDir = configOutDir || './novu';
  const outDirPath = path.resolve(rootDir, outDir);
  const pathResolver = new StepFilePathResolver(rootDir, outDirPath);
  const stepFilePath = pathResolver.getStepFilePath(workflowId, stepId);

  if (fsSync.existsSync(stepFilePath)) {
    const relPath = path.relative(rootDir, stepFilePath);
    console.log(yellow(`ℹ  ${relPath} already exists — --template flag ignored`));
    console.log('');

    return;
  }

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

  const workflowDir = pathResolver.getWorkflowDir(workflowId);
  fsSync.mkdirSync(workflowDir, { recursive: true });

  const templateImportPath = pathResolver.getTemplateImportPath(workflowId, templatePath);
  const stepFileContent = generateStepFile(stepId, workflowId, templateImportPath, { template: templatePath });

  fsSync.writeFileSync(stepFilePath, stepFileContent, 'utf8');

  const relPath = path.relative(rootDir, stepFilePath);
  console.log(`   ${green('✓')} Created ${relPath}`);
  console.log('');
  console.log(`   ${yellow('ℹ')}  For TypeScript types in your editor:`);
  console.log(`      npm install --save-dev @novu/framework`);
  console.log('');
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
  console.error('     npx novu email publish --secret-key <dev-environment-secret-key>');
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
  console.error('  npx novu email publish --workflow=onboarding --step=welcome-email');
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
  console.error('  1. CLI flag: npx novu email publish --secret-key nv-xxx');
  console.error('  2. Environment: export NOVU_SECRET_KEY=nv-xxx');
  console.error('  3. .env file: NOVU_SECRET_KEY=nv-xxx');
  console.error('');
  console.error('Get your API key at: https://dashboard.novu.co/api-keys');
  console.error('');
  process.exit(1);
}

async function authenticate(client: StepResolverClient, apiUrl: string): Promise<EnvironmentInfo> {
  const envInfo = await withSpinner(
    'Authenticating with Novu...',
    async () => {
      try {
        await client.validateConnection();
        const envInfo = await client.getEnvironmentInfo();
        return envInfo;
      } catch (error) {
        console.error(`Using API URL: ${apiUrl}`);
        console.error('(For EU region, use: --api-url https://eu.api.novu.co)');
        console.error('');
        throw error;
      }
    },
    { successMessage: 'Authenticated with Novu', failMessage: 'Authentication failed' }
  );

  console.log(`   ${green('✓')} Environment: ${envInfo.name} (${envInfo._id})`);
  console.log('');
  return envInfo;
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
        console.error("Run 'npx novu email init' first to generate step handlers.");
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

        console.error("Fix these errors and run 'npx novu email init --force' to regenerate step files.");
        console.error('');
        throw new Error('Step file validation failed');
      }

      return discovery.steps;
    },
    { successMessage: 'Discovered step files', failMessage: 'Discovery failed' }
  );
}

async function extractSchemasForSteps(steps: DiscoveredStep[]): Promise<DiscoveredStep[]> {
  return withSpinner(
    'Extracting step schemas...',
    async () => {
      const results = await Promise.all(
        steps.map(async (step) => {
          const schemas = await extractStepSchemas(step.filePath);

          return { ...step, ...schemas };
        })
      );

      const stepsWithSchemas = results.filter((s) => s.controlSchema);

      if (stepsWithSchemas.length > 0) {
        for (const step of stepsWithSchemas) {
          console.log(`   ${green('✓')} ${step.stepId} (workflow: ${step.workflowId}) — control schema extracted`);
        }
      }

      return results;
    },
    { successMessage: 'Schemas extracted', failMessage: 'Schema extraction failed' }
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

function printDiscoveredSteps(
  steps: DiscoveredStep[],
  totalDiscoveredSteps: number,
  selectedWorkflowOption?: string[] | string,
  selectedStepOption?: string[] | string
) {
  for (const step of steps) {
    console.log(`   ${green('✓')} ${step.stepId} (workflow: ${step.workflowId})`);
  }

  const workflowCount = new Set(steps.map((step) => step.workflowId)).size;
  const isFiltered =
    normalizeRequestedWorkflows(selectedWorkflowOption).length > 0 ||
    normalizeRequestedWorkflows(selectedStepOption).length > 0;

  console.log('');
  if (isFiltered) {
    console.log(
      `   Found ${steps.length} step(s) across ${workflowCount} workflow(s) (filtered from ${totalDiscoveredSteps} total step(s))`
    );
  } else {
    console.log(`   Found ${steps.length} step(s) across ${workflowCount} workflow(s)`);
  }
  console.log('');
}

async function buildReleaseBundle(
  selectedSteps: DiscoveredStep[],
  rootDir: string,
  minify: boolean,
  aliases?: Record<string, string>
): Promise<StepResolverReleaseBundle> {
  const bundle = await withSpinner(
    'Packaging steps...',
    async () => {
      return bundleRelease(selectedSteps, rootDir, { minify, aliases });
    },
    { successMessage: 'Packaged successfully', failMessage: 'Packaging failed' }
  );

  const workflowCount = new Set(selectedSteps.map((step) => step.workflowId)).size;
  console.log(
    `   ${green('✓')} ${selectedSteps.length} step(s), ${workflowCount} workflow(s), ${formatBundleSize(bundle.size)}`
  );
  console.log('');
  return bundle;
}

async function deployRelease(
  client: StepResolverClient,
  releaseBundle: StepResolverReleaseBundle,
  manifestSteps: StepResolverManifestStep[]
): Promise<DeploymentResult> {
  const deploySpinner = ora('Publishing...').start();

  try {
    const result = await client.deployRelease(releaseBundle, manifestSteps);
    deploySpinner.stop();

    return result;
  } catch (error) {
    deploySpinner.fail('Publishing failed');
    throw error;
  }
}

function printRendererConflictError(error: RendererConflictError): void {
  const stepList = error.conflictingSteps
    .map((s: RendererConflictStep) => `    • ${s.stepId} (workflow: ${s.workflowId})`)
    .join('\n');

  const isPlural = error.conflictingSteps.length > 1;
  const stepWord = isPlural ? 'steps' : 'step';

  console.error('');
  console.error(red(`❌ ${isPlural ? 'Some steps are' : 'This step is'} not set to React Email`));
  console.error('');
  console.error(`   Affected ${stepWord}:`);
  console.error(stepList);
  console.error('');
  console.error(`   Publishing is blocked to avoid accidentally overwriting existing email content.`);
  console.error('');
  console.error('   To fix this, open each affected step in the Novu dashboard,');
  console.error('   go to the code editor, and select React Email.');
  console.error('');
  process.exit(1);
}

function printDryRunSummary(
  bundle: StepResolverReleaseBundle,
  selectedSteps: DiscoveredStep[],
  manifestSteps: StepResolverManifestStep[]
): void {
  const workflowCount = new Set(selectedSteps.map((step) => step.workflowId)).size;

  console.log(yellow('🔍 Dry run mode - skipping deployment'));
  console.log('');
  console.log('Package summary:');
  console.log(`  • Size: ${formatBundleSize(bundle.size)}`);
  console.log(`  • Steps: ${selectedSteps.length}`);
  console.log(`  • Workflows: ${workflowCount}`);
  console.log('');
  console.log('Included steps:');
  for (const step of manifestSteps) {
    console.log(`  • ${step.stepId} (workflow: ${step.workflowId})`);
  }
  console.log('');
  console.log(green('✅ Ready to publish!'));
  console.log('');
}

function printSuccessSummary(deployment: DeploymentResult, steps: DiscoveredStep[]): void {
  console.log(green('✅ Published successfully!'));
  console.log('');

  const workflowCount = new Set(steps.map((step) => step.workflowId)).size;
  const stepText = deployment.selectedStepsCount === 1 ? 'step' : 'steps';
  const workflowText = workflowCount === 1 ? 'workflow' : 'workflows';
  console.log(
    `   ${deployment.selectedStepsCount} ${stepText} across ${workflowCount} ${workflowText} ${deployment.selectedStepsCount === 1 ? 'is' : 'are'} now live`
  );
  console.log('');
  console.log(`   Version: ${deployment.stepResolverHash}`);
  console.log(`   Published: ${formatDeploymentTime(deployment.deployedAt)}`);
  console.log('');

  renderTable(
    steps,
    [
      { header: 'Step', getValue: (s) => s.stepId },
      { header: 'Workflow', getValue: (s) => s.workflowId },
      { header: 'Status', getValue: () => green('Live') },
    ],
    '   '
  );
  console.log('');
}

function formatDeploymentTime(isoString: string): string {
  const date = new Date(isoString);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${month} ${day}, ${year} at ${time}`;
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
