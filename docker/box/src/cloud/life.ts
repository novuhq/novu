// A box's phase, stored once (storage `life`) with what goes with it, and the answers that depend on it.

import type { BoxStatus } from '../shared/contracts.ts';

export interface Note {
  readonly at: string;
  readonly message: string;
}

export interface Snapshot {
  readonly id: string;
  readonly size?: number;
  readonly name?: string;
}

// A `down` that waits to save (a bake or apply runs), or tries again after a failed save.
export interface Down {
  readonly tries: number;
}

export type Life =
  // No container and no snapshot: `up` bakes. `error`: why the bake, or the run before it, ended.
  | { readonly phase: 'new'; readonly since: number; readonly error: Note | null }
  // The container bakes its first /data; `running` once /data/.baked.json is there.
  | { readonly phase: 'baking'; readonly since: number; readonly down: Down | null }
  | {
      readonly phase: 'running';
      readonly since: number;
      // null until its first save.
      readonly snapshot: Snapshot | null;
      readonly down: Down | null;
      readonly saveFailed: Note | null;
    }
  | Saving
  // Stopped with its snapshot: the next request wakes it.
  | { readonly phase: 'asleep'; readonly since: number; readonly snapshot: Snapshot; readonly error: Note | null }
  // Its snapshot couldn't be restored: `up` bakes again.
  | { readonly phase: 'lost'; readonly since: number; readonly lost: Note & { readonly id: string } };

// save() stops the processes and snapshots the disk; until it's done, requests get 503. `before`: the phase it
// goes back to if the save fails.
export interface Saving {
  readonly phase: 'saving';
  readonly since: number;
  readonly before: 'baking' | 'running';
  readonly snapshot: Snapshot | null;
  readonly down: Down | null;
}

export async function lifeOf(storage: DurableObjectStorage): Promise<Life> {
  const life = await storage.get<Life | LegacyLife>('life');
  if (!life) return { phase: 'new', since: Date.now(), error: null };

  return 'saveTries' in life ? upgraded(life) : life;
}

// What boxes stored before `down` and `saveFailed` (October 2026): `saveTries`, and running's `error` for a failed
// save; the other phases are as they were. Delete this once every box that ran then has been saved again.
type LegacyLife =
  | { readonly phase: 'baking'; readonly since: number; readonly saveTries: number }
  | {
      readonly phase: 'running';
      readonly since: number;
      readonly snapshot: Snapshot | null;
      readonly saveTries: number;
      readonly error: Note | null;
    }
  | (Omit<Saving, 'down'> & { readonly saveTries: number });

function upgraded(life: LegacyLife): Life {
  const { since } = life;
  const down = life.saveTries ? { tries: life.saveTries } : null;
  switch (life.phase) {
    case 'baking':
      return { phase: 'baking', since, down };
    case 'running':
      return { phase: 'running', since, snapshot: life.snapshot, down, saveFailed: life.error };
    case 'saving':
      return { phase: 'saving', since, before: life.before, snapshot: life.snapshot, down };
  }
}

export async function setLife(storage: DurableObjectStorage, life: Life): Promise<Life> {
  await storage.put('life', life);

  return life;
}

export function alarmIn(storage: DurableObjectStorage, ms: number): Promise<void> {
  return storage.setAlarm(Date.now() + ms);
}

export function note(message: string): Note {
  return { at: new Date().toISOString(), message };
}

export function snapshotOf(life: Life): Snapshot | null {
  switch (life.phase) {
    case 'running':
    case 'saving':
    case 'asleep':
      return life.snapshot;
    case 'new':
    case 'baking':
    case 'lost':
      return null;
  }
}

export function downOf(life: Life): Down | null {
  switch (life.phase) {
    case 'baking':
    case 'running':
    case 'saving':
      return life.down;
    case 'new':
    case 'asleep':
    case 'lost':
      return null;
  }
}

export function withDown(life: Life, down: Down | null): Life {
  switch (life.phase) {
    case 'baking':
    case 'running':
    case 'saving':
      return { ...life, down };
    case 'new':
    case 'asleep':
    case 'lost':
      return life;
  }
}

// What a box that stopped without this object stopping it becomes: asleep on its snapshot, or new without one.
export function stopped(life: Life, why: string): Life {
  const snapshot = snapshotOf(life);
  const error = note(why);

  return snapshot
    ? { phase: 'asleep', since: Date.now(), snapshot, error }
    : { phase: 'new', since: Date.now(), error };
}

// The phase before a failed save, with why it failed.
export function unsaved(life: Saving, error: Note): Life {
  const { down, snapshot } = life;

  return life.before === 'baking'
    ? { phase: 'baking', since: Date.now(), down }
    : { phase: 'running', since: Date.now(), snapshot, down, saveFailed: error };
}

// GET /__box/state, without what the Slack part adds.
export function status(life: Life, running: boolean, lastActivity: number, origin: string | null): BoxStatus {
  const snapshot = snapshotOf(life);
  const gigabytes = snapshot?.size ? +(snapshot.size / 1e9).toFixed(2) : null;
  const common = {
    since: new Date(life.since).toISOString(),
    running,
    snapshot: snapshot ? { id: snapshot.id, ...(snapshot.name && { name: snapshot.name }), gigabytes } : null,
    lastActivity: new Date(lastActivity).toISOString(),
    origin,
  };
  switch (life.phase) {
    case 'new':
    case 'asleep':
      return { ...common, phase: life.phase, error: life.error };
    case 'baking':
    case 'saving':
      return { ...common, phase: life.phase, down: life.down };
    case 'running':
      return { ...common, phase: life.phase, down: life.down, saveFailed: life.saveFailed };
    case 'lost':
      return { ...common, phase: life.phase, lost: life.lost };
  }
}

// While the box saves (3 to 6 minutes), for browsers and for the CLI and CI, which wait and ask again.
export function saving(request: Request): Response {
  const headers = { 'Retry-After': '30', 'X-Box-Phase': 'saving' };
  if (request.headers.get('Accept')?.includes('text/html'))
    return new Response(
      '<!doctype html><meta http-equiv="refresh" content="30"><title>Saving</title><p>This Novu Box is saving to its snapshot (3 to 6 minutes), then it wakes again. The page reloads by itself.</p>',
      { status: 503, headers: { ...headers, 'Content-Type': 'text/html' } }
    );

  return new Response('the box is saving to its snapshot; ask again in 30 s\n', { status: 503, headers });
}

export function waking(request: Request): Response {
  if (request.headers.get('Accept')?.includes('text/html'))
    return new Response(
      '<!doctype html><meta http-equiv="refresh" content="5"><title>Waking up</title><p>This Novu Box is waking up (about 35 s). The page reloads by itself.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html', 'Retry-After': '5' } }
    );

  return new Response('the box is waking up\n', { status: 503, headers: { 'Retry-After': '10' } });
}

export function json(body: object, status = 200): Response {
  return new Response(`${JSON.stringify(body, null, 2)}\n`, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function text(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });
}
