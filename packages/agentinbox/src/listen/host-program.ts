import { accessSync, constants } from 'node:fs';
import { userInfo } from 'node:os';
import { delimiter, join } from 'node:path';
import { HOST_MARKER_VARIABLES } from '../host';

/**
 * What every adapter needs around its host's program: finding it, the environment it starts in, waiting on it,
 * and a few words about what it does.
 */

/** A name that says it holds a secret: a key, a token, or headers that carry one. */
export const SECRET = /KEY|TOKEN|SECRET|PASSWORD|PASSPHRASE|HEADERS/;

/**
 * Variables a parent session (an agent that ran `listen --foreground`, say) leaves in the environment besides its
 * host's marks: Claude Code's, and Codex's sandbox. The session the listener starts is one of its own, so they go.
 */
const PARENT_SESSION_VARIABLES = [
  'CLAUDECODE',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_BRIDGE_SESSION_ID',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_SSE_PORT',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_PID',
  'CLAUDE_CODE_ENTRYPOINT',
  'CODEX_SANDBOX_NETWORK_DISABLED',
];

/** The longest command or path a progress line keeps. */
const NOTE_LENGTH = 120;

/** What the agent is told when a question it put to a person got no answer. */
export const NOBODY_ANSWERED =
  'Nobody answered in time. Go on with your best judgment, or ask again in the conversation later.';

/** The host's own settings among the shell's variables, those `settings` names, never one that names a secret. */
export function settingsAmong(env: NodeJS.ProcessEnv, settings: RegExp): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([name, value]) =>
      value && settings.test(name) && !SECRET.test(name) ? [[name, value]] : []
    )
  );
}

export function onPath(name: string, path: string | undefined): string | undefined {
  for (const folder of (path ?? '').split(delimiter)) {
    const found = folder ? executable(join(folder, name)) : undefined;
    if (found) {
      return found;
    }
  }

  return undefined;
}

export function executable(file: string): string | undefined {
  try {
    accessSync(file, constants.X_OK);

    return file;
  } catch {
    return undefined;
  }
}

/**
 * The environment a session the listener starts runs in: the program's own, without a parent session's marks,
 * whichever host it was, nor a connection the shell names. Its own commands use the one the listener uses, saved
 * on this computer.
 */
export function programEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const dropped = new Set([...PARENT_SESSION_VARIABLES, ...HOST_MARKER_VARIABLES, 'INBOX_API_URL', 'INBOX_SECRET_KEY']);

  return withAccount(Object.fromEntries(Object.entries(env).filter(([name]) => !dropped.has(name))));
}

/**
 * A service launchd starts has no `USER` (nor `LOGNAME` or `HOME`), which a host needs to find its sign-in (in the
 * Keychain under that account, or in a folder in the home): the account this program runs as stands in.
 */
export function withAccount(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (env.USER) {
    return env;
  }

  const account = userInfo();

  return {
    ...env,
    USER: account.username,
    LOGNAME: env.LOGNAME || account.username,
    HOME: env.HOME || account.homedir,
  };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref();
  });
}

/** Whether `promise` settles within `ms`. */
export async function within(promise: Promise<void>, ms: number): Promise<boolean> {
  return Promise.race([promise.then(() => true), delay(ms).then(() => false)]);
}

/** One line, at most `length` long. */
export function clip(text: string, length = NOTE_LENGTH): string {
  const line = text.replace(/\s+/g, ' ').trim();

  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
}

/** Ends with a full stop, unless it ends with its own punctuation. */
export function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

export function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The host's own words about why it asks, as a question's details: one sentence, clipped. */
export function details(text: string | null | undefined): string[] {
  return stringOf(text) ? [sentence(clip(String(text), 300))] : [];
}

export function stripColors(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: the escape that starts a terminal color
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/** The first line a program printed, without its colors. */
export function firstLine(text: string | undefined): string {
  return stripColors(text ?? '')
    .trim()
    .split('\n')[0];
}

export function hostOf(url: string): string[] {
  try {
    return [new URL(url).hostname];
  } catch {
    return [];
  }
}

/**
 * "use create_issue from github, with title "Bug"": an MCP server's tool as the operator reads it, whole, with
 * what it would be called with, as a command is: the operator allows what they read.
 */
export function describeMcpCall(server: string, tool: string, input: Record<string, unknown>): string {
  const args = Object.entries(input).map(([name, value]) => `${name} ${JSON.stringify(value)}`);

  return `${briefMcpCall(server, tool)}${args.length > 0 ? ` with ${args.join(', ')}` : ''}`;
}

/** The same, without what it is called with, for a card title the whole doesn't fit. */
export function briefMcpCall(server: string, tool: string): string {
  return `use ${tool || 'a tool'} from ${server || 'an MCP server'}`;
}
