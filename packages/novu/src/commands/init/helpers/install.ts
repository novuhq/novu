import spawn from 'cross-spawn';
import { yellow } from 'picocolors';
import type { PackageManager } from './get-pkg-manager';

/**
 * Spawn a package manager installation based on user preference.
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export async function install(
  /** Indicate which package manager to use. */
  packageManager: PackageManager,
  /** Indicate whether there is an active Internet connection.*/
  isOnline: boolean,
  /**
   * When true, pipe stdout/stderr instead of inheriting them so the caller
   * controls whether the output is displayed. On failure, captured stderr is
   * included in the thrown Error so the cause is not lost.
   */
  silent = false
): Promise<void> {
  const args: string[] = ['install'];
  if (!isOnline) {
    if (!silent) {
      console.log(yellow('You appear to be offline.\nFalling back to the local cache.'));
    }
    args.push('--offline');
  }

  return new Promise((resolve, reject) => {
    const stdio: import('child_process').StdioOptions = silent ? ['ignore', 'pipe', 'pipe'] : 'inherit';
    const child = spawn(packageManager, args, {
      stdio,
      env: {
        ...process.env,
        ADBLOCK: '1',
        // we set NODE_ENV to development as pnpm skips dev dependencies when production
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1',
      },
    });

    const chunks: Buffer[] = [];
    if (silent && child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => chunks.push(chunk));
    }

    child.on('close', (code) => {
      if (code !== 0) {
        const detail = chunks.length > 0 ? `\n${Buffer.concat(chunks).toString().trim()}` : '';
        reject(new Error(`\`${packageManager} ${args.join(' ')}\` exited with code ${code ?? 1}${detail}`));
        return;
      }
      resolve();
    });
  });
}
