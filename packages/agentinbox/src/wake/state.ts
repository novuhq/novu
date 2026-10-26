import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { WakeHostId, WakeMessage } from '../api/wake';
import { type CliConfig, configPath } from '../config';

/** Where wake keeps what it needs between runs: a `wake` folder next to the config. */
export function wakeDir(): string {
  return join(dirname(configPath()), 'wake');
}

/** What the background program prints: what it woke, what it asked, and why it stopped. */
export function logPath(): string {
  return join(wakeDir(), 'wake.log');
}

function statePath(): string {
  return join(wakeDir(), 'state.json');
}

export interface WakeLimits {
  /** How many runs may start in an hour. */
  wakesPerHour: number;
  /** How long one run may go on, in seconds. */
  maxRunSeconds: number;
}

/**
 * Twenty wakes an hour is one every three minutes, more than a person writing needs, and it caps what a
 * runaway exchange can cost. Half an hour covers a real piece of work, approvals included.
 */
export const DEFAULT_LIMITS: WakeLimits = { wakesPerHour: 20, maxRunSeconds: 30 * 60 };

/** Why it stopped for good: retrying would not help, so it waits until wake is turned on again. */
export type StopReason = 'key_changed' | 'awake_elsewhere' | 'host_missing' | 'connection_changed';

/**
 * The connection wake was turned on for: the API, the agent, and the key, as a fingerprint (never the key).
 * What is saved belongs to it: queued messages, sessions and what was allowed mean nothing to another.
 */
export interface WakeConnection {
  apiUrl: string;
  agentIdentifier: string;
  key: string;
}

export function connectionOf(config: CliConfig): WakeConnection {
  return {
    apiUrl: config.apiUrl.replace(/\/$/, ''),
    agentIdentifier: config.relayAgentIdentifier,
    key: createHash('sha256')
      .update(config.auth.secretKey ?? config.auth.keylessIdentifier ?? '')
      .digest('hex')
      .slice(0, 16),
  };
}

export function sameConnection(a: WakeConnection | undefined, b: WakeConnection): boolean {
  return a?.apiUrl === b.apiUrl && a.agentIdentifier === b.agentIdentifier && a.key === b.key;
}

/** One computer's wake: what was allowed, where it got to, and the sessions it keeps. */
export interface WakeState {
  host: WakeHostId;
  /** The connection it was turned on for. */
  connection?: WakeConnection;
  /** The folder the host works in, absolute. */
  project: string;
  /** How to start the host, as it was found when wake was turned on. */
  program: { command: string; args: string[] };
  limits: WakeLimits;
  /** When the operator allowed keeping the agent awake here. Nothing is taken or woken without it. */
  allowedAt?: string;
  /** The operator agreed to move it here from another computer: the first lease takes it over. */
  takeOver?: boolean;
  /** Where the next wait for messages goes on from. */
  cursor?: string;
  /** Messages that came and aren't handled yet, oldest first. */
  queue: WakeMessage[];
  /** The latest handled message ids, so none is handled twice. */
  handled: string[];
  /**
   * What wake itself sent lately (its questions, notices and the replies it posted): answers to its own
   * questions never wake the host, and none of it counts as the host replying.
   */
  own: string[];
  /**
   * The host's session for each conversation, and the round it belongs to: once the conversation is resolved,
   * its messages come with a later round, which starts a fresh session.
   */
  sessions: Record<string, { sessionId: string; round: number; lastWakeAt: string }>;
  /** When runs started within the last hour. */
  wakes: string[];
  /**
   * The run in progress, while it is: one the program's end cut off is still here when it starts again, and its
   * conversation is told.
   */
  running?: { conversationId: string; at: string };
  /** When the operator was last told the hourly limit holds messages back. */
  limitToldAt?: string;
  /** Set when it stopped for good. */
  stopped?: { reason: StopReason; message: string; at: string };
}

/** How many handled and own ids are kept: far more than one wait ever brings back. */
export const IDS_KEPT = 500;

/** How many conversations keep a session: the ones woken most lately. */
export const SESSIONS_KEPT = 200;

/** A fresh state for wake turned on here, with nothing handled yet. */
export function newState(input: Pick<WakeState, 'host' | 'project' | 'program' | 'limits'>): WakeState {
  const { host, project, program, limits } = input;

  return { host, project, program, limits, queue: [], handled: [], own: [], sessions: {}, wakes: [] };
}

/** Where the state lives: the file in a real run, memory in a test. */
export interface StateStore {
  load(): WakeState | null;
  save(state: WakeState): void;
  remove(): void;
}

export const fileState: StateStore = {
  load() {
    try {
      return JSON.parse(readFileSync(statePath(), 'utf8')) as WakeState;
    } catch {
      return null;
    }
  },
  save(state) {
    const path = statePath();
    mkdirSync(dirname(path), { recursive: true });
    // Written aside and moved into place, so a crash never leaves half a file.
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, path);
  },
  remove() {
    rmSync(statePath(), { force: true });
  },
};

export function memoryState(initial: WakeState | null = null): StateStore & { current: WakeState | null } {
  const store = {
    current: initial ? structuredClone(initial) : null,
    load: () => (store.current ? structuredClone(store.current) : null),
    save: (state: WakeState) => {
      store.current = structuredClone(state);
    },
    remove: () => {
      store.current = null;
    },
  };

  return store;
}
