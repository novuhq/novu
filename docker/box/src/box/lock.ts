import fs from 'node:fs';
import { log } from '../node/main.ts';
import { fromJson, LockHolder } from '../shared/contracts.ts';
import { LOCK, REPO, RUN } from './paths.ts';

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);

    return true;
  } catch {
    return false;
  }
}

export function lockHolder(): LockHolder | null {
  const holder = fs.existsSync(LOCK) ? fromJson(LockHolder).safeParse(fs.readFileSync(LOCK, 'utf8')).data : undefined;

  return holder?.pid && isAlive(holder.pid) ? holder : null;
}

const DEAD_HOLDERS_GIT_LOCK = `${REPO}/.git/index.lock`;

function taken(holder: LockHolder | null): Error {
  return new Error(
    holder
      ? `another ${holder.command} is running (pid ${holder.pid}); wait for it to finish`
      : 'another bake or apply took the lock first; try again'
  );
}

function take(command: string): boolean {
  const own = `${LOCK}.${process.pid}`;
  fs.writeFileSync(own, JSON.stringify({ pid: process.pid, command, at: new Date().toISOString() }));
  try {
    fs.linkSync(own, LOCK);

    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') return false;
    throw error;
  } finally {
    fs.rmSync(own, { force: true });
  }
}

function acquire(command: string): void {
  fs.mkdirSync(RUN, { recursive: true });
  if (take(command)) return;
  const holder = lockHolder();
  if (holder) throw taken(holder);
  log('taking over the lock of a bake or apply that is gone');
  fs.rmSync(LOCK, { force: true });
  fs.rmSync(DEAD_HOLDERS_GIT_LOCK, { force: true });
  if (!take(command)) throw taken(lockHolder());
}

export async function withLock<T>(command: 'bake' | 'apply', work: () => Promise<T>): Promise<T> {
  acquire(command);
  try {
    return await work();
  } finally {
    fs.rmSync(LOCK, { force: true });
  }
}
