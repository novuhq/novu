import { spawn } from 'node:child_process';
import { constants } from 'node:os';

// Aborted by the first SIGTERM or SIGINT (main.ts): every child still running is stopped with it.
export const stopping = new AbortController();

export interface RunOptions {
  readonly cwd?: string;
  // Replaces the environment.
  readonly env?: NodeJS.ProcessEnv;
  // Written to stdin.
  readonly input?: string;
  readonly stdio?: 'inherit' | 'ignore';
  // Gets stdout as it comes, instead of our stdout (a command that runs until it's stopped).
  readonly onStdout?: (chunk: string) => void;
  // Our terminal's stdin, and our process group, so the terminal's signals reach it (`docker exec -it`).
  readonly interactive?: boolean;
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

// Each child leads its own process group, so stopping it (timeout, abort, our own SIGTERM) reaches everything it
// started: SIGTERM to the group, then SIGKILL after the grace period, even when the leader exited first.
function start(cmd: string, args: ReadonlyArray<string>, options: RunOptions, piped: boolean): Promise<Captured> {
  const { cwd, env, input, stdio = 'inherit', interactive = false, timeoutMs, signal, graceMs = 10_000 } = options;
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
    const terminal = interactive ? 'inherit' : 'ignore';
    const stdin = input === undefined ? terminal : 'pipe';
    const child = spawn(cmd, args, { cwd, env, detached: !interactive, stdio: [stdin, onStdout ? 'pipe' : out, out] });
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
        return Boolean(child.pid && process.kill(interactive ? child.pid : -child.pid, signal));
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

// Output on ours; fails unless it exits 0.
export async function run(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<void> {
  const { exitCode } = await start(cmd, args, options, false);
  if (exitCode !== 0) throw new Error(`${[cmd, ...args].join(' ').slice(0, 300)} exited with ${exitCode}`);
}

// Output on ours; the exit code, for commands whose code is the answer.
export async function exitCode(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<number> {
  return (await start(cmd, args, options, false)).exitCode;
}

// Its exit code and output, whatever the code.
export function capture(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<Captured> {
  return start(cmd, args, options, true);
}

// stdout, trimmed; fails with the end of its stderr unless it exits 0.
export async function output(cmd: string, args: ReadonlyArray<string>, options: RunOptions = {}): Promise<string> {
  const { exitCode, stdout, stderr } = await capture(cmd, args, options);
  if (exitCode !== 0)
    throw new Error(`${cmd} ${args.join(' ')} failed: ${(stderr.trim() || stdout.trim()).slice(-600)}`);

  return stdout.trim();
}
