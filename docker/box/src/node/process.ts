import { spawn } from 'node:child_process';
import { constants } from 'node:os';

export const stopping = new AbortController();

export interface RunOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly input?: string;
  readonly stdio?: 'inherit' | 'ignore';
  readonly onStdout?: (chunk: string) => void;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  // From SIGTERM to SIGKILL; process-compose needs minutes for its ordered shutdown.
  readonly graceMs?: number;
}

export interface Captured {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function start(cmd: string, args: ReadonlyArray<string>, options: RunOptions, piped: boolean): Promise<Captured> {
  const { cwd, env, input, stdio = 'inherit', timeoutMs, signal, graceMs = 10_000 } = options;
  const { onStdout } = options;
  const what = [cmd, ...args].join(' ').slice(0, 300);
  const abort = AbortSignal.any([
    stopping.signal,
    ...(signal ? [signal] : []),
    ...(timeoutMs ? [AbortSignal.timeout(timeoutMs)] : []),
  ]);
  const failure = () =>
    new Error(`${what}: ${abort.reason?.name === 'TimeoutError' ? `took over ${timeoutMs} ms` : 'stopped'}`);

  return new Promise((resolve, reject) => {
    if (abort.aborted) return reject(failure());
    const out = piped ? 'pipe' : stdio;
    const stdin = input === undefined ? 'ignore' : 'pipe';
    const child = spawn(cmd, args, { cwd, env, detached: true, stdio: [stdin, onStdout ? 'pipe' : out, out] });
    let stdout = '';
    let stderr = '';
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
      if (onStdout) onStdout(chunk);
      else stdout += chunk;
    });
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.stdin?.end(input);
    const kill = (signal: NodeJS.Signals | 0) => {
      try {
        return Boolean(child.pid && process.kill(-child.pid, signal));
      } catch {
        return false;
      }
    };
    let forced: NodeJS.Timeout | undefined;
    const stop = () => {
      kill('SIGTERM');
      forced = setTimeout(() => kill('SIGKILL'), graceMs);
    };
    abort.addEventListener('abort', stop, { once: true });
    child.on('error', (error) => reject(new Error(`${what}: ${error.message}`)));
    child.on('close', (code, killedBy) => {
      abort.removeEventListener('abort', stop);
      if (!kill(0)) clearTimeout(forced);
      if (abort.aborted) reject(failure());
      else resolve({ exitCode: code ?? 128 + (killedBy ? constants.signals[killedBy] : 0), stdout, stderr });
    });
  });
}

export async function run(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<void> {
  const { exitCode } = await start(cmd, args, options, false);
  if (exitCode !== 0) throw new Error(`${[cmd, ...args].join(' ').slice(0, 300)} exited with ${exitCode}`);
}

export async function exitCode(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<number> {
  return (await start(cmd, args, options, false)).exitCode;
}

export function capture(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<Captured> {
  return start(cmd, args, options, true);
}

export async function output(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<string> {
  const { exitCode, stdout, stderr } = await capture(cmd, args, options);
  if (exitCode !== 0)
    throw new Error(`${cmd} ${args.join(' ')} failed: ${(stderr.trim() || stdout.trim()).slice(-600)}`);

  return stdout.trim();
}
