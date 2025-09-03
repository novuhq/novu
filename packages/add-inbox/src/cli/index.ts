#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { Command } from 'commander';
import prompts from 'prompts';
import { detectFramework, IFramework } from '../config/framework';
import { detectPackageManager } from '../config/package-manager';
import { FRAMEWORKS } from '../constants';
import { createComponentStructure } from '../generators/component';
import { setupEnvExampleNextJs, setupEnvExampleReact } from '../generators/env';
import { AnalyticsEventEnum, AnalyticsService } from '../utils/analytics';
import fileUtils from '../utils/file';
import logger from '../utils/logger';

interface IPackageManager {
  name: string;
  install: string;
}

interface IUserConfig {
  framework: IFramework;
  appId?: string;
  subscriberId?: string;
  region: string;
  backendUrl?: string;
  socketUrl?: string;
  packageManager: IPackageManager;
  overwriteComponents: boolean;
  updateEnvExample: boolean;
}

interface IPromptResponse {
  overwriteComponents?: boolean;
  updateEnvExample?: boolean;
}

interface IPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
}

async function promptUserConfiguration(): Promise<IUserConfig | null> {
  // Parse command line arguments
  const { appId, subscriberId, region, backendUrl, socketUrl } = parseCommandLineArgs();

  // Detect framework first
  const detectedFramework = detectFramework();

  // If no framework is detected or it's not React/Next.js, abort
  if (!detectedFramework) {
    logger.error('\n❌ No supported framework detected.');
    logger.warning('This tool only supports React and Next.js projects.');
    logger.gray('\nPlease ensure you are running this command in a React or Next.js project directory.');

    return null;
  }

  // Determine effective region and show warnings
  let effectiveRegion = region;
  if (backendUrl || socketUrl) {
    // When custom URLs are provided, region is not needed
    if (region !== 'us') {
      logger.warning('\n⚠️  Custom backend/socket URLs provided. Region parameter will be ignored.');
      logger.gray('   The custom URLs will take precedence over region-based configuration.');
    }
    effectiveRegion = 'us'; // Default to 'us' when custom URLs are provided
  }

  // Use detected framework directly without prompting
  const initialResponses: Partial<IUserConfig> = {
    framework: detectedFramework,
    appId,
    subscriberId,
    region: effectiveRegion,
    backendUrl,
    socketUrl,
  };

  // Detect package manager
  const packageManager = detectPackageManager();
  if (!packageManager) {
    logger.error('  ✗ Could not detect package manager. Please ensure you have a package.json file.');

    return null;
  }

  const additionalPrompts: prompts.PromptObject[] = [];
  const cwd = process.cwd();
  const srcDir = fileUtils.joinPaths(cwd, 'src');
  const appDir = fileUtils.joinPaths(cwd, 'app');

  // Determine the base directory for components
  let baseDir = cwd;
  if (fileUtils.exists(srcDir)) {
    baseDir = srcDir;
  } else if (fileUtils.exists(appDir)) {
    baseDir = appDir;
  }

  const inboxComponentPath = fileUtils.joinPaths(baseDir, 'components', 'ui', 'inbox');
  if (fileUtils.exists(inboxComponentPath)) {
    logger.warning('\n⚠️  The Novu Inbox component is already installed in your project.');
    logger.gray(`   Location: ${inboxComponentPath}`);
    logger.gray('   You can choose to overwrite the existing installation or cancel.\n');

    additionalPrompts.push({
      type: 'confirm',
      name: 'overwriteComponents',
      message: 'Would you like to overwrite the existing installation?',
      initial: false,
    });
  }

  const envExamplePath = fileUtils.joinPaths(process.cwd(), '.env.example');

  // Check if environment files exist and need updating
  if (fileUtils.exists(envExamplePath)) {
    const envExampleContent = fileUtils.readFile(envExamplePath);
    const envVarName =
      initialResponses.framework?.framework === FRAMEWORKS.NEXTJS ? 'NEXT_PUBLIC_NOVU_APP_ID' : 'VITE_NOVU_APP_ID';

    if (envExampleContent && !envExampleContent.includes(envVarName)) {
      additionalPrompts.push({
        type: 'confirm',
        name: 'updateEnvExample',
        message: '.env.example already exists. Append Novu variables?',
        initial: true,
      });
    } else {
      logger.blue('  i Novu variables seem to already exist in .env.example. Skipping prompt to update.');
      initialResponses.updateEnvExample = false;
    }
  }

  let additionalResponses: IPromptResponse = {};
  if (additionalPrompts.length > 0) {
    try {
      additionalResponses = await prompts(additionalPrompts);
      // If user cancels additional prompts
      if (Object.keys(additionalResponses).length === 0) {
        logger.yellow('\nInstallation cancelled by user.');

        return null;
      }

      // If user chose not to overwrite, exit immediately
      if (additionalResponses.overwriteComponents === false) {
        logger.yellow('\nInstallation cancelled. No changes were made.');

        return null;
      }
    } catch (_error) {
      logger.yellow('\nInstallation cancelled by user.');

      return null;
    }
  }

  return {
    ...initialResponses,
    ...additionalResponses,
    packageManager,
    // Set defaults if prompts were skipped or cancelled
    overwriteComponents:
      additionalResponses.overwriteComponents !== undefined ? additionalResponses.overwriteComponents : false,
    updateEnvExample:
      additionalResponses.updateEnvExample !== undefined
        ? additionalResponses.updateEnvExample
        : !fileUtils.exists(envExamplePath), // Default to true if file doesn't exist
  } as IUserConfig;
}

