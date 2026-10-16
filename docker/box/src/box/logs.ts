// `box logs`: the last lines of one process, or of all of them, from process-compose's log.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createInterface } from 'node:readline';
import { stopping } from '../node/process.ts';
import { AppLogLine, fromJson, PcLogLine } from '../shared/contracts.ts';
import { PC_LOG } from './paths.ts';
import { list } from './supervisor.ts';

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

const PcEntry = fromJson(PcLogLine);
const AppEntry = fromJson(AppLogLine);

function logLine(raw: string): Line {
  const entry = PcEntry.safeParse(raw);
  if (!entry.success) return { name: '?', text: raw, problem: PROBLEM.test(raw) };
  const { process: name = 'process-compose', level } = entry.data;
  const message = String(entry.data.message ?? '').replace(ANSI, '');
  if (!entry.data.process) return { name, text: message, problem: level === 'error' || level === 'warn' };

  return { name, ...(appLine(message) ?? { text: message, problem: PROBLEM.test(message) }) };
}

// An app's JSON log line as `LEVEL context: msg (error)`, or null when the message isn't one. pino levels are
// numbers (40 is warn); Caddy's are words.
function appLine(message: string): Omit<Line, 'name'> | null {
  if (!message.startsWith('{')) return null;
  const decoded = AppEntry.safeParse(message);
  if (!decoded.success) return null;
  const app = decoded.data;
  const pino = typeof app.level === 'number';
  const level = typeof app.level === 'number' ? (PINO_LEVELS[app.level] ?? String(app.level)) : app.level.toUpperCase();
  const error = app.err?.message ?? (typeof app.error === 'string' ? app.error : app.error?.message) ?? '';
  const context = app.context ?? app.logger;

  return {
    text: `${level} ${context ? `${context}: ` : ''}${app.msg ?? ''}${error ? ` (${error})` : ''}`,
    problem: pino ? Number(app.level) >= 40 : ['WARN', 'ERROR', 'FATAL', 'PANIC'].includes(level),
  };
}

export interface LogsOptions {
  readonly name: string | undefined;
  readonly tail: number;
  readonly follow: boolean;
  readonly errors: boolean;
}

export async function logs({ name, tail, follow, errors }: LogsOptions): Promise<void> {
  const names = (await list()).map((entry) => entry.name);
  if (name && !names.includes(name)) throw new Error(`no process ${name}; the processes: ${names.sort().join(', ')}`);
  const width = Math.max(...names.map((n) => n.length));
  const wanted = (line: Line) =>
    Boolean(line.text.trim()) && (!name || line.name === name) && (!errors || line.problem);
  const print = (line: Line) => process.stdout.write(`${line.name.padEnd(width)} | ${line.text}\n`);
  // The last element is '' or a line process-compose is still writing.
  const lines = fs.existsSync(PC_LOG) ? fs.readFileSync(PC_LOG, 'utf8').split('\n').slice(0, -1) : [];
  for (const line of lines.map(logLine).filter(wanted).slice(-tail)) print(line);
  if (!follow) return;
  // Lines appended from now on, until the caller stops.
  const tailing = spawn('tail', ['-n', '0', '-F', PC_LOG], { stdio: ['ignore', 'pipe', 'ignore'] });
  stopping.signal.addEventListener('abort', () => tailing.kill());
  for await (const raw of createInterface({ input: tailing.stdout })) {
    const line = logLine(raw);
    if (raw && wanted(line)) print(line);
  }
}
