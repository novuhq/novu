import path from 'node:path';

/**
 * Per-file FIFO mutex used to serialise concurrent `Write` / `Edit`
 * operations issued by the parallel `Task` subagents.
 *
 * Why this exists
 * ---------------
 * The wizard fans out three subagents (Inbox / Workflows+Triggers /
 * Subscribers) so they run concurrently. Every subagent gets its own
 * domain in its prompt, but a project's layout can occasionally pull two
 * branches towards the same file — e.g. an `app/components/header.tsx`
 * that both the Inbox branch wants to mount `<Inbox />` into and the
 * Subscribers branch wants to swap an avatar with a Novu sign-up sync
 * call. Letting both branches `Write` to that file in parallel races the
 * Claude Agent SDK's `old_string` matching and corrupts the file.
 *
 * Instead of blocking the second edit (which forces the model to
 * back-track and pick a different file) we serialise it: the second
 * branch's `acquire` call sits in a FIFO queue keyed by the absolute
 * file path and resolves only after the first branch's matching
 * `release` fires. Both edits eventually land, in dispatch order.
 *
 * Contract
 * --------
 * - `acquire(filePath, toolUseId)` resolves once it is this caller's
 *   turn to hold the lock for `filePath`. Calls for *different* paths
 *   never block each other.
 * - `release(toolUseId)` is idempotent: a no-op if `toolUseId` was
 *   never acquired or has already been released.
 * - Each pending `acquire` arms a safety timeout (default 60s); when it
 *   fires the lock is released forcibly so a stuck or crashed subagent
 *   can never wedge the queue forever.
 *
 * The registry is a plain in-process JS object — there is no
 * cross-process coordination. That's fine: the Claude Agent SDK runs
 * every subagent in the same Node process as the wizard CLI, so all
 * `Write` / `Edit` calls funnel through this one map.
 */
interface ChainEntry {
  /**
   * The tail of the FIFO chain — the promise the next `acquire` should
   * chain after. Updated on every `acquire`.
   */
  tail: Promise<void>;
  /**
   * Number of acquisitions (active + queued) referencing this entry.
   * The entry is removed from {@link chains} the moment this drops to 0
   * via a synchronous `release`, so `size()` reflects the true number
   * of in-flight locks without needing a microtask yield.
   */
  refCount: number;
}

export class FileLockRegistry {
  /**
   * Active per-file chains keyed by the absolute file path. An entry
   * exists exactly when at least one acquire is in-flight or queued
   * for that path.
   */
  private chains = new Map<string, ChainEntry>();

  /**
   * Releaser for an in-flight or pending acquisition, keyed by the
   * SDK's `tool_use_id`. The runner calls `release(toolUseId)` when it
   * sees the matching `tool_result`, regardless of success / failure.
   */
  private releaseByToolId = new Map<string, () => void>();

  async acquire(filePath: string, toolUseId: string, timeoutMs = 60_000): Promise<void> {
    if (!filePath || !toolUseId) return;

    const key = normalise(filePath);
    const existing = this.chains.get(key);
    const previousTail = existing?.tail ?? Promise.resolve();

    let resolveOurs: () => void = () => {};
    const ours = new Promise<void>((resolve) => {
      resolveOurs = resolve;
    });
    const newTail = previousTail.then(() => ours);
    if (existing) {
      existing.tail = newTail;
      existing.refCount += 1;
    } else {
      this.chains.set(key, { tail: newTail, refCount: 1 });
    }

    await previousTail;

    let released = false;
    let timer: NodeJS.Timeout | null = null;

    const finalRelease = () => {
      if (released) return;
      released = true;
      if (timer) clearTimeout(timer);
      this.releaseByToolId.delete(toolUseId);
      resolveOurs();
      const entry = this.chains.get(key);
      if (!entry) return;
      entry.refCount -= 1;
      if (entry.refCount <= 0) {
        this.chains.delete(key);
      }
    };

    timer = setTimeout(finalRelease, timeoutMs);
    /** Don't keep the Node event loop alive just for the safety timer. */
    if (typeof timer.unref === 'function') timer.unref();

    this.releaseByToolId.set(toolUseId, finalRelease);
  }

  release(toolUseId: string): void {
    if (!toolUseId) return;
    const fn = this.releaseByToolId.get(toolUseId);
    if (fn) fn();
  }

  /**
   * Test-only: how many distinct paths currently have an active /
   * queued lock chain. Used by the spec to assert the registry drains
   * after every release.
   */
  size(): number {
    return this.chains.size;
  }
}

function normalise(filePath: string): string {
  return path.resolve(filePath);
}
