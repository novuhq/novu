// Node helpers every Novu Box script shares, in the box (lib.mjs) and on your machine or in CI (cli.mjs, ci.mjs,
// cloud/target.mjs). No imports of our own modules and no side effects.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const MAX_BUFFER = 256 * 1024 * 1024;

// Runs a command with its output on ours; throws unless it exits 0.
export function run(cmd, args, options = {}) {
  const code = exitCode(cmd, args, options);
  if (code !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${code}`);
}

// Runs a command with its output on ours and returns its exit code, for commands whose code is the answer.
export function exitCode(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;

  return result.status ?? 1;
}

// A command's stdout, trimmed; throws with its stderr unless it exits 0. `combined`: stdout and stderr together.
export function output(cmd, args, { combined = false, ...options } = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: MAX_BUFFER, ...options });
  if (result.error) throw result.error;
  const { stdout, stderr } = result;
  if (result.status !== 0)
    throw new Error(`${cmd} ${args.join(' ')} failed: ${(stderr.trim() || stdout.trim()).slice(-600)}`);

  return (combined ? `${stdout}\n${stderr}` : stdout).trim();
}

// The caller's GitHub token: GITHUB_TOKEN, else `gh auth token`.
export function githubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  const result = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('needs GITHUB_TOKEN or a signed-in `gh` (gh auth login)');

  return result.stdout.trim();
}

// `KEY=value` lines of an env file (config/box.env, docker/box/.env, ~/.config/novu-box/*.env); the rest is ignored.
export function readEnvFile(file) {
  const entries = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter((match) => match !== null);

  return Object.fromEntries(entries.map((match) => [match[1], match[2]]));
}
