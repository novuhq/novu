import { execSync } from 'child_process';
import prompts from 'prompts';
import { PACKAGE_MANAGERS, PackageManagerType } from '../constants';
import fileUtils from '../utils/file';
import logger from '../utils/logger';

interface IPackageManager {
  name: PackageManagerType;
  install: string;
  init: string;
}

interface IPackageJson {
  packageManager?: string;
}

const PACKAGE_MANAGER_COMMANDS: Record<PackageManagerType, IPackageManager> = {
  [PACKAGE_MANAGERS.NPM]: { name: PACKAGE_MANAGERS.NPM, install: 'install', init: 'init -y' },
  [PACKAGE_MANAGERS.YARN]: { name: PACKAGE_MANAGERS.YARN, install: 'add', init: 'init -y' },
  [PACKAGE_MANAGERS.PNPM]: { name: PACKAGE_MANAGERS.PNPM, install: 'add', init: 'init' },
};

export function detectPackageManager(packageManagerOverride?: PackageManagerType): IPackageManager {
  const detectedPackageManager = detectPackageManagerType();

  // If there's a package manager override, use it
  let packageManager = packageManagerOverride || detectedPackageManager;

  // If the detected package manager does not match the provided package manager, warn the user
  if (detectedPackageManager && packageManagerOverride && detectedPackageManager !== packageManagerOverride) {
    logger.warning(
      `  • Detected package manager ${detectedPackageManager} does not match the provided package manager ${packageManagerOverride}, which could lead to unexpected behavior`
    );
  }

  // If no package manager is detected, default to npm
  if (!packageManager) {
    logger.warning('  • No package manager detected, defaulting to npm');
    packageManager = PACKAGE_MANAGERS.NPM;
  }

  return PACKAGE_MANAGER_COMMANDS[packageManager];
}

export function detectPackageManagerType(): PackageManagerType | null {
  const cwd = process.cwd();

  // Check for lock files first
  if (fileUtils.exists(fileUtils.joinPaths(cwd, 'pnpm-lock.yaml'))) {
    return PACKAGE_MANAGERS.PNPM;
  }
  if (fileUtils.exists(fileUtils.joinPaths(cwd, 'yarn.lock'))) {
    return PACKAGE_MANAGERS.YARN;
  }
  if (fileUtils.exists(fileUtils.joinPaths(cwd, 'package-lock.json'))) {
    return PACKAGE_MANAGERS.NPM;
  }

  // If no lock file is found, check package.json for packageManager field
  try {
    const packageJsonPath = fileUtils.joinPaths(cwd, 'package.json');
    if (fileUtils.exists(packageJsonPath)) {
      let packageJson: IPackageJson | undefined;
      try {
        packageJson = fileUtils.readJson(packageJsonPath) as IPackageJson;
      } catch (readError) {
        logger.warning(
          `  • Failed to parse package.json: ${readError instanceof Error ? readError.message : String(readError)}`
        );

        return null;
      }
      if (packageJson && typeof packageJson.packageManager === 'string') {
        const split = packageJson.packageManager.split('@');
        if (split.length === 2) {
          const [name, version] = split;
          if (name && version && version.trim().length > 0) {
            if (name === PACKAGE_MANAGERS.NPM) {
              return PACKAGE_MANAGERS.NPM;
            } else if (name === PACKAGE_MANAGERS.YARN) {
              return PACKAGE_MANAGERS.YARN;
            } else if (name === PACKAGE_MANAGERS.PNPM) {
              return PACKAGE_MANAGERS.PNPM;
            }
          } else {
            logger.warning(
              `  • Invalid packageManager field in package.json: '${packageJson.packageManager}' (missing name or version)`
            );
          }
        } else {
          logger.warning(`  • Malformed packageManager field in package.json: '${packageJson.packageManager}'`);
        }
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warning(`  • Syntax error in package.json: ${error.message}`);
    } else if (error instanceof Error) {
      logger.warning(`  • Error reading package.json: ${error.message}`);
    } else {
      logger.warning(`  • Unknown error reading package.json: ${String(error)}`);
    }
  }

  return null;
}

export async function ensurePackageJson(packageManager: IPackageManager): Promise<boolean> {
  const packagePath = fileUtils.joinPaths(process.cwd(), 'package.json');
  if (!fileUtils.exists(packagePath)) {
    logger.warning('No package.json found.');
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: `Initialize a new package.json using ${logger.cyan(`${packageManager.name} ${packageManager.init}`)}?`,
      initial: true,
    });

    if (confirm) {
      try {
        // Validate packageManager.name and packageManager.init
        const allowedNames = [PACKAGE_MANAGERS.NPM, PACKAGE_MANAGERS.YARN, PACKAGE_MANAGERS.PNPM];
        const allowedInits = ['init', 'init -y'];
        const isNameValid = allowedNames.includes(packageManager.name);
        const isInitValid = allowedInits.includes(packageManager.init);
        if (!isNameValid || !isInitValid) {
          logger.error(
            `  ✗ Unsafe or invalid package manager command: '${packageManager.name} ${packageManager.init}'`
          );
          logger.cyan('  Please initialize package.json manually and try again.');

          return false;
        }
        logger.gray(`  $ ${packageManager.name} ${packageManager.init}`);
        execSync(`${packageManager.name} ${packageManager.init}`, { stdio: 'inherit', timeout: 10000 });
        logger.success('  ✓ package.json initialized.');
      } catch (error) {
        logger.error('  ✗ Failed to initialize package.json:');
        logger.error(error instanceof Error ? error.message : String(error));
        logger.cyan('  Please initialize it manually and try again.');

        return false;
      }
    } else {
      logger.error('  Installation cannot proceed without a package.json.');

      return false;
    }
  }
  logger.success('  ✓ package.json is ready.');

  return true;
}
