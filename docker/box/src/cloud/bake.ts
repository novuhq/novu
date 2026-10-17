
import { messageOf } from '../shared/errors.ts';
import { BOX_CLI, detached } from '../shared/names.ts';
import { boxState, output, run, type Shell } from './container.ts';
import { type Life, note, setLife } from './life.ts';

const LOG = '/data/logs/up.log';

export async function startBake(shell: Shell, storage: DurableObjectStorage, ref: string, github?: string) {
  await setLife(storage, { phase: 'baking', since: Date.now(), down: null });
  await (await run(shell, detached([...BOX_CLI, 'bake', ref, '--start'], LOG), { github })).exitCode;
}

export async function checkBake(shell: Shell, storage: DurableObjectStorage, life: Life): Promise<Life> {
  if (life.phase !== 'baking' || !shell.container.running || Date.now() - life.since < 60_000) return life;
  const state = await boxState(shell, 'the bake check').catch((error: unknown) => {
    console.log(`${messageOf(error)}; the bake counts as running`);

    return null;
  });
  if (state?.baked)
    return setLife(storage, {
      phase: 'running',
      since: Date.now(),
      snapshot: null,
      down: life.down,
      saveFailed: null,
    });
  if (!state || state.lock) return life;
  const tail = await output(shell, ['tail', '-n', '5', LOG], 'the bake log').catch(() => '');
  await shell.container.destroy('the bake failed');

  return setLife(storage, { phase: 'new', since: Date.now(), error: note(`the bake failed: ${tail.slice(-600)}`) });
}
