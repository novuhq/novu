// What the Box (box.ts) needs around its container: running commands in it, their environment, streamed output,
// timeouts.

import * as z from 'zod';
import { isOidc } from '../shared/auth.ts';
import { type BoxState, ExecRequest, fromJson, BoxState as State } from '../shared/contracts.ts';
import { BOX_CLI, bearer, EXIT_MARK, SECRETS } from '../shared/names.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

// What a call into the box (a command, its API) gets from the alarm: a hung bridge or API mustn't stall the idle check.
export const CALL_MS = 30 * 1000;

// What runs a command in the box.
export interface Shell {
  readonly container: Container;
  // The environment every command gets (boxEnv), read when it runs.
  readonly env: () => Promise<Record<string, string>>;
  // The box ran a command, so its snapshot was restored.
  readonly answered: () => void;
}

interface RunOptions {
  readonly cwd?: string | undefined;
  readonly github?: string | undefined;
  // 'pipe': the caller writes stdin, and the command's output is dropped.
  readonly stdin?: 'pipe';
  readonly signal?: AbortSignal;
}

// exec() passes only PATH from the image, so the rest of its ENV (image/Dockerfile) is repeated here.
export const IMAGE_ENV = {
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
  HOME: '/root',
  COREPACK_HOME: '/data/corepack',
  COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
  NX_DAEMON: 'false',
  NX_NO_CLOUD: 'true',
  WRANGLER_SEND_METRICS: 'false',
  pnpm_config_verify_deps_before_run: 'false',
  BOX_HOME: '/opt/box',
};
export const START = ['tini', '--', ...BOX_CLI, 'start'];

export const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// `promise`, or a failure after `ms`; `onTimeout` stops what the promise waits for.
export function withTimeout<T>(promise: Promise<T>, ms: number, what: string, onTimeout?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`${what} took over ${ms / 1000} s`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function run(
  shell: Shell,
  cmd: ReadonlyArray<string>,
  { cwd, github, stdin, signal }: RunOptions = {}
): Promise<ExecProcess> {
  const env = { ...IMAGE_ENV, ...(await shell.env()), ...(github && { GITHUB_TOKEN: github }) };
  const process = await shell.container.exec([...cmd], {
    env,
    ...(stdin ? { stdin, stdout: 'ignore', stderr: 'ignore' } : { stderr: 'combined' }),
    ...(cwd && { cwd }),
    ...(signal && { signal }),
  });
  shell.answered();

  return process;
}

// A read-only command's output, within CALL_MS; the timeout also stops the command.
export function output(shell: Shell, cmd: ReadonlyArray<string>, what: string): Promise<string> {
  const controller = new AbortController();
  const read = async () => {
    const process = await run(shell, cmd, { signal: controller.signal });

    return new TextDecoder().decode((await process.output()).stdout).trim();
  };

  return withTimeout(read(), CALL_MS, what, () => controller.abort());
}

export function exitCode(shell: Shell, cmd: ReadonlyArray<string>, timeoutMs: number, what: string): Promise<number> {
  const controller = new AbortController();
  const exited = async () => (await run(shell, cmd, { signal: controller.signal })).exitCode;

  return withTimeout(exited(), timeoutMs, what, () => controller.abort());
}

// What `box state` says: the baked and applied commits, and the bake or apply holding the lock.
export async function boxState(shell: Shell, what: string): Promise<BoxState> {
  const answer = fromJson(State).safeParse(await output(shell, [...BOX_CLI, 'state'], what));
  if (!answer.success) throw new Error(`${what}: ${z.prettifyError(answer.error)}`);

  return answer.data;
}

// The GitHub token a box's git fetches and CI lookup get: the host's read-only GITHUB_READ_TOKEN when it has one, so
// no caller's push-capable token reaches a box; else the caller's own. A workflow's OIDC token is no GitHub token.
export function readToken(request: Request, env: HostEnv): string | undefined {
  if (env.GITHUB_READ_TOKEN) return env.GITHUB_READ_TOKEN;
  const token = bearer(request);
  if (isOidc(token)) throw new Error('the host has no GITHUB_READ_TOKEN; deploy it with ~/.config/novu-box/github.env');

  return token;
}

// POST /__box/exec
export async function execAnswer(shell: Shell, request: Request, env: HostEnv): Promise<Response> {
  const body = ExecRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return text(`not an exec request: ${z.prettifyError(body.error)}\n`, 400);
  const { cmd, cwd, github } = body.data;
  const token = github ? readToken(request, env) : undefined;

  return streamed(await run(shell, cmd, { cwd, github: token }));
}

// PUT /__box/file
export async function fileAnswer(shell: Shell, request: Request, url: URL): Promise<Response> {
  const path = url.searchParams.get('path') ?? '';
  // An exec whose stdin is the request's body often never answers, though the file is written whole (October
  // 2026: 12 of 16 tries); writing the bytes to a piped stdin answers every time.
  const bytes = await request.bytes();
  const process = await run(shell, ['sh', '-c', 'cat > "$0"', path], { stdin: 'pipe' });
  const writer = process.stdin?.getWriter();
  await writer?.write(bytes);
  await writer?.close();
  const code = await process.exitCode;

  return json({ path, exitCode: code }, code === 0 ? 200 : 500);
}

// The secrets and the box's public URLs, for the box and for every command run in it (an apply that rebuilds the
// dashboard writes these URLs into it). `slack`: the Slack part's own variables.
export function boxEnv(
  env: HostEnv,
  origin: string | undefined,
  slack: Record<string, string>
): Record<string, string> {
  const secrets = {
    ...Object.fromEntries(SECRETS.flatMap((name) => (env[name] ? [[name, env[name]]] : []))),
    ...slack,
  };
  if (!origin) return secrets;

  return {
    ...secrets,
    API_ROOT_URL: origin,
    FRONT_BASE_URL: origin,
    DASHBOARD_URL: origin,
    VITE_API_HOSTNAME: origin,
    VITE_DASHBOARD_URL: origin,
    VITE_WEBSOCKET_HOSTNAME: `${origin.replace(/^http/, 'ws')}/ws`,
    S3_LOCAL_STACK: origin,
    CDN_URL: `${origin}/cdn`,
  };
}

// The command's output as it comes, then a last line with its exit code, which the CLI reads.
export function streamed(process: ExecProcess): Response {
  const { readable, writable } = new TransformStream();
  const finish = async () => {
    await process.stdout?.pipeTo(writable, { preventClose: true }).catch(() => {});
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(`\n${EXIT_MARK} ${await process.exitCode}\n`));
    await writer.close();
  };
  // A client that disconnects only stops the stream; the command keeps running.
  finish().catch(() => {});

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
