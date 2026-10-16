// `box logs`: the last lines of one process, or of all of them, from process-compose's log.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { PC_LOG, processList } from './box.mjs';

const PINO_LEVELS = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
// For lines that aren't pino: what Mongo, Redis, ClickHouse, Caddy and the rest print for a problem.
const PROBLEM = /\b(error|errors|fatal|panic|exception|uncaught|unhandled|warn|warning)\b|<(Error|Warning|Fatal)>/i;
// Terminal colours, which wrangler prints even into a file.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function logLine(raw) {
  let entry;
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
function jsonLine(message) {
  if (!message.startsWith('{')) return null;
  let app;
  try {
    app = JSON.parse(message);
  } catch {
    return null;
  }
  const pino = typeof app.level === 'number';
  if (!pino && typeof app.level !== 'string') return null;
  const level = pino ? (PINO_LEVELS[app.level] ?? String(app.level)) : app.level.toUpperCase();
  const error = app.err?.message ?? app.error?.message ?? (typeof app.error === 'string' ? app.error : '');
  const context = app.context ?? app.logger;

  return {
    text: `${level} ${context ? `${context}: ` : ''}${app.msg ?? ''}${error ? ` (${error})` : ''}`,
    problem: pino ? app.level >= 40 : ['WARN', 'ERROR', 'FATAL', 'PANIC'].includes(level),
  };
}

export function logs({ name, tail, follow, errors }) {
  const names = processList().map((p) => p.name);
  if (name && !names.includes(name)) throw new Error(`no process ${name}; the processes: ${names.sort().join(', ')}`);
  const width = Math.max(...names.map((n) => n.length));
  const wanted = (line) => line.text.trim() && (!name || line.name === name) && (!errors || line.problem);
  const print = (line) => process.stdout.write(`${line.name.padEnd(width)} | ${line.text}\n`);
  const show = (raw) => {
    const line = logLine(raw);
    if (wanted(line)) print(line);
  };
  // The last element is '' or a line process-compose is still writing.
  const lines = fs.existsSync(PC_LOG) ? fs.readFileSync(PC_LOG, 'utf8').split('\n').slice(0, -1) : [];
  for (const line of lines.map(logLine).filter(wanted).slice(-tail)) print(line);
  if (!follow) return;
  // Lines appended from now on, until the caller stops.
  const child = spawn('tail', ['-n', '0', '-F', PC_LOG], { stdio: ['ignore', 'pipe', 'ignore'] });
  let rest = '';
  child.stdout.on('data', (chunk) => {
    const parts = (rest + chunk).split('\n');
    rest = parts.pop();
    for (const raw of parts) if (raw) show(raw);
  });

  return new Promise((resolve) => child.on('close', resolve));
}
