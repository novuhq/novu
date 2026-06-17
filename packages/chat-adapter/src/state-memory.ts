import type { Lock, QueueEntry, StateAdapter } from 'chat';

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

interface LockState {
  token: string;
  expiresAt: number;
}

let lockCounter = 0;

function nextToken(): string {
  lockCounter += 1;

  return `lock-${lockCounter}-${Date.now()}`;
}

/**
 * Zero-dependency, in-process `StateAdapter` for the Novu Chat adapter.
 *
 * Safe for single-instance deployments. For multi-instance bridges (horizontally
 * scaled, serverless with >1 warm instance) pass a shared state adapter
 * (e.g. `@chat-adapter/state-ioredis`) to `new Chat({ state })` instead — locks
 * and dedup here are local to one process.
 */
export class InMemoryStateAdapter implements StateAdapter {
  private readonly store = new Map<string, Entry>();
  private readonly lists = new Map<string, unknown[]>();
  private readonly subscriptions = new Set<string>();
  private readonly locks = new Map<string, LockState>();
  private readonly queues = new Map<string, QueueEntry[]>();

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== null && entry.expiresAt <= Date.now();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (this.isExpired(entry)) {
      this.store.delete(key);

      return null;
    }

    return entry.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async setIfNotExists(key: string, value: unknown, ttlMs?: number): Promise<boolean> {
    const existing = this.store.get(key);
    if (existing && !this.isExpired(existing)) {
      return false;
    }
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });

    return true;
  }

  async appendToList(key: string, value: unknown, options?: { maxLength?: number; ttlMs?: number }): Promise<void> {
    const list = this.lists.get(key) ?? [];
    list.push(value);
    if (options?.maxLength && list.length > options.maxLength) {
      list.splice(0, list.length - options.maxLength);
    }
    this.lists.set(key, list);
  }

  async getList<T = unknown>(key: string): Promise<T[]> {
    return [...((this.lists.get(key) as T[]) ?? [])];
  }

  async isSubscribed(threadId: string): Promise<boolean> {
    return this.subscriptions.has(threadId);
  }

  async subscribe(threadId: string): Promise<void> {
    this.subscriptions.add(threadId);
  }

  async unsubscribe(threadId: string): Promise<void> {
    this.subscriptions.delete(threadId);
  }

  async acquireLock(threadId: string, ttlMs: number): Promise<Lock | null> {
    const existing = this.locks.get(threadId);
    if (existing && existing.expiresAt > Date.now()) {
      return null;
    }
    const token = nextToken();
    const expiresAt = Date.now() + ttlMs;
    this.locks.set(threadId, { token, expiresAt });

    return { threadId, token, expiresAt };
  }

  async releaseLock(lock: Lock): Promise<void> {
    const current = this.locks.get(lock.threadId);
    if (current && current.token === lock.token) {
      this.locks.delete(lock.threadId);
    }
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    const current = this.locks.get(lock.threadId);
    if (!current || current.token !== lock.token) {
      return false;
    }
    current.expiresAt = Date.now() + ttlMs;

    return true;
  }

  async forceReleaseLock(threadId: string): Promise<void> {
    this.locks.delete(threadId);
  }

  async enqueue(threadId: string, entry: QueueEntry, maxSize: number): Promise<number> {
    const queue = this.queues.get(threadId) ?? [];
    queue.push(entry);
    if (queue.length > maxSize) {
      queue.splice(0, queue.length - maxSize);
    }
    this.queues.set(threadId, queue);

    return queue.length;
  }

  async dequeue(threadId: string): Promise<QueueEntry | null> {
    const queue = this.queues.get(threadId);
    if (!queue || queue.length === 0) {
      return null;
    }

    return queue.shift() ?? null;
  }

  async queueDepth(threadId: string): Promise<number> {
    return this.queues.get(threadId)?.length ?? 0;
  }
}

/** Create a zero-dependency in-memory state adapter. See {@link InMemoryStateAdapter}. */
export function createMemoryState(): StateAdapter {
  return new InMemoryStateAdapter();
}