async function installDependencies(framework: IFramework, packageManager: IPackageManager): Promise<void> {
  logger.gray('• Installing required packages...');

  const packagesToInstall: string[] = [];

  // Always install latest version of Novu packages
  if (framework.framework === FRAMEWORKS.NEXTJS) {
    packagesToInstall.push('@novu/nextjs@latest');
  } else {
    packagesToInstall.push('@novu/react@latest');
  }

  if (packagesToInstall.length > 0) {
    try {
      // Create a backup of package.json before installation
      const packageJsonPath = fileUtils.joinPaths(process.cwd(), 'package.json');
      const backupPath = fileUtils.joinPaths(process.cwd(), 'package.json.backup');
      fileUtils.copyFile(packageJsonPath, backupPath);

      const command = `${packageManager.name} ${packageManager.install} ${packagesToInstall.join(' ')}`;
      logger.gray(`  $ ${command}`);

      // Execute the installation command
      execSync(command, {
        stdio: 'inherit',
        env: {
          ...process.env,
          // Add timeout to prevent hanging
          NPM_CONFIG_FETCH_TIMEOUT: '300000', // 5 minutes
          NPM_CONFIG_FETCH_RETRIES: '3',
        },
      });

      // Enhanced verification of package installation
      const packageJson = (await fileUtils.readJson(packageJsonPath)) as IPackageJson;
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const missingPackages: string[] = [];
      const versionMismatches: string[] = [];

      for (const pkg of packagesToInstall) {
        // Correctly extract package name and version for scoped packages
        const atIndex = pkg.lastIndexOf('@');
        const pkgName = atIndex > 0 ? pkg.slice(0, atIndex) : pkg;
        const requestedVersion = atIndex > 0 ? pkg.slice(atIndex + 1) : undefined;

        // Check if package exists in package.json
        if (!dependencies[pkgName]) {
          missingPackages.push(pkgName);
          continue;
        }

        // For latest version, we just verify it exists
        if (requestedVersion === 'latest') {
          continue;
        }

        // For specific versions, verify version matches
        const installedVersion = dependencies[pkgName].replace(/^[\^~]/, '');
        if (installedVersion !== requestedVersion) {
          versionMismatches.push(`${pkgName} (requested: ${requestedVersion}, installed: ${installedVersion})`);
        }
      }

      if (missingPackages.length > 0 || versionMismatches.length > 0) {
        let errorMessage = 'Package installation verification failed:\n';
        if (missingPackages.length > 0) {
          errorMessage += `- Missing packages: ${missingPackages.join(', ')}\n`;
        }
        if (versionMismatches.length > 0) {
          errorMessage += `- Version mismatches: ${versionMismatches.join(', ')}`;
        }
        throw new Error(errorMessage);
      }

      // Verify package files exist in node_modules
      const nodeModulesPath = fileUtils.joinPaths(process.cwd(), 'node_modules');
      const missingFiles = packagesToInstall.filter((pkg) => {
        const atIndex = pkg.lastIndexOf('@');
        const pkgName = atIndex > 0 ? pkg.slice(0, atIndex) : pkg;
        const pkgPath = fileUtils.joinPaths(nodeModulesPath, pkgName);
        const pkgJsonPath = fileUtils.joinPaths(pkgPath, 'package.json');

        return !fileUtils.exists(pkgPath) || !fileUtils.exists(pkgJsonPath);
      });

      if (missingFiles.length > 0) {
        throw new Error(`Package files missing in node_modules: ${missingFiles.join(', ')}`);
      }

      logger.success('  ✓ Dependencies installed successfully');

      // Clean up backup if successful
      fileUtils.deleteFile(backupPath);
    } catch (error) {
      // Restore package.json from backup if it exists
      const backupPath = fileUtils.joinPaths(process.cwd(), 'package.json.backup');
      if (fileUtils.exists(backupPath)) {
        fileUtils.copyFile(backupPath, fileUtils.joinPaths(process.cwd(), 'package.json'));
        fileUtils.deleteFile(backupPath);
      }

      throw new Error(`Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    logger.success('  ✓ All required dependencies are already installed');
  }
}

function displayNextSteps() {
  const componentImportPath = './components/ui/inbox/NovuInbox';

  logger.info(logger.blue('\n Next Steps'));
  logger.divider();

  logger.info(logger.blue('1. The Novu Inbox component has been created at:'));
  logger.info(logger.cyan(`   src/${componentImportPath}.tsx\n`));

  logger.info(logger.blue('2. Import the Inbox component in your app:'));
  logger.info(logger.cyan(`   import NovuInbox from '${componentImportPath}';\n`));

  logger.info(logger.blue('3. Use the component in your app:'));
  logger.info(logger.cyan('   <NovuInbox />\n'));

  logger.info(logger.blue('4. Get your Novu credentials:'));
  logger.gray('   • Visit https://web.novu.co to create an account and application.');
  logger.gray('   • Find your Application Identifier in the Novu dashboard.\n');

  logger.info(logger.blue('5. Customize your Inbox & learn more:'));
  logger.gray(`   • Styling:     ${logger.cyan('https://docs.novu.co/platform/inbox/configuration/styling')}`);
  logger.gray(`   • Hooks:       ${logger.cyan('https://docs.novu.co/platform/sdks/react/hooks/novu-provider')}`);
  logger.gray(`   • Localization:${logger.cyan('https://docs.novu.co/platform/inbox/advanced-concepts/localization')}`);
  logger.gray(`   • Production:  ${logger.cyan('https://docs.novu.co/platform/inbox/prepare-for-production\n')}`);

  logger.success("🎉 You're all set! Happy coding with Novu! 🎉\n");
}

// Add new utility functions at the top level
function validateAppId(appId: string | undefined): boolean {
  if (appId === undefined || appId === null) return true; // Optional
  if (typeof appId !== 'string' || appId.trim().length === 0) {
    logger.error('Invalid appId provided. It must be a non-empty string.');

    return false;
  }

  return true;
}

function validateSubscriberId(subscriberId: string | undefined): boolean {
  if (subscriberId === undefined || subscriberId === null) return true; // Optional
  if (typeof subscriberId !== 'string' || subscriberId.trim().length === 0) {
    logger.error('Invalid subscriberId provided. It must be a non-empty string.');

    return false;
  }

  return true;
}

function validateRegion(region: string): boolean {
  if (region !== 'eu' && region !== 'us') {
    logger.error('Invalid region provided. It must be either "eu" or "us".');

    return false;
  }

  return true;
}

function validateBackendUrl(backendUrl: string | undefined): boolean {
  if (backendUrl === undefined || backendUrl === null) return true; // Optional
  if (typeof backendUrl !== 'string' || backendUrl.trim().length === 0) {
    logger.error('Invalid backendUrl provided. It must be a non-empty string.');

    return false;
  }

  // URL validation with HTTP/HTTPS protocol enforcement
  try {
    const url = new URL(backendUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      logger.error('Invalid backendUrl provided. Backend URL must use HTTP or HTTPS protocol.');

      return false;
    }
  } catch {
    logger.error('Invalid backendUrl provided. It must be a valid URL.');

    return false;
  }

  return true;
}

function validateSocketUrl(socketUrl: string | undefined): boolean {
  if (socketUrl === undefined || socketUrl === null) return true; // Optional
  if (typeof socketUrl !== 'string' || socketUrl.trim().length === 0) {
    logger.error('Invalid socketUrl provided. It must be a non-empty string.');

    return false;
  }

  // URL validation with WebSocket protocol enforcement
  try {
    const url = new URL(socketUrl);
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      logger.error('Invalid socketUrl provided. WebSocket URL must use WS or WSS protocol.');

      return false;
    }
  } catch {
    logger.error('Invalid socketUrl provided. It must be a valid URL.');

    return false;
  }

  return true;
}

function parseCommandLineArgs() {
  const program = new Command();
  program
    .option('--appId <id>', 'Novu Application Identifier')
    .option('--subscriberId <id>', 'Novu Subscriber Identifier')
    .option('--region <region>', 'Novu Region (eu or us). Optional when using custom URLs.', 'us')
    .option('--backendUrl <url>', 'Custom backend URL for Novu API')
    .option('--socketUrl <url>', 'Custom socket URL for Novu WebSocket connection')
    .parse(process.argv);

  return {
    appId: program.opts().appId,
    subscriberId: program.opts().subscriberId,
    region: program.opts().region,
    backendUrl: program.opts().backendUrl,
    socketUrl: program.opts().socketUrl,
  };
}

function validateProjectStructure() {
  const packageJsonPath = fileUtils.joinPaths(process.cwd(), 'package.json');
  if (!fileUtils.exists(packageJsonPath)) {
    logger.error('\n❌ No project detected.');
    logger.warning('This tool must be run within a React or Next.js project directory.');
    logger.gray('\nPlease ensure you are in your project directory before running this command.');

    return false;
  }

  return true;
}

async function performInstallation(config: IUserConfig, analytics?: AnalyticsService) {
  const {
    framework,
    packageManager,
    overwriteComponents,
    updateEnvExample,
    appId,
    subscriberId,
    region,
    backendUrl,
    socketUrl,
  } = config;

  try {
    logger.step(1, 'Checking framework and package manager');
    logger.success(`  ✓ Detected framework: ${logger.bold(framework.framework)}`);
    logger.gray(`    Version: ${framework.version}`);
    logger.gray(`    Setup: ${framework.setup}`);
    logger.success(`  ✓ Detected package manager: ${logger.bold(packageManager.name)}`);
    logger.success(`  ✓ Region: ${logger.bold(region)}`);
    if (backendUrl) {
      logger.success(`  ✓ Custom backend URL: ${logger.bold(backendUrl)}`);
    }
    if (socketUrl) {
      logger.success(`  ✓ Custom socket URL: ${logger.bold(socketUrl)}`);
    }

    logger.step(2, 'Installing dependencies');
    await installDependencies(framework, packageManager);

    logger.step(3, 'Creating component structure');
    await createComponentStructure(
      framework,
      overwriteComponents,
      subscriberId || null,
      region as 'us' | 'eu' | undefined,
      backendUrl || null,
      socketUrl || null
    );

    if (updateEnvExample) {
      logger.step(4, 'Setting up environment variables');
      if (framework.framework === FRAMEWORKS.NEXTJS) {
        setupEnvExampleNextJs(updateEnvExample, appId || null);
      } else {
        setupEnvExampleReact(updateEnvExample, appId || null);
      }
    }

    logger.step(4, "What's next?");

    displayNextSteps();

    return true;
  } catch (error) {
    logger.error('\n❌ Installation failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    logger.gray('\nPlease try again or contact support if the issue persists.');

    return false;
  }
}

function getAnalyticsContext(config?: IUserConfig) {
  if (!config) return {};

  return {
    framework: config.framework?.framework,
    frameworkVersion: config.framework?.version,
    packageManager: config.packageManager?.name,
    region: config.region,
    appId: config.appId,
    subscriberId: config.subscriberId,
  };
}

function trackCliError(
  analytics: AnalyticsService,
  error: unknown,
  config?: IUserConfig,
  context: Record<string, unknown> = {}
) {
  let errorMessage = '';
  let stack = '';

  if (error instanceof Error) {
    errorMessage = error.message;
    stack = error.stack || '';
  } else {
    errorMessage = String(error);
  }

  analytics.track({
    event: AnalyticsEventEnum.CLI_ERROR,
    data: {
      error: errorMessage,
      stack,
      ...getAnalyticsContext(config),
      ...context,
    },
  });
}

function trackCliCancelled(
  analytics: AnalyticsService,
  reason: string,
  config?: IUserConfig,
  context: Record<string, unknown> = {}
) {
  analytics.track({
    event: AnalyticsEventEnum.CLI_USER_CANCELLED,
    data: {
      reason,
      ...getAnalyticsContext(config),
      ...context,
    },
  });
}

function trackCliCompleted(analytics: AnalyticsService, config: IUserConfig, context: Record<string, unknown> = {}) {
  analytics.track({
    event: AnalyticsEventEnum.CLI_COMPLETED,
    data: {
      ...getAnalyticsContext(config),
      ...context,
    },
  });
}

async function init() {
  const { appId, subscriberId, region, backendUrl, socketUrl } = parseCommandLineArgs();
  const analytics = new AnalyticsService(subscriberId);
  let config: IUserConfig | null = null;
  let errorOrCancelled = false;

  try {
    logger.banner();
    analytics.track({ event: AnalyticsEventEnum.CLI_STARTED });

    // Parse and validate command line arguments
    const argsValid =
      validateAppId(appId) &&
      validateSubscriberId(subscriberId) &&
      validateRegion(region) &&
      validateBackendUrl(backendUrl) &&
      validateSocketUrl(socketUrl);
    if (!argsValid) {
      trackCliError(analytics, 'Invalid command line arguments', undefined, {
        step: 'validateArgs',
        appId,
        subscriberId,
        region,
        backendUrl,
        socketUrl,
      });
      errorOrCancelled = true;
      process.exit(1);
    }

    // Validate project structure
    const projectValid = validateProjectStructure();
    if (!projectValid) {
      trackCliError(analytics, 'Invalid project structure', undefined, { step: 'validateProjectStructure' });
      errorOrCancelled = true;
      process.exit(1);
    }

    // Get user configuration
    config = await promptUserConfiguration();
    if (!config) {
      // User cancellation
      trackCliCancelled(analytics, 'User cancelled during promptUserConfiguration', undefined);
      errorOrCancelled = true;

      return;
    }

    // Perform the installation
    const success = await performInstallation(config, analytics);
    if (!success) {
      trackCliError(analytics, 'Installation failed', config ?? undefined, {
        step: 'performInstallation',
      });
      errorOrCancelled = true;
      process.exit(1);
    }

    // Only track completed if not error/cancelled
    if (!errorOrCancelled) {
      trackCliCompleted(analytics, config);
    }
  } catch (error) {
    trackCliError(analytics, error, config ?? undefined, {
      step: 'init',
      appId,
      subscriberId,
      region,
      backendUrl,
      socketUrl,
    });
    logger.error('\n❌ An unexpected error occurred:');
    logger.error(error instanceof Error ? error.message : String(error));
    errorOrCancelled = true;
    process.exit(1);
  } finally {
    await analytics.flush();
  }
}

// --- Entry Point ---
if (typeof require !== 'undefined' && require.main === module) {
  init().catch((error) => {
    logger.error('\n❌ An unexpected error occurred:');
    logger.error(error);
    process.exit(1);
  });
}

export {
  init,
  parseCommandLineArgs,
  validateAppId,
  validateSubscriberId,
  validateProjectStructure,
  validateRegion,
  validateBackendUrl,
  validateSocketUrl,
};
