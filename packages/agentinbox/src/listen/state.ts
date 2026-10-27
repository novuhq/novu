import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ListenHostId, ListenMessage } from '../api/listen';
import { type CliConfig, configPath } from '../config';

/** Where the listener keeps what it needs between runs: a `listen` folder next to the config. */
export function listenDir(): string {
  return join(dirname(configPath()), 'listen');
}

/** What the background program prints: what it started, what it asked, and why it stopped. */
export function logPath(): string {
  return join(listenDir(), 'listen.log');
}

function statePath(): string {
  return join(listenDir(), 'state.json');
}

export interface ListenLimits {
  /** How many runs may start in an hour. */
  runsPerHour: number;
  /** How long one run may go on, in seconds. */
  maxRunSeconds: number;
}

/**
 * Twenty runs an hour is one every three minutes, more than a person writing needs, and it caps what a
 * runaway exchange can cost. Half an hour covers a real piece of work, approvals included.
 */
export const DEFAULT_LIMITS: ListenLimits = { runsPerHour: 20, maxRunSeconds: 30 * 60 };

/** Why it stopped for good: retrying would not help, so it waits until listening is turned on again. */
export type StopReason = 'key_changed' | 'listening_elsewhere' | 'host_missing' | 'connection_changed';

/**
 * The connection listening was turned on for: the API, the agent, and the key, as a fingerprint (never the key).
 * What is saved belongs to it: queued messages, sessions and what was allowed mean nothing to another.
 */
export interface ListenConnection {
  apiUrl: string;
  agentIdentifier: string;
  key: string;
}

export function connectionOf(config: CliConfig): ListenConnection {
  return {
    apiUrl: config.apiUrl.replace(/\/$/, ''),
    agentIdentifier: config.relayAgentIdentifier,
    key: createHash('sha256')
      .update(config.auth.secretKey ?? config.auth.keylessIdentifier ?? '')
      .digest('hex')
      .slice(0, 16),
  };
}

export function sameConnection(a: ListenConnection | undefined, b: ListenConnection): boolean {
  return a?.apiUrl === b.apiUrl && a.agentIdentifier === b.agentIdentifier && a.key === b.key;
}

/** One computer's listener: what was allowed, where it got to, and the sessions it keeps. */
export interface ListenState {
  host: ListenHostId;
  /** The connection it was turned on for. */
  connection?: ListenConnection;
  /** The folder the host works in, absolute. */
  project: string;
  /** How to start the host, as it was found when listening was turned on. */
  program: { command: string; args: string[] };
  limits: ListenLimits;
  /** When the operator allowed keeping the agent listening here. Nothing is taken or started without it. */
  allowedAt?: string;
  /** The operator agreed to move it here from another computer: the first lease takes it over. */
  takeOver?: boolean;
  /** Where the next wait for messages goes on from. */
  cursor?: string;
  /** Messages that came and aren't handled yet, oldest first. */
  queue: ListenMessage[];
  /** The latest handled message ids, so none is handled twice. */
  handled: string[];
  /**
   * What the listener itself sent lately (its questions, notices and the replies it posted): answers to its own
   * questions never start the host, and none of it counts as the host replying.
   */
  own: string[];
  /**
   * The host's session for each conversation, and the round it belongs to: once the conversation is resolved,
   * its messages come with a later round, which starts a fresh session.
   */
  sessions: Record<string, { sessionId: string; round: number; lastRunAt: string }>;
  /** When runs started within the last hour. */
  runs: string[];
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

/** How many conversations keep a session: the ones started most lately. */
export const SESSIONS_KEPT = 200;

/** A fresh state for listening turned on here, with nothing handled yet. */
export function newState(input: Pick<ListenState, 'host' | 'project' | 'program' | 'limits'>): ListenState {
  const { host, project, program, limits } = input;

  return { host, project, program, limits, queue: [], handled: [], own: [], sessions: {}, runs: [] };
}

/** Where the state lives: the file in a real run, memory in a test. */
export interface StateStore {
  load(): ListenState | null;
  save(state: ListenState): void;
  remove(): void;
}

export const fileState: StateStore = {
  load() {
    try {
      return JSON.parse(readFileSync(statePath(), 'utf8')) as ListenState;
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

export function memoryState(initial: ListenState | null = null): StateStore & { current: ListenState | null } {
  const store = {
    current: initial ? structuredClone(initial) : null,
    load: () => (store.current ? structuredClone(store.current) : null),
    save: (state: ListenState) => {
      store.current = structuredClone(state);
    },
    remove: () => {
      store.current = null;
    },
  };

  return store;
}
