#!/usr/bin/env node

import { execSync } from 'child_process';
import prompts from 'prompts';
import { Command } from 'commander';
import logger from '../utils/logger';
import fileUtils from '../utils/file';
import { detectFramework, Framework } from '../config/framework';
import { detectPackageManager, ensurePackageJson } from '../config/package-manager';
import { createComponentStructure } from '../generators/component';
import { setupEnvExampleNextJs, setupEnvExampleReact } from '../generators/env';
import { FRAMEWORKS } from '../constants';
import { AnalyticsService, AnalyticsEventEnum } from '../utils/analytics';

interface IPackageManager {
  name: string;
  install: string;
}

interface IUserConfig {
  framework: Framework;
  appId?: string;
  subscriberId?: string;
  region: string;
  packageManager: IPackageManager;
  overwriteComponents: boolean;
  updateEnvExample: boolean;
}

interface IPromptResponse {
  overwriteComponents?: boolean;
  updateEnvExample?: boolean;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
}

async function promptUserConfiguration(): Promise<IUserConfig | null> {
  // Parse command line arguments
  const { appId, subscriberId, region } = parseCommandLineArgs();

  // Detect framework first
  const detectedFramework = detectFramework();

  // If no framework is detected or it's not React/Next.js, abort
  if (!detectedFramework) {
    logger.error('\n❌ No supported framework detected.');
    logger.warning('This tool only supports React and Next.js projects.');
    logger.gray('\nPlease ensure you are running this command in a React or Next.js project directory.');

    return null;
  }

  // Use detected framework directly without prompting
  const initialResponses: Partial<IUserConfig> = {
    framework: detectedFramework,
    appId,
    subscriberId,
    region,
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
  const envPath = fileUtils.joinPaths(
    process.cwd(),
    initialResponses.framework?.framework === FRAMEWORKS.NEXTJS ? '.env.local' : '.env'
  );

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
    } catch (error) {
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

async function checkDependencyExists(packageName: string): Promise<boolean> {
  try {
    const packageJsonPath = fileUtils.joinPaths(process.cwd(), 'package.json');
    if (await fileUtils.exists(packageJsonPath)) {
      const packageJson = (await fileUtils.readJson(packageJsonPath)) as PackageJson;
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      return !!dependencies[packageName];
    }
  } catch (error) {
    return false;
  }

  return false;
}

async function installDependencies(framework: Framework, packageManager: IPackageManager): Promise<void> {
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
      const packageJson = (await fileUtils.readJson(packageJsonPath)) as PackageJson;
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

function removeSelf(packageManager: IPackageManager) {
  try {
    // Check if we're running from the source directory by looking for package.json
    const packageJsonPath = fileUtils.joinPaths(process.cwd(), 'package.json');
    if (fileUtils.exists(packageJsonPath)) {
      const packageJson = fileUtils.readJson(packageJsonPath) as PackageJson;
      // If we're in the source directory, the package.json will have the name "add-inbox"
      if (packageJson.name === 'add-inbox') {
        logger.blue('  • Running from source directory - skipping self-removal');
        logger.gray('    This is expected when testing locally.');

        return;
      }
    }

    const command = `${packageManager.name} remove add-inbox`;
    logger.gray(`  $ ${command}`);
    execSync(command, { stdio: 'inherit' });
    logger.success('  ✓ Removed add-inbox package');
  } catch (error) {
    logger.warning('  • Could not remove add-inbox package automatically.');
    logger.gray('    You can manually remove it later if desired.');
  }
}

function displayNextSteps(framework: Framework) {
  const componentImportPath = './components/ui/inbox/NovuInbox';

  logger.blue('\n Next Steps');
  logger.divider();

  logger.blue('1. The Novu Inbox component has been created at:');
  logger.cyan(`   src/${componentImportPath}.tsx\n`);

  logger.blue('2. Import the Inbox component in your app:');
  logger.cyan(`   import NovuInbox from '${componentImportPath}';\n`);

  logger.blue('3. Use the component in your app:');
  logger.cyan('   <NovuInbox />\n');

  logger.blue('4. Get your Novu credentials:');
  logger.gray('   • Visit https://web.novu.co to create an account and application.');
  logger.gray('   • Find your Application Identifier in the Novu dashboard.\n');

  logger.blue('5. Customize your Inbox & learn more:');
  logger.gray(`   • Styling:     ${logger.cyan('https://docs.novu.co/platform/inbox/react/styling')}`);
  logger.gray(`   • Hooks:       ${logger.cyan('https://docs.novu.co/platform/inbox/react/hooks')}`);
  logger.gray(`   • Localization:${logger.cyan('https://docs.novu.co/platform/inbox/react/localization')}`);
  logger.gray(`   • Production:  ${logger.cyan('https://docs.novu.co/platform/inbox/react/production\n')}`);

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

function parseCommandLineArgs() {
  const program = new Command();
  program
    .option('--appId <id>', 'Novu Application Identifier')
    .option('--subscriberId <id>', 'Novu Subscriber Identifier')
    .option('--region <region>', 'Novu Region (eu or us)', 'us')
    .parse(process.argv);

  return {
    appId: program.opts().appId,
    subscriberId: program.opts().subscriberId,
    region: program.opts().region,
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

async function performInstallation(config: IUserConfig) {
  const { framework, packageManager, overwriteComponents, updateEnvExample, appId, subscriberId, region } = config;

  try {
    logger.step(1, 'Checking framework and package manager');
    logger.success(`  ✓ Detected framework: ${logger.bold(framework.framework)}`);
    logger.gray(`    Version: ${framework.version}`);
    logger.gray(`    Setup: ${framework.setup}`);
    logger.success(`  ✓ Detected package manager: ${logger.bold(packageManager.name)}`);
    logger.success(`  ✓ Region: ${logger.bold(region)}`);

    logger.step(2, 'Installing dependencies');
    await installDependencies(framework, packageManager);

    logger.step(3, 'Creating component structure');
    await createComponentStructure(
      framework as Framework,
      overwriteComponents,
      subscriberId || null,
      region as 'us' | 'eu' | undefined
    );

    if (updateEnvExample) {
      logger.step(4, 'Setting up environment variables');
      if (framework.framework === FRAMEWORKS.NEXTJS) {
        setupEnvExampleNextJs(updateEnvExample, appId || null);
      } else {
        setupEnvExampleReact(updateEnvExample, appId || null);
      }
    }

    logger.step(5, 'Cleaning up');
    removeSelf(packageManager);

    displayNextSteps(framework);

    return true;
  } catch (error) {
    logger.error('\n❌ Installation failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    logger.gray('\nPlease try again or contact support if the issue persists.');

    return false;
  }
}

async function init() {
  const { appId, subscriberId, region } = parseCommandLineArgs();
  const analytics = new AnalyticsService(subscriberId);

  try {
    logger.banner();
    analytics.track({ event: AnalyticsEventEnum.CLI_STARTED });

    // Parse and validate command line arguments
    if (!validateAppId(appId) || !validateSubscriberId(subscriberId) || !validateRegion(region)) {
      analytics.track({
        event: AnalyticsEventEnum.CLI_ERROR,
        data: { error: 'Invalid command line arguments' },
      });
      process.exit(1);
    }

    // Validate project structure
    if (!validateProjectStructure()) {
      analytics.track({
        event: AnalyticsEventEnum.CLI_ERROR,
        data: { error: 'Invalid project structure' },
      });
      process.exit(1);
    }

    // Get user configuration
    const config = await promptUserConfiguration();
    if (!config) {
      analytics.track({
        event: AnalyticsEventEnum.CLI_ERROR,
        data: { error: 'User cancelled installation' },
      });

      return;
    }

    // Perform the installation
    const success = await performInstallation(config);
    if (!success) {
      analytics.track({
        event: AnalyticsEventEnum.CLI_ERROR,
        data: { error: 'Installation failed' },
      });
      process.exit(1);
    }

    analytics.track({
      event: AnalyticsEventEnum.CLI_COMPLETED,
      data: {
        framework: config.framework.framework,
        packageManager: config.packageManager.name,
        region: config.region,
      },
    });
  } catch (error) {
    analytics.track({
      event: AnalyticsEventEnum.CLI_ERROR,
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    logger.error('\n❌ An unexpected error occurred:');
    logger.error(error instanceof Error ? error.message : String(error));
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

export { init, parseCommandLineArgs, validateAppId, validateSubscriberId, validateProjectStructure, validateRegion };
