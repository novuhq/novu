import * as z from 'zod';
import { isOidc } from '../shared/auth.ts';
import { BoxState, decode, ExecRequest } from '../shared/contracts.ts';
import { BOX_CLI, bearer, EXIT_MARK, SECRETS } from '../shared/names.ts';
import type { HostEnv } from './env.ts';
import { json, text } from './life.ts';

export const CALL_MS = 30 * 1000;

export interface Shell {
  readonly container: Container;
  readonly env: () => Promise<Record<string, string>>;
  readonly answered: () => void;
}

interface RunOptions {
  readonly cwd?: string | undefined;
  readonly github?: string | undefined;
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
  WRANGLER_SEND_METRICS: 'false',
  pnpm_config_verify_deps_before_run: 'false',
  BOX_HOME: '/opt/box',
};
export const START = ['tini', '--', ...BOX_CLI, 'start'];

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

export async function boxState(shell: Shell, what: string): Promise<BoxState> {
  return decode(BoxState, await output(shell, [...BOX_CLI, 'state'], what), what);
}

export function readToken(request: Request, env: HostEnv): string | undefined {
  if (env.GITHUB_READ_TOKEN) return env.GITHUB_READ_TOKEN;
  const token = bearer(request);
  if (isOidc(token))
    throw new Error(
      'the host has no GITHUB_READ_TOKEN; set it in Cloudflare: `npx wrangler secret put GITHUB_READ_TOKEN` in docker/box'
    );

  return token;
}

export async function execBody(request: Request): Promise<ExecRequest | Response> {
  const body = ExecRequest.safeParse(await request.json().catch(() => null));

  return body.success ? body.data : text(`not an exec request: ${z.prettifyError(body.error)}\n`, 400);
}

export async function execAnswer(shell: Shell, request: Request, body: ExecRequest, env: HostEnv): Promise<Response> {
  const { cmd, cwd, github } = body;
  const token = github ? readToken(request, env) : undefined;

  return streamed(await run(shell, cmd, { cwd, github: token }));
}

// An exec whose stdin is the request's body often never answers, though the file is written whole (October 2026: 12
// of 16 tries); writing the bytes to a piped stdin answers every time.
export async function fileAnswer(shell: Shell, url: URL, bytes: Uint8Array): Promise<Response> {
  const path = url.searchParams.get('path') ?? '';
  const process = await run(shell, ['sh', '-c', 'cat > "$0"', path], { stdin: 'pipe' });
  const writer = process.stdin?.getWriter();
  await writer?.write(bytes);
  await writer?.close();
  const code = await process.exitCode;

  return json({ path, exitCode: code }, code === 0 ? 200 : 500);
}

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

export function streamed(process: ExecProcess): Response {
  const { readable, writable } = new TransformStream();
  const finish = async () => {
    await process.stdout?.pipeTo(writable, { preventClose: true }).catch(() => {});
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(`\n${EXIT_MARK} ${await process.exitCode}\n`));
    await writer.close();
  };
  finish().catch(() => {});

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
