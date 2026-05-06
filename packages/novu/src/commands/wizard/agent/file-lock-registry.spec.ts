import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileLockRegistry } from './file-lock-registry';

/**
 * `acquire` is a `Promise<void>` — there's no externally visible "is
 * resolved yet" signal. We use a sentinel race against a microtask to
 * detect whether an acquire already resolved or is still pending. A
 * 0-tick `setImmediate` is enough because the registry chains via
 * `Promise.then`, which always yields to the microtask queue.
 */
async function isResolved(promise: Promise<unknown>): Promise<boolean> {
  const sentinel = Symbol('pending');

  return Promise.race([promise.then(() => true), new Promise<typeof sentinel>((r) => setImmediate(() => r(sentinel)))])
    .then((value) => value !== sentinel)
    .catch(() => true);
}

describe('FileLockRegistry', () => {
  it('serialises concurrent acquires for the same file in FIFO order', async () => {
    const registry = new FileLockRegistry();
    const filePath = '/proj/app/layout.tsx';

    const a = registry.acquire(filePath, 'tool-A');
    const b = registry.acquire(filePath, 'tool-B');
    const c = registry.acquire(filePath, 'tool-C');

    await a;
    expect(await isResolved(b)).toBe(false);
    expect(await isResolved(c)).toBe(false);

    registry.release('tool-A');
    await b;
    expect(await isResolved(c)).toBe(false);

    registry.release('tool-B');
    await c;

    registry.release('tool-C');
    expect(registry.size()).toBe(0);
  });

  it('does not block acquires for distinct files', async () => {
    const registry = new FileLockRegistry();

    const left = registry.acquire('/proj/app/layout.tsx', 'tool-1');
    const right = registry.acquire('/proj/app/api/checkout/route.ts', 'tool-2');

    await Promise.all([left, right]);

    registry.release('tool-1');
    registry.release('tool-2');
    expect(registry.size()).toBe(0);
  });

  it('treats path variants of the same file as the same lock', async () => {
    const registry = new FileLockRegistry();
    const cwd = process.cwd();
    const absolute = path.join(cwd, 'app', 'layout.tsx');
    const relative = './app/layout.tsx';

    const a = registry.acquire(absolute, 'tool-A');
    const b = registry.acquire(relative, 'tool-B');

    await a;
    expect(await isResolved(b)).toBe(false);

    registry.release('tool-A');
    await b;
    registry.release('tool-B');
    expect(registry.size()).toBe(0);
  });

  it('release is idempotent and tolerates unknown tool ids', async () => {
    const registry = new FileLockRegistry();
    const filePath = '/proj/app/page.tsx';

    await registry.acquire(filePath, 'tool-A');
    registry.release('tool-A');
    registry.release('tool-A');
    registry.release('never-acquired');

    await registry.acquire(filePath, 'tool-B');
    registry.release('tool-B');
    expect(registry.size()).toBe(0);
  });

  it('forces release after the safety timeout so a stuck holder cannot wedge the queue', async () => {
    const registry = new FileLockRegistry();
    const filePath = '/proj/app/header.tsx';

    await registry.acquire(filePath, 'tool-A', 20);
    const queued = registry.acquire(filePath, 'tool-B', 1_000);

    expect(await isResolved(queued)).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 40));

    await queued;
    registry.release('tool-B');
    expect(registry.size()).toBe(0);
  });

  it('drains the chain map once every lock has been released', async () => {
    const registry = new FileLockRegistry();
    const filePath = '/proj/app/page.tsx';

    await registry.acquire(filePath, 'tool-A');
    const queued = registry.acquire(filePath, 'tool-B');

    registry.release('tool-A');
    await queued;
    registry.release('tool-B');

    /** Yield once so the `finally` cleanup can run. */
    await new Promise((resolve) => setImmediate(resolve));
    expect(registry.size()).toBe(0);
  });

  it('ignores empty filePath / toolUseId', async () => {
    const registry = new FileLockRegistry();
    await registry.acquire('', 'tool');
    await registry.acquire('/proj/app/page.tsx', '');
    expect(registry.size()).toBe(0);
  });
});
