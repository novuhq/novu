import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { homedir, hostname } from 'node:os';
import { type CliConfig, saveConfig } from '../config';

/** Matches the API's rule for a computer id: 16–64 of `[A-Za-z0-9_-]`. */
const COMPUTER_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** The API takes a computer name of 1–64 characters and a project of at most 200. */
const COMPUTER_NAME_MAX = 64;
const PROJECT_MAX = 200;

/**
 * This computer's id for the lease: made the first time `listen` runs here and kept in the config, so the API
 * knows the computer again after a restart, a new connection or a new key.
 */
export function ensureComputerId(config: CliConfig): string {
  if (config.computerId && COMPUTER_ID_PATTERN.test(config.computerId)) {
    return config.computerId;
  }

  const computerId = `cmp_${randomBytes(18).toString('base64url')}`;
  saveConfig({ ...config, computerId });

  return computerId;
}

/** The computer as the operator knows it: its name on macOS ("Ada’s MacBook Pro"), its host name elsewhere. */
export function computerName(): string {
  if (process.platform === 'darwin') {
    const ran = spawnSync('scutil', ['--get', 'ComputerName'], { encoding: 'utf8', timeout: 5000 });
    const name = ran.status === 0 ? ran.stdout.trim() : '';
    if (name) {
      return name.slice(0, COMPUTER_NAME_MAX);
    }
  }

  return (hostname().replace(/\.local$/i, '') || 'this computer').slice(0, COMPUTER_NAME_MAX);
}

/** `~/projects/app/x.ts` for a path in the home folder. */
export function shortPath(path: string): string {
  const home = homedir();

  return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** The project as the operator reads it, e.g. "~/projects/app", within what the API keeps. */
export function projectLabel(project: string): string {
  const label = shortPath(project);

  return label.length > PROJECT_MAX ? `…${label.slice(label.length - PROJECT_MAX + 1)}` : label;
}
