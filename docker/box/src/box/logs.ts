// `box logs`: the last lines of one process, or of all of them, from process-compose's log.

import fs from 'node:fs';
import { Effect, Stream } from 'effect';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { BoxError } from './errors.ts';
import { PC_LOG } from './paths.ts';
import { ProcessCompose } from './supervisor.ts';

const PINO_LEVELS: Record<number, string> = {
  10: 'TRACE',
  20: 'DEBUG',
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};
// For lines that aren't pino: what Mongo, Redis, ClickHouse, Caddy and the rest print for a problem.
const PROBLEM = /\b(error|errors|fatal|panic|exception|uncaught|unhandled|warn|warning)\b|<(Error|Warning|Fatal)>/i;
// Terminal colours, which wrangler prints even into a file.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

interface Line {
  readonly name: string;
  readonly text: string;
  readonly problem: boolean;
}

function logLine(raw: string): Line {
  let entry: { process?: string; message?: unknown; level?: string };
  try {
    entry = JSON.parse(raw);
  } catch {
    return { name: '?', text: raw, problem: PROBLEM.test(raw) };
  }
  const name = entry.process ?? 'process-compose';
  const message = String(entry.message ?? '').replace(ANSI, '');
  if (!entry.process) return { name, text: message, problem: entry.level === 'error' || entry.level === 'warn' };

  return { name, ...(jsonLine(message) ?? { text: message, problem: PROBLEM.test(message) }) };
}

// An app's JSON log line as `LEVEL context: msg (error)`, or null when the message isn't one. pino levels are
// numbers (40 is warn); Caddy's are words.
function jsonLine(message: string): Omit<Line, 'name'> | null {
  if (!message.startsWith('{')) return null;
  // biome-ignore lint/suspicious/noExplicitAny: any app's log line
  let app: any;
  try {
    app = JSON.parse(message);
  } catch {
    return null;
  }
  const pino = typeof app.level === 'number';
  if (!pino && typeof app.level !== 'string') return null;
  const level: string = pino ? (PINO_LEVELS[app.level] ?? String(app.level)) : app.level.toUpperCase();
  const error = app.err?.message ?? app.error?.message ?? (typeof app.error === 'string' ? app.error : '');
  const context = app.context ?? app.logger;

  return {
    text: `${level} ${context ? `${context}: ` : ''}${app.msg ?? ''}${error ? ` (${error})` : ''}`,
    problem: pino ? app.level >= 40 : ['WARN', 'ERROR', 'FATAL', 'PANIC'].includes(level),
  };
}

export interface LogsOptions {
  readonly name: string | undefined;
  readonly tail: number;
  readonly follow: boolean;
  readonly errors: boolean;
}

export const logs = Effect.fn('logs')(function* ({ name, tail, follow, errors }: LogsOptions) {
  const supervisor = yield* ProcessCompose;
  const names = (yield* supervisor.list).map((entry) => entry.name);
  if (name && !names.includes(name))
    return yield* new BoxError({ message: `no process ${name}; the processes: ${names.sort().join(', ')}` });
  const width = Math.max(...names.map((n) => n.length));
  const wanted = (line: Line) =>
    Boolean(line.text.trim()) && (!name || line.name === name) && (!errors || line.problem);
  const print = (line: Line) => process.stdout.write(`${line.name.padEnd(width)} | ${line.text}\n`);
  // The last element is '' or a line process-compose is still writing.
  const lines = fs.existsSync(PC_LOG) ? fs.readFileSync(PC_LOG, 'utf8').split('\n').slice(0, -1) : [];
  for (const line of lines.map(logLine).filter(wanted).slice(-tail)) print(line);
  if (!follow) return;
  // Lines appended from now on, until the caller stops.
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  yield* spawner
    .streamLines(ChildProcess.make('tail', ['-n', '0', '-F', PC_LOG], { detached: false, stderr: 'ignore' }))
    .pipe(
      Stream.runForEach((raw) =>
        Effect.sync(() => {
          const line = logLine(raw);
          if (raw && wanted(line)) print(line);
        })
      ),
      Effect.mapError((error) => new BoxError({ message: `tail ${PC_LOG}: ${error.message}` }))
    );
});
