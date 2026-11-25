import fs from 'node:fs';
import { log } from '../node/main.ts';
import { FlagOverrides } from '../shared/contracts.ts';
import { prepareDashboard } from './build.ts';
import { withLock } from './lock.ts';
import { API_HEALTH, FLAGS, FLAGS_APPLIED, WORKER_HEALTH } from './paths.ts';
import { readJson, step, waitForHttp } from './runtime.ts';
import { pc } from './supervisor.ts';

// Flags this box forces whatever LaunchDarkly serves. They live in /data, so they outlast applies, syncs and sleep,
// and a box started from base has none. The API and the worker read them when they start
// (FEATURE_FLAG_OVERRIDES in process-compose.yaml), the dashboard when its index.html is written.
export function readFlags(): FlagOverrides {
  return readJson(FLAGS, FlagOverrides) ?? {};
}

// `value` undefined removes the override, so the flag comes from LaunchDarkly again.
export async function setFlag(key: string, value: unknown): Promise<void> {
  await withLock('flag', async () => {
    const { [key]: _old, ...rest } = readFlags();
    await writeFlags(value === undefined ? rest : { ...rest, [key]: value });
  });
}

// Exactly these flags on, every other one from LaunchDarkly: a PR's `Box flags:` line, on every apply.
export async function onlyFlags(keys: ReadonlyArray<string>): Promise<void> {
  await withLock('flag', () => writeFlags(Object.fromEntries(keys.map((key) => [key, true]))));
}

async function writeFlags(flags: FlagOverrides): Promise<void> {
  for (const key of Object.keys(flags))
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new Error(`${key}: a flag key is like IS_SOMETHING_ENABLED`);
  const text = JSON.stringify(flags, null, 2);
  fs.writeFileSync(FLAGS, text);
  // Compared with what the apps last restarted with, not with the old FLAGS: a `flag` stopped after writing FLAGS
  // but before the restart is finished by the next one.
  const applied = fs.existsSync(FLAGS_APPLIED) ? fs.readFileSync(FLAGS_APPLIED, 'utf8') : JSON.stringify({}, null, 2);
  if (text === applied) return log(`forced flags: ${JSON.stringify(flags)}`);
  prepareDashboard();
  await step('restart api worker', async () => {
    await pc(['process', 'restart', 'api']);
    await pc(['process', 'restart', 'worker']);
  });
  await waitForHttp(API_HEALTH, 300);
  await waitForHttp(WORKER_HEALTH, 300);
  fs.writeFileSync(FLAGS_APPLIED, text);
  log(`forced flags: ${JSON.stringify(flags)}`);
}
