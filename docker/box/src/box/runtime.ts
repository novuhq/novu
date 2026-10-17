// What the box's commands share: the box's environment, commands run with it in the checkout, timed steps, health
// checks, and the JSON files under /data and in the checkout.

import fs from 'node:fs';
import * as z from 'zod';
import { log } from '../node/main.ts';
import { poll } from '../node/poll.ts';
import * as proc from '../node/process.ts';
import { decode } from '../shared/contracts.ts';
import { parseEnvFile } from '../shared/env-file.ts';
import { BOX, BULLMQ_PRO, DATA, REPO } from './paths.ts';

// The environment every command in the box gets: config/box.env, then the container's own. GITHUB_TOKEN stays out:
// the box runs PR code (install scripts, builds, the apps), and every child gets this environment. main.ts passes the
// token only to the git calls that need it and the CI lookup. Steps add to `vars` as the box learns them (the CA
// bundle, the S3 keys, Stripe's signing secret, BullMQ Pro).
export const vars: Record<string, string> = loadEnv();

function loadEnv(): Record<string, string> {
  const defaults = parseEnvFile(fs.readFileSync(`${BOX}/config/box.env`, 'utf8'));
  // Production switches BullMQ to Pro (job groups) and turns off TTL indexes with this flag.
  if (fs.existsSync(`${BULLMQ_PRO}/node_modules/@taskforcesh/bullmq-pro`)) defaults.NOVU_MANAGED_SERVICE = 'true';
  const inherited = Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[0] !== 'GITHUB_TOKEN' && entry[1] !== undefined
  );

  return { ...defaults, ...Object.fromEntries(inherited) };
}

// Commands run in the checkout with the box's environment unless told otherwise.
const inBox = (options: proc.RunOptions = {}): proc.RunOptions => ({ cwd: REPO, env: vars, ...options });
export const run = (cmd: string, args: ReadonlyArray<string>, options?: proc.RunOptions) =>
  proc.run(cmd, args, inBox(options));
export const exitCode = (cmd: string, args: ReadonlyArray<string>, options?: proc.RunOptions) =>
  proc.exitCode(cmd, args, inBox(options));
export const capture = (cmd: string, args: ReadonlyArray<string>, options?: proc.RunOptions) =>
  proc.capture(cmd, args, inBox(options));
export const output = (cmd: string, args: ReadonlyArray<string>, options?: proc.RunOptions) =>
  proc.output(cmd, args, inBox(options));

// Logs a step and how long it took, also into /data/logs/timings.jsonl.
export async function step<T>(name: string, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  log(`${name}...`);
  const result = await work();
  const seconds = (Date.now() - started) / 1000;
  appendTiming(name, seconds);
  log(`${name} done in ${seconds.toFixed(1)}s`);

  return result;
}

export function appendTiming(step: string, seconds: number, command = process.argv[2]): void {
  fs.mkdirSync(`${DATA}/logs`, { recursive: true });
  fs.appendFileSync(
    `${DATA}/logs/timings.jsonl`,
    `${JSON.stringify({ at: new Date().toISOString(), command, step, seconds })}\n`
  );
}

// The status `url` answers, or 0 when it doesn't (within 5 s).
export async function httpStatus(url: string): Promise<number> {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(5000) })).status;
  } catch {
    return 0;
  }
}

export async function waitForHttp(url: string, seconds: number, signal?: AbortSignal): Promise<void> {
  await poll(
    async () => {
      const status = await httpStatus(url);

      return status >= 200 && status < 300;
    },
    { timeoutMs: seconds * 1000, what: `${url} not healthy`, signal }
  );
}

// A JSON file under /data or in the checkout, with the fields the box reads; null when it isn't there.
export function readJson<T>(file: string, schema: z.ZodType<T>): T | null {
  if (!fs.existsSync(file)) return null;
  return decode(schema, fs.readFileSync(file, 'utf8'), `${file} isn't what the box expects`);
}
