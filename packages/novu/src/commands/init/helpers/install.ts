import spawn from 'cross-spawn';
import { yellow } from 'picocolors';
import type { PackageManager } from './get-pkg-manager';

type SpawnInstallOptions = {
  silent: boolean;
  cwd?: string;
};

function buildInstallArgs(packageManager: PackageManager, packages: string[], isOnline: boolean): string[] {
  if (packageManager === 'npm') {
    const args = ['install', ...packages, '--no-workspaces'];
    if (!isOnline) {
      args.push('--offline');
    }

    return args;
  }

  // yarn/pnpm/bun use `add` only when installing specific packages; with an
  // empty list they need `install` to install from the generated package.json.
  const command = packages.length > 0 ? 'add' : 'install';
  const args = [command, ...packages];
  if (!isOnline && packageManager === 'yarn') {
    args.push('--offline');
  }

  return args;
}

function spawnInstall(packageManager: PackageManager, args: string[], options: SpawnInstallOptions): Promise<void> {
  const { silent, cwd } = options;

  return new Promise((resolve, reject) => {
    const stdio: import('child_process').StdioOptions = silent ? ['ignore', 'pipe', 'pipe'] : 'inherit';
    const child = spawn(packageManager, args, {
      stdio,
      cwd,
      env: {
        ...process.env,
        ADBLOCK: '1',
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });

    const chunks: Buffer[] = [];
    if (silent && child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
    }

    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      process.off('SIGINT', onSigInt);
      process.off('SIGTERM', onSigTerm);
      fn();
    };

    const onSigInt = () => {
      child.kill('SIGINT');
      process.exitCode = 130;
      settle(() => reject(new Error('Installation cancelled.')));
    };

    const onSigTerm = () => {
      child.kill('SIGTERM');
      process.exitCode = 143;
      settle(() => reject(new Error('Installation terminated.')));
    };

    process.on('SIGINT', onSigInt);
    process.on('SIGTERM', onSigTerm);

    child.on('error', (error) => {
      settle(() => reject(error));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const detail = chunks.length > 0 ? `\n${Buffer.concat(chunks).toString().trim()}` : '';
        settle(() =>
          reject(new Error(`\`${packageManager} ${args.join(' ')}\` exited with code ${code ?? 1}${detail}`))
        );
        return;
      }
      settle(resolve);
    });
  });
}

/**
 * Spawn a package manager installation based on user preference.
 */
export async function install(
  packageManager: PackageManager,
  isOnline: boolean,
  silent = false,
  cwd?: string
): Promise<void> {
  if (!isOnline && !silent) {
    console.log(yellow('You appear to be offline.\nFalling back to the local cache.'));
  }

  const args = buildInstallArgs(packageManager, [], isOnline);

  return spawnInstall(packageManager, args, { silent, cwd });
}

/** Install one or more packages into a target project directory. */
export async function installPackages(
  packageManager: PackageManager,
  packages: string[],
  options: { isOnline?: boolean; silent?: boolean; cwd?: string } = {}
): Promise<void> {
  const isOnline = options.isOnline ?? true;
  const silent = options.silent ?? false;

  if (!isOnline && !silent) {
    console.log(yellow('You appear to be offline.\nFalling back to the local cache.'));
  }

  const args = buildInstallArgs(packageManager, packages, isOnline);

  return spawnInstall(packageManager, args, { silent: silent, cwd: options.cwd });
}
