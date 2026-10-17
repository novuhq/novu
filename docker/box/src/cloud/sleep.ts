
import type { StateAnswer } from '../shared/contracts.ts';
import { messageOf } from '../shared/errors.ts';
import { BOX_CLI } from '../shared/names.ts';
import { boxState, exitCode, type Shell, withTimeout } from './container.ts';
import type { HostEnv } from './env.ts';
import {
  alarmIn,
  downOf,
  type Life,
  lifeOf,
  note,
  type Saving,
  type Snapshot,
  setLife,
  snapshotOf,
  unsaved,
  withDown,
} from './life.ts';

export const ALARM_MS = 60 * 1000;
// Past the longest save seen (over 6 minutes for a big disk): while the box saves, its alarm and inactivity timeout are
// set this far ahead, so neither stops it half saved.
export const SAVE_MS = 20 * 60 * 1000;
// A save runs in an alarm, which gets 15 minutes; a resume that no longer fits in them waits for the next alarm.
const SAVE_BUDGET_MS = 14 * 60 * 1000;
const QUIESCE_MS = 5 * 60 * 1000;
const SNAPSHOT_MS = 7 * 60 * 1000;
const RESUME_MS = 10 * 60 * 1000;

// The backstop, Cloudflare's inactivity timeout, is shorter than IDLE_MINUTES, as in its autosave recipe: each alarm
// renews it, so it only stops the container (without a snapshot) when the alarms stop.
export const idleMs = (env: HostEnv) => {
  const minutes = Number(env.IDLE_MINUTES);

  return (minutes > 0 ? minutes : 60) * 60 * 1000;
};
export const backstopMs = (env: HostEnv) => Math.min(10 * 60 * 1000, idleMs(env) / 2);

export interface Sleeper {
  readonly shell: Shell;
  readonly storage: DurableObjectStorage;
  readonly env: HostEnv;
  readonly destroyed: () => boolean;
}

export async function save(box: Sleeper, reason: string): Promise<StateAnswer> {
  const { shell, storage, destroyed } = box;
  const { container } = shell;
  const write = async (life: Life) => !destroyed() && Boolean(await setLife(storage, life));
  const writeBack = async (life: Life) => write(withDown(life, downOf(await lifeOf(storage))));
  const started = Date.now();
  const step = (what: string) =>
    console.log(`sleep(${reason}) ${what} at ${Math.round((Date.now() - started) / 1000)}s`);
  // Kept set, not deleted: deleting the alarm inside alarm() can cancel its retry.
  const keepRunning = async () => {
    if (destroyed()) return;
    await container.setInactivityTimeout(backstopMs(box.env));
    await alarmIn(storage, ALARM_MS);
  };
  let quiesced = false;
  let current: Saving | null = null;
  try {
    const before = await lifeOf(storage);
    if (before.phase !== 'running' && before.phase !== 'baking') return { state: before.phase };
    current = {
      phase: 'saving',
      since: Date.now(),
      before: before.phase,
      snapshot: snapshotOf(before),
      down: before.down,
    };
    await setLife(storage, current);
    await alarmIn(storage, SAVE_MS);
    await container.setInactivityTimeout(SAVE_MS);
    const state = await boxState(shell, 'the state check');
    if (state.lock) {
      await writeBack(before);
      await keepRunning();

      return { state: 'busy' };
    }
    if (!state.baked) {
      await container.destroy(reason);
      await write({
        phase: 'new',
        since: Date.now(),
        error: note('the bake never finished; stopped without a snapshot'),
      });
      step('stopped');

      return { state: 'stopped without a snapshot (never baked)' };
    }
    quiesced = true;
    const snapshot = await snapshotOfBox(shell, step);
    if (!(await write({ phase: 'asleep', since: Date.now(), snapshot, error: null }))) return { state: 'deleted' };
    await container.destroy(reason);
    step('stopped');

    return { state: 'asleep', snapshot: snapshot.id };
  } catch (error) {
    if (destroyed()) return { state: 'deleted' };
    step(`failed, the box keeps running: ${messageOf(error)}`);
    const left = started + SAVE_BUDGET_MS - Date.now();
    // Too little of the alarm's 15 minutes is left for a whole resume: the box stays `saving` (503) and the next
    // alarm resumes it (recoverSave).
    if (container.running && quiesced && left < RESUME_MS) {
      await alarmIn(storage, 1000);
      throw error;
    }
    if (container.running && quiesced) step(`resume exited ${await resume(shell, left)}`);
    if (current) await writeBack(unsaved(current, note(messageOf(error))));
    if (container.running) await keepRunning();
    throw error;
  }
}

async function snapshotOfBox(shell: Shell, step: (what: string) => void): Promise<Snapshot> {
  const quiesce = await exitCode(shell, [...BOX_CLI, 'quiesce'], QUIESCE_MS, 'quiesce');
  step(`quiesce exited ${quiesce}`);
  if (quiesce !== 0) throw new Error(`quiesce exited ${quiesce}`);
  if ((await boxState(shell, 'the state check')).lock) throw new Error('a bake or apply started as the save began');
  const snapshot = await withTimeout(shell.container.snapshotContainer({ name: 'box' }), SNAPSHOT_MS, 'the snapshot');
  if (!snapshot?.id) throw new Error('the snapshot came back without an id');
  step(`snapshot ${snapshot.id} (${snapshot.size ?? '?'} bytes)`);

  return snapshot;
}

export async function recoverSave(shell: Shell, storage: DurableObjectStorage, life: Saving): Promise<Life> {
  console.log('the save ended without resuming the box; resuming it');
  const resumed = await resume(shell, RESUME_MS);

  return setLife(storage, unsaved(life, note(`the save ended without resuming the box; resume exited ${resumed}`)));
}

function resume(shell: Shell, timeoutMs: number): Promise<number | string> {
  return exitCode(shell, [...BOX_CLI, 'resume'], timeoutMs, 'resume').catch(messageOf);
}
