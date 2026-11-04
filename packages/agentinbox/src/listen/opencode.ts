import { type ChildProcessWithoutNullStreams, execFile, spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { shortPath } from './computer';
import type {
  HostAdapter,
  HostAnswer,
  HostCheck,
  HostQuestion,
  HostSession,
  OpenOptions,
  PermissionOption,
  PermissionQuestion,
  SessionHandlers,
  SessionInput,
  TurnEnded,
} from './host-adapter';
import {
  briefMcpCall,
  clip,
  delay,
  describeMcpCall,
  details,
  errorText,
  executable,
  firstLine,
  hostOf,
  isRecord,
  NOBODY_ANSWERED,
  onPath,
  programEnv,
  SECRET,
  settingsAmong,
  stringOf,
  stripColors,
  withAccount,
  within,
} from './host-program';

/** OpenCode's own install command for macOS and Linux, as its docs give it. */
const INSTALL_COMMAND = 'curl -fsSL https://opencode.ai/install | bash';

const SETUP_DOCS_URL = 'https://opencode.ai/docs';

export const OPENCODE_MISSING_HELP = `OpenCode isn’t installed on this computer, or isn’t on its PATH. Install it with \`${INSTALL_COMMAND}\` (or see ${SETUP_DOCS_URL}), then run this again.`;

/** How long OpenCode may take to start its server and open the session, before it counts as stuck. */
const OPEN_TIMEOUT_MS = 60_000;

/** How long the check waits for each of OpenCode's commands. */
const CHECK_TIMEOUT_MS = 30_000;

/** How long a request to OpenCode's server may take. */
const REQUEST_TIMEOUT_MS = 30_000;

/** How long a stopped turn may take to wind down before OpenCode is ended. */
const INTERRUPT_GRACE_MS = 10_000;

/** How long `close` waits for OpenCode to exit by itself. */
const CLOSE_GRACE_MS = 5_000;

/** How often an OpenCode 1 session is looked at while a turn runs, in case its events missed the end. */
const STATUS_POLL_MS = 2_000;

/** How long an OpenCode 1 turn may stay without starting before it counts as not taken. */
const START_TIMEOUT_MS = 30_000;

/**
 * OpenCode's own settings among the shell's variables: where it keeps its config, sign-ins and sessions (its
 * `OPENCODE_` paths and switches, and the XDG folders it follows), and how it reaches Amazon Bedrock and Google
 * Vertex. Never `OPENCODE_CONFIG_CONTENT`, which can hold a key.
 */
const SETTINGS =
  /^(OPENCODE_(CONFIG|CONFIG_DIR|TUI_CONFIG|DB|PERMISSION|MODELS_URL|MODELS_PATH|GIT_BASH_PATH|DISABLE_\w+|ENABLE_\w+|EXPERIMENTAL\w*)|XDG_(CONFIG|DATA|STATE|CACHE)_HOME|AWS_(PROFILE|REGION|DEFAULT_REGION|CONFIG_FILE|SHARED_CREDENTIALS_FILE)|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT)$/;

/** Variables the server would sign its clients in with otherwise: the session's server takes the listener's own. */
const SERVER_VARIABLES = ['OPENCODE_SERVER_PASSWORD', 'OPENCODE_SERVER_USERNAME', 'OPENCODE_PASSWORD'];

/** The instruction entry an OpenCode 2 session carries the listener's instructions in. */
const INSTRUCTIONS_KEY = 'agentinbox';

/** What an OpenCode 2 form that isn't a question is told: nobody here fills one in. */
const FORM_DECLINED = 'Agent Inbox can’t fill in forms for you. Go on without it.';

const ALLOW_ONCE: PermissionOption = { id: 'allow', label: 'Allow', kind: 'allow_once' };
const ALLOW_SESSION: PermissionOption = { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' };
const DENY: PermissionOption = { id: 'deny', label: 'Deny', kind: 'deny' };

/**
 * OpenCode, driven through `opencode serve`: the HTTP server its own apps use, with its events as a stream. It is the
 * operator's own `opencode`, with their sign-ins, models, config and MCP servers; nothing of OpenCode ships with the
 * CLI. OpenCode 1 and OpenCode 2 serve different APIs (ADR 0003), so a session asks `opencode --version` which one it
 * starts, and speaks that one: OpenCode 1's `/session/…` and `/event`, built against 1.19.5, or OpenCode 2's `/api/…`,
 * built against 2.2.0.
 */
export const opencode: HostAdapter = {
  id: 'opencode',
  name: 'OpenCode',
  check: checkOpenCode,
  settingsIn: (env) => settingsAmong(env, SETTINGS),
  open: (options, handlers) => new OpenCodeSession(options, handlers),
};

/** OpenCode's version, as `opencode --version` prints it: "1.19.5", or "opencode v2.2.0". */
export function versionIn(text: string): { text: string; major: number; minor: number } | undefined {
  const found = /(\d+)\.(\d+)\.(\d+)/.exec(text);

  return found ? { text: found[0], major: Number(found[1]), minor: Number(found[2]) } : undefined;
}

/** Whether the listener drives this OpenCode: 1.19 or later of OpenCode 1, 2.2 or later of OpenCode 2, and on. */
export function driven(version: { major: number; minor: number }): boolean {
  return version.major === 1 ? version.minor >= 19 : version.major === 2 ? version.minor >= 2 : version.major > 2;
}

async function checkOpenCode(project: string, given: NodeJS.ProcessEnv = process.env): Promise<HostCheck> {
  const env = withAccount(given);
  // The installer's link, which is often only on the PATH of a login shell.
  const command = onPath('opencode', env.PATH) ?? executable(join(homedir(), '.opencode', 'bin', 'opencode'));
  if (!command) {
    return { ok: false, message: OPENCODE_MISSING_HELP };
  }

  const ran = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, env });
  const version = ran.status === 0 ? versionIn(ran.stdout) : undefined;
  if (!version) {
    const why = firstLine(ran.stderr || ran.error?.message);

    return {
      ok: false,
      message: `OpenCode at ${command} didn’t start${why ? `: ${why}` : ''}. ${OPENCODE_MISSING_HELP}`,
    };
  }
  if (!driven(version)) {
    return {
      ok: false,
      message: `OpenCode ${version.text} at ${command} is older than the listener drives: OpenCode 1.19 or later, or 2.2 or later. Update it with \`opencode upgrade\`, then run this again.`,
    };
  }

  // Kept as found: the installer's link stays the same path while OpenCode updates itself.
  return {
    ok: true,
    program: { command, args: [] },
    version: version.text,
    warnings: [],
    secrets: shellSignIns(command, version.major, project, env),
  };
}

/**
 * The keys from this shell OpenCode signs in to a provider with, as `opencode auth list` names them: the background
 * program goes without them. OpenCode 2 lists them without its background service.
 */
function shellSignIns(command: string, major: number, project: string, env: NodeJS.ProcessEnv): string[] {
  const listed = spawnSync(command, major >= 2 ? ['auth', 'list', '--standalone'] : ['auth', 'list'], {
    cwd: project,
    encoding: 'utf8',
    timeout: CHECK_TIMEOUT_MS,
    env,
  });

  return listed.status === 0 ? keysNamedIn(`${listed.stdout}\n${listed.stderr}`, env) : [];
}

/** The variables set in `env` that hold a secret and that `listed` names. */
export function keysNamedIn(listed: string, env: NodeJS.ProcessEnv): string[] {
  const named = new Set(stripColors(listed).match(/\b[A-Z][A-Z0-9_]*\b/g) ?? []);

  return Object.keys(env)
    .filter((name) => named.has(name) && SECRET.test(name) && env[name]?.trim())
    .sort();
}

/** A rule of OpenCode's permissions, both ways it writes one (1: permission/pattern/action, 2: action/resource/effect). */
export interface Rule {
  name: string;
  pattern: string;
  effect: 'allow' | 'ask' | 'deny';
}

/**
 * The rules a session the listener starts works by, after its agent's. OpenCode allows everything by default, and a
 * run for a message asks the operator before what reaches beyond the project:
 * - Shell commands, the web (`webfetch`, `websearch`) and every MCP server's tools ask. An MCP tool is told by its
 *   name, `<server>_<tool>`, never by the servers OpenCode lists: OpenCode 2 lists a server only once it starts, which
 *   can be after the session does. OpenCode's own `external_directory` (outside the project) and `doom_loop` fit the
 *   name too: they ask, unless the agent's rules after say otherwise, as OpenCode 1's do for OpenCode's own folders.
 * - Reading and editing in the project go ahead, and so does everything else OpenCode allows.
 * - The agent's own rules come next, so they still decide what they name: the operator's config, and OpenCode's for
 *   its own folders. Only its allow-everything default goes, which would otherwise decide everything.
 * - What would go around the asks is off, last, so that no rule of the agent's turns it on again. Code Mode
 *   (`execute`): its scripts send HTTP requests with a `fetch` that never asks (OpenCode 2; OpenCode 1's is
 *   experimental); without it, MCP tools are plain tools again. And on OpenCode 1 subagents
 *   (`task`): there a subagent keeps only the session's denies, so it would run commands without asking. OpenCode 2's
 *   keep the session's rules.
 */
export function sessionRules(major: 1 | 2, agentRules: readonly Rule[]): Rule[] {
  return [
    { name: major === 1 ? 'bash' : 'shell', pattern: '*', effect: 'ask' },
    { name: 'webfetch', pattern: '*', effect: 'ask' },
    { name: 'websearch', pattern: '*', effect: 'ask' },
    { name: '*_*', pattern: '*', effect: 'ask' },
    ...agentRules.filter((rule) => !(rule.name === '*' && rule.pattern === '*' && rule.effect === 'allow')),
    { name: 'execute', pattern: '*', effect: 'deny' },
    ...(major === 1 ? [{ name: 'task', pattern: '*', effect: 'deny' as const }] : []),
  ];
}

/** How OpenCode names an MCP server in its tools' names: `<server>_<tool>`, each part with only letters, digits, - and _. */
function toolNamespace(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** The MCP server and its tool a tool's name stands for, among the servers OpenCode has: the longest that fits. */
export function mcpToolOf(name: string, servers: readonly string[]): { server: string; tool: string } | undefined {
  const server = servers
    .filter((each) => name.startsWith(`${toolNamespace(each)}_`))
    .sort((a, b) => b.length - a.length)[0];

  return server === undefined ? undefined : { server, tool: name.slice(toolNamespace(server).length + 1) };
}

const ID_LETTERS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
let lastIdAt = 0;
let idsThisMs = 0;

/**
 * An id as OpenCode makes its own: the time and a count in 12 hex digits, then 14 random letters, so it sorts after
 * every id OpenCode made before it. A message's id is ours to choose, which is how a turn finds its own.
 */
export function ascendingId(prefix: string, now = Date.now()): string {
  idsThisMs = now === lastIdAt ? idsThisMs + 1 : 1;
  lastIdAt = now;
  const time = (BigInt(now) * BigInt(0x1000) + BigInt(idsThisMs)).toString(16).padStart(12, '0').slice(-12);

  return `${prefix}_${time}${Array.from(randomBytes(14), (byte) => ID_LETTERS[byte % 62]).join('')}`;
}

/** A permission OpenCode asks for, the same for both of its APIs. */
export interface Asked {
  id: string;
  sessionId: string;
  /** What it asks to do: `bash` or `shell`, `edit`, `webfetch`, an MCP tool… */
  name: string;
  /** What it asks it for: the commands, the paths, the address. */
  patterns: string[];
  /** What an "always" would allow from then on (OpenCode 1). */
  always: string[];
  metadata: Record<string, unknown>;
  /** The tool call that asks, when a tool does. */
  callId?: string;
  /** OpenCode's own words about it. */
  message?: string;
}

/**
 * What OpenCode asks, as the operator reads it. `inputs` has each tool call's input, by its id: OpenCode 1 asks for an
 * MCP tool without saying what it is called with.
 */
export function describePermission(
  asked: Asked,
  context: { inputs: ReadonlyMap<string, Record<string, unknown>>; mcpServers: readonly string[] }
): Omit<PermissionQuestion, 'options'> {
  const input = (asked.callId && context.inputs.get(asked.callId)) || {};
  const mcp = mcpToolOf(asked.name, context.mcpServers);
  const described = mcp
    ? describeMcp(mcp, isRecord(asked.metadata.input) ? asked.metadata.input : input)
    : (PERMISSIONS.get(asked.name) ?? describeOther)(asked, { ...input, ...asked.metadata });

  return { ...described, details: details(asked.message) };
}

type Described = Omit<PermissionQuestion, 'options' | 'details'>;

/** A permission as the operator reads it, from what OpenCode says of it over what its tool was given (`said`). */
type Describe = (asked: Asked, said: Record<string, unknown>) => Described;

function describeMcp(mcp: { server: string; tool: string }, input: Record<string, unknown>): Described {
  return {
    subject: { kind: 'mcp', server: mcp.server, tool: mcp.tool, input },
    action: describeMcpCall(mcp.server, mcp.tool, input),
    brief: briefMcpCall(mcp.server, mcp.tool),
  };
}

const describeCommand: Describe = (asked, said) => {
  const command = stringOf(said.command) ?? asked.patterns.join(' && ');
  // Where it runs, when the agent named a folder (\`workdir\`) rather than the project.
  const cwd = stringOf(said.workdir);

  return {
    subject: { kind: 'command', command, ...(cwd ? { cwd } : {}) },
    action: `run \`${command}\``,
    brief: 'run a command',
  };
};

const describeFiles: Describe = (asked, said) => {
  const paths = filesOf(said, asked.patterns);
  const verb = asked.name === 'edit' ? 'edit' : 'read';

  return {
    subject: { kind: 'files', paths },
    action: paths.length > 0 ? `${verb} ${paths.map(shortPath).join(', ')}` : `${verb} files`,
    brief: `${verb} ${paths.length === 1 ? 'a file' : 'files'}`,
  };
};

const describeSubagent: Describe = (asked, said) => {
  const agent = stringOf(said.subagent_type) ?? stringOf(said.agent) ?? asked.patterns[0] ?? 'a';
  const what = stringOf(said.description);

  return {
    subject: { kind: 'tool', name: asked.name },
    action: `start the ${agent} subagent${what ? ` to ${clip(what)}` : ''}`,
    brief: 'start a subagent',
  };
};

/** Any other permission, by the name of what asks for it. */
const describeOther: Describe = (asked) => {
  const on = asked.patterns.filter((pattern) => pattern !== '*');

  return {
    subject: { kind: 'tool', name: asked.name },
    action: `use ${asked.name}${on.length > 0 ? ` on ${clip(on.join(', '))}` : ''}`,
    brief: `use ${asked.name}`,
  };
};

/** How each of OpenCode's permissions reads, by its name in OpenCode 1 or 2. */
const PERMISSIONS = new Map<string, Describe>([
  ['bash', describeCommand],
  ['shell', describeCommand],
  [
    'webfetch',
    (asked, said) => {
      const url = stringOf(said.url) ?? asked.patterns[0] ?? '';

      return {
        subject: { kind: 'network', hosts: hostOf(url) },
        action: url ? `fetch ${url}` : 'fetch a web page',
        brief: 'fetch a web page',
      };
    },
  ],
  [
    'websearch',
    (asked, said) => {
      const query = stringOf(said.query) ?? asked.patterns[0];

      return {
        subject: { kind: 'network', hosts: [] },
        action: query ? `search the web for “${clip(query)}”` : 'search the web',
        brief: 'search the web',
      };
    },
  ],
  ['edit', describeFiles],
  ['read', describeFiles],
  [
    'external_directory',
    (asked, said) => {
      const folders = foldersOf(said, asked.patterns);

      return {
        subject: { kind: 'files', paths: folders },
        action: `work in ${folders.length > 0 ? folders.map(shortPath).join(', ') : 'another folder'}, outside the project`,
        brief: 'work outside the project',
      };
    },
  ],
  ['task', describeSubagent],
  ['subagent', describeSubagent],
  [
    'doom_loop',
    (asked, said) => {
      const tool = stringOf(said.tool) ?? asked.patterns[0] ?? 'a tool';

      return {
        subject: { kind: 'tool', name: tool },
        action: `call ${tool} again with the same input, though it did that twice already`,
        brief: 'repeat a tool call',
      };
    },
  ],
]);

/**
 * What "Allow for this session" lets through on OpenCode 1, said with the question: what its own "always" would, which
 * can be more than the one request (`npm test *` for `npm test`, every fetch for one fetch).
 */
export function sessionScope(always: readonly string[]): string {
  return always.includes('*')
    ? 'Allow for this session lets every request of this kind through until the session ends.'
    : `Allow for this session lets ${always.map((pattern) => `\`${pattern}\``).join(', ')} through until the session ends.`;
}

/** The files a request names: the path its tool was given, else what OpenCode asks for. */
function filesOf(said: Record<string, unknown>, patterns: string[]): string[] {
  const path = stringOf(said.filepath) ?? stringOf(said.filePath) ?? stringOf(said.path);

  return path ? [path] : patterns.filter((pattern) => pattern !== '*');
}

/** The folders a request outside the project names, without the `/*` OpenCode allows them as. */
function foldersOf(said: Record<string, unknown>, patterns: string[]): string[] {
  const named = strings(said.directories);
  const folder = stringOf(said.parentDir);
  const found = named.length > 0 ? named : folder ? [folder] : patterns;

  return [...new Set(found.map((each) => each.replace(/\/\*$/, '')))];
}

/** A tool call as the log reads it ("bash: npm test"), and what it is, as a permission question names it. */
function describeTool(
  name: string,
  input: Record<string, unknown>,
  mcpServers: readonly string[]
): { note: string; subject: PermissionQuestion['subject'] } {
  const what =
    stringOf(input.command) ??
    stringOf(input.filePath) ??
    stringOf(input.path) ??
    stringOf(input.url) ??
    stringOf(input.pattern) ??
    stringOf(input.query) ??
    questionsIn(input);
  const note = what ? `${name}: ${clip(what)}` : name;
  const mcp = mcpToolOf(name, mcpServers);
  if (mcp) {
    return { note, subject: { kind: 'mcp', ...mcp, input } };
  }

  switch (name) {
    case 'bash':
    case 'shell':
      return { note, subject: { kind: 'command', command: stringOf(input.command) ?? '' } };
    case 'webfetch':
      return { note, subject: { kind: 'network', hosts: hostOf(stringOf(input.url) ?? '') } };
    case 'websearch':
      return { note, subject: { kind: 'network', hosts: [] } };
    default:
      return { note, subject: { kind: 'tool', name } };
  }
}

/** What OpenCode's question tool asks, both versions: `{ questions: [{ question, header, options }] }`. */
function questionsIn(input: Record<string, unknown>): string | undefined {
  const asked = records(input.questions).flatMap((each) => stringOf(each.question) ?? []);

  return asked.length > 0 ? asked.join(' · ') : undefined;
}

/** A question the agent puts to a person, through OpenCode's question tool. */
interface AskedQuestion {
  id: string;
  sessionId: string;
  /** Whether a person can answer it: an OpenCode 2 form that isn't a question is declined. */
  answerable: boolean;
  question: HostQuestion;
  /** OpenCode 2's fields, which its answer names. */
  fields?: FormField[];
}

type FormField = {
  key: string;
  type?: string;
  title?: string;
  description?: string;
  options: Array<{ value?: string; label?: string }>;
};

/** What OpenCode says while the session is open, the same for both of its APIs. */
type OpenCodeEvent =
  | { type: 'connected' }
  /** An MCP server started, stopped or changed its tools. */
  | { type: 'mcp' }
  /** OpenCode 1: the session works on a turn, or doesn't any more. */
  | { type: 'busy' | 'idle'; sessionId: string }
  /** OpenCode 1: something went wrong in the session, a stopped turn among it. */
  | { type: 'error'; sessionId: string; name?: string; message?: string }
  /** OpenCode 2: a turn started or ended. */
  | {
      type: 'execution';
      sessionId: string;
      phase: 'started' | 'succeeded' | 'failed' | 'interrupted';
      error?: string;
      reason?: string;
    }
  /** OpenCode 2: a message left the session's inbox for the turn. */
  | { type: 'delivered'; sessionId: string; messageId: string }
  /** OpenCode 2: a text the agent finished writing. */
  | { type: 'text'; sessionId: string; messageId: string; text: string }
  | {
      type: 'tool';
      sessionId: string;
      callId: string;
      name?: string;
      input?: Record<string, unknown>;
      state: 'named' | 'started' | 'ended';
    }
  | { type: 'permission'; asked: Asked }
  | { type: 'question'; asked: AskedQuestion }
  /** A question or permission OpenCode no longer waits on: answered, or taken back. */
  | { type: 'settled'; id: string };

/** A request to OpenCode's server: what it answers, parsed. */
type Call = <T = unknown>(method: string, path: string, body?: unknown) => Promise<T>;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** What differs between OpenCode 1's API and OpenCode 2's, besides how messages become turns. */
interface OpenCodeApi {
  readonly major: 1 | 2;
  /** How `opencode serve` starts, after the program's own arguments. */
  readonly serve: readonly string[];
  /** The variable the server takes its password from. */
  readonly passwordVariable: string;
  readonly eventsPath: string;
  /** Points a request at the project: OpenCode 1 takes it as `?directory=`, OpenCode 2 as a header. */
  locate(url: URL, headers: Record<string, string>, project: string): void;
  eventOf(raw: unknown): OpenCodeEvent | undefined;
  /** The rules of the agent a session works with by default, its first visible one. */
  agentRules(call: Call): Promise<Rule[]>;
  mcpServers(call: Call): Promise<string[]>;
  create(call: Call, project: string, rules: Rule[]): Promise<string>;
  /** Goes on with a session, under the rules of now; a 404 when it doesn't exist any more. */
  resume(call: Call, id: string, rules: Rule[]): Promise<void>;
  /** OpenCode 2 keeps the listener's instructions with the session; OpenCode 1 takes them with each message. */
  instruct?(call: Call, id: string, instructions: string): Promise<void>;
  replyPermission(call: Call, asked: Asked, reply: 'once' | 'always' | 'reject', message?: string): Promise<void>;
  /** Answers a question, or says nobody did (`undefined`). */
  answer(call: Call, asked: AskedQuestion, answer: HostAnswer | undefined): Promise<void>;
  /** Declines a question nobody here answers. */
  decline(call: Call, asked: AskedQuestion, message: string): Promise<void>;
}

const OPENCODE_1: OpenCodeApi = {
  major: 1,
  serve: ['serve', '--hostname', '127.0.0.1', '--port', '0'],
  passwordVariable: 'OPENCODE_SERVER_PASSWORD',
  eventsPath: '/event',
  locate: (url, _headers, project) => url.searchParams.set('directory', project),
  eventOf: eventOf1,
  async agentRules(call) {
    const agents = await call<Array<{ mode?: string; hidden?: boolean; permission?: Rule1[] }>>('GET', '/agent');
    const agent = agents.find((each) => each.mode !== 'subagent' && !each.hidden);

    return (agent?.permission ?? []).map((rule) => ({
      name: rule.permission,
      pattern: rule.pattern,
      effect: rule.action,
    }));
  },
  mcpServers: async (call) => Object.keys((await call<Record<string, unknown>>('GET', '/mcp')) ?? {}),
  async create(call, _project, rules) {
    return (await call<{ id: string }>('POST', '/session', { permission: rules.map(toRule1) })).id;
  },
  async resume(call, id, rules) {
    await call('PATCH', `/session/${id}`, { permission: rules.map(toRule1) });
  },
  async replyPermission(call, asked, reply, message) {
    await call('POST', `/permission/${asked.id}/reply`, { reply, ...(message ? { message } : {}) });
  },
  async answer(call, asked, answer) {
    await call('POST', `/question/${asked.id}/reply`, {
      answers: asked.question.questions.map((each) => (answer ? (answer.answers[each.id] ?? []) : [NOBODY_ANSWERED])),
    });
  },
  async decline(call, asked) {
    await call('POST', `/question/${asked.id}/reject`);
  },
};

type Rule1 = { permission: string; pattern: string; action: Rule['effect'] };

function toRule1(rule: Rule): Rule1 {
  return { permission: rule.name, pattern: rule.pattern, action: rule.effect };
}

/** Reads one of OpenCode's events, what it carries (`said`) as it came. */
type Parse = (said: Record<string, unknown>) => OpenCodeEvent | undefined;

/** OpenCode 1's events: `{ type, properties }`. */
function eventOf1(raw: unknown): OpenCodeEvent | undefined {
  const type = isRecord(raw) ? stringOf(raw.type) : undefined;

  return type && isRecord(raw) ? EVENTS_1.get(type)?.(recordOf(raw.properties)) : undefined;
}

const settled1: Parse = (said) => ({ type: 'settled', id: stringOf(said.requestID) ?? '' });

/** OpenCode 1's events the listener reads, by their type. */
const EVENTS_1 = new Map<string, Parse>([
  ['server.connected', () => ({ type: 'connected' })],
  ['mcp.status.changed', () => ({ type: 'mcp' })],
  ['mcp.tools.changed', () => ({ type: 'mcp' })],
  [
    'session.status',
    (said) => ({ type: recordOf(said.status).type === 'idle' ? 'idle' : 'busy', sessionId: sessionIdOf(said) }),
  ],
  [
    'session.error',
    (said) => {
      const error = recordOf(said.error);

      return {
        type: 'error',
        sessionId: sessionIdOf(said),
        name: stringOf(error.name),
        message: stringOf(recordOf(error.data).message),
      };
    },
  ],
  [
    'message.part.updated',
    (said) => {
      const part = recordOf(said.part);
      const state = recordOf(part.state);
      const callId = stringOf(part.callID);
      if (part.type !== 'tool' || !callId || state.status === 'pending') {
        return undefined;
      }

      return {
        type: 'tool',
        sessionId: sessionIdOf(part),
        callId,
        name: stringOf(part.tool),
        input: recordOf(state.input),
        state: state.status === 'running' ? 'started' : 'ended',
      };
    },
  ],
  [
    'permission.asked',
    (said) => ({
      type: 'permission',
      asked: {
        id: stringOf(said.id) ?? '',
        sessionId: sessionIdOf(said),
        name: stringOf(said.permission) ?? '',
        patterns: strings(said.patterns),
        always: strings(said.always),
        metadata: recordOf(said.metadata),
        callId: stringOf(recordOf(said.tool).callID),
      },
    }),
  ],
  [
    'question.asked',
    (said) => ({
      type: 'question',
      asked: {
        id: stringOf(said.id) ?? '',
        sessionId: sessionIdOf(said),
        answerable: true,
        question: {
          questions: records(said.questions).map((each, index) => ({
            id: String(index),
            text: stringOf(each.question) ?? stringOf(each.header) ?? '',
            options: labelsOf(each.options),
            multiple: each.multiple === true,
          })),
        },
      },
    }),
  ],
  ['permission.replied', settled1],
  ['question.replied', settled1],
  ['question.rejected', settled1],
]);

const OPENCODE_2: OpenCodeApi = {
  major: 2,
  // With `--stdio` it ends with its input, so it never outlives the listener, and its tools don't get its password.
  serve: ['serve', '--stdio', '--hostname', '127.0.0.1'],
  passwordVariable: 'OPENCODE_PASSWORD',
  eventsPath: '/api/event',
  locate: (_url, headers, project) => {
    headers['x-opencode-directory'] = encodeURIComponent(project);
  },
  eventOf: eventOf2,
  async agentRules(call) {
    const agents = await call<{ data: Array<{ mode?: string; hidden?: boolean; permissions?: Rule2[] }> }>(
      'GET',
      '/api/agent'
    );
    const agent = agents.data.find((each) => each.mode !== 'subagent' && !each.hidden);

    return (agent?.permissions ?? []).map((rule) => ({
      name: rule.action,
      pattern: rule.resource,
      effect: rule.effect,
    }));
  },
  mcpServers: async (call) =>
    (await call<{ data: Array<{ name: string }> }>('GET', '/api/mcp')).data.map((server) => server.name),
  async create(call, project, rules) {
    const created = await call<{ data: { id: string } }>('POST', '/api/session', {
      location: { directory: project },
      permissions: rules.map(toRule2),
    });

    return created.data.id;
  },
  async resume(call, id, rules) {
    await call('PATCH', `/api/session/${id}`, { permissions: rules.map(toRule2) });
  },
  async instruct(call, id, instructions) {
    await call('PUT', `/api/experimental/session/${id}/instructions/entries/${INSTRUCTIONS_KEY}`, {
      value: instructions,
    });
  },
  async replyPermission(call, asked, reply, message) {
    await call('POST', `/api/session/${asked.sessionId}/permission/${asked.id}/reply`, {
      // OpenCode 2's "always" keeps the rule for the project for good, which the listener never offers.
      decision: reply === 'always' ? 'once' : reply,
      ...(message ? { message } : {}),
    });
  },
  async answer(call, asked, answer) {
    if (!answer) {
      await this.decline(call, asked, NOBODY_ANSWERED);

      return;
    }

    const fields = asked.fields ?? [];
    const path = `/api/session/${asked.sessionId}/form/${asked.id}`;
    await call('POST', `${path}/reply`, {
      answer: Object.fromEntries(fields.map((field) => [field.key, formValue(field, answer.answers[field.key] ?? [])])),
    }).catch(async () => {
      // An answer the form doesn't take (words where it wants one of its options) still reaches the agent.
      const words = Object.values(answer.answers).flat().join('; ');
      await this.decline(call, asked, `The answer didn’t fit the question: “${clip(words, 300)}”.`);
    });
  },
  async decline(call, asked, message) {
    await call('DELETE', `/api/session/${asked.sessionId}/form/${asked.id}?message=${encodeURIComponent(message)}`);
  },
};

type Rule2 = { action: string; resource: string; effect: Rule['effect'] };

function toRule2(rule: Rule): Rule2 {
  return { action: rule.name, resource: rule.pattern, effect: rule.effect };
}

/** What a form field gets from the options picked, or the words written: an option's value for its label. */
function formValue(field: FormField, picked: string[]): string | number | boolean | string[] {
  const optionValue = (label: string) => field.options.find((option) => option.label === label)?.value ?? label;
  switch (field.type) {
    case 'multiselect':
      return picked.map(optionValue);
    case 'boolean':
      return /^(y|yes|true|ok|allow)/i.test(picked[0] ?? '');
    case 'number':
    case 'integer':
      return Number(picked[0]);
    default:
      return picked.length === 1 ? optionValue(picked[0]) : picked.join(', ');
  }
}

/** OpenCode 2's events: `{ id, type, data }`. */
function eventOf2(raw: unknown): OpenCodeEvent | undefined {
  const type = isRecord(raw) ? stringOf(raw.type) : undefined;

  return type && isRecord(raw) ? EVENTS_2.get(type)?.(recordOf(raw.data)) : undefined;
}

function execution2(phase: 'started' | 'succeeded'): Parse {
  return (said) => ({ type: 'execution', sessionId: sessionIdOf(said), phase });
}

/** A tool call's start or end, by the call's id; its name comes with its first event, its input with its call. */
function tool2(state: 'named' | 'started' | 'ended'): Parse {
  return (said) => {
    const callId = stringOf(said.id);

    return callId
      ? {
          type: 'tool',
          sessionId: sessionIdOf(said),
          callId,
          name: stringOf(said.name),
          input: isRecord(said.input) ? said.input : undefined,
          state,
        }
      : undefined;
  };
}

const settled2: Parse = (said) => ({ type: 'settled', id: stringOf(said.id) ?? '' });

/** OpenCode 2's events the listener reads, by their type. */
const EVENTS_2 = new Map<string, Parse>([
  ['server.connected', () => ({ type: 'connected' })],
  ['mcp.status.changed', () => ({ type: 'mcp' })],
  ['mcp.tools.changed', () => ({ type: 'mcp' })],
  ['session.execution.started', execution2('started')],
  ['session.execution.succeeded', execution2('succeeded')],
  [
    'session.execution.failed',
    (said) => ({
      type: 'execution',
      sessionId: sessionIdOf(said),
      phase: 'failed',
      error: stringOf(recordOf(said.error).message),
    }),
  ],
  [
    'session.execution.interrupted',
    (said) => ({
      type: 'execution',
      sessionId: sessionIdOf(said),
      phase: 'interrupted',
      reason: stringOf(said.reason),
    }),
  ],
  [
    'session.inbox.delivered',
    (said) => ({ type: 'delivered', sessionId: sessionIdOf(said), messageId: stringOf(said.inboxID) ?? '' }),
  ],
  [
    'session.text.ended',
    (said) => ({
      type: 'text',
      sessionId: sessionIdOf(said),
      messageId: stringOf(said.assistantMessageID) ?? '',
      text: typeof said.text === 'string' ? said.text : '',
    }),
  ],
  ['session.tool.input.started', tool2('named')],
  ['session.tool.called', tool2('started')],
  ['session.tool.success', tool2('ended')],
  ['session.tool.failed', tool2('ended')],
  [
    'permission.asked',
    (said) => ({
      type: 'permission',
      asked: {
        id: stringOf(said.id) ?? '',
        sessionId: sessionIdOf(said),
        name: stringOf(said.action) ?? '',
        patterns: strings(said.resources),
        always: [],
        metadata: recordOf(said.metadata),
        callId: stringOf(recordOf(said.source).id),
        message: stringOf(said.message),
      },
    }),
  ],
  ['form.created', (said) => ({ type: 'question', asked: formOf(recordOf(said.form)) })],
  ['permission.replied', (said) => ({ type: 'settled', id: stringOf(said.requestID) ?? '' })],
  ['form.replied', settled2],
  ['form.cancelled', settled2],
]);

/** An OpenCode 2 form: a question from its question tool, or one an MCP server asks, which nobody here answers. */
function formOf(form: Record<string, unknown>): AskedQuestion {
  const title = stringOf(form.title) ?? '';
  const fields = records(form.fields).map(
    (field): FormField => ({
      key: stringOf(field.key) ?? '',
      type: stringOf(field.type),
      title: stringOf(field.title),
      description: stringOf(field.description),
      options: records(field.options).map((option) => ({
        value: stringOf(option.value),
        label: stringOf(option.label),
      })),
    })
  );

  return {
    id: stringOf(form.id) ?? '',
    sessionId: stringOf(form.sessionID) ?? '',
    answerable: recordOf(form.metadata).kind === 'question',
    fields,
    question: {
      questions: fields
        .filter((field) => field.type !== 'external')
        .map((field) => ({
          id: field.key,
          text: field.description ?? field.title ?? title,
          options: field.options.flatMap((option) => option.label ?? []),
          multiple: field.type === 'multiselect',
        })),
    },
  };
}

function sessionIdOf(said: Record<string, unknown>): string {
  return stringOf(said.sessionID) ?? '';
}

function recordOf(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];
}

function labelsOf(options: unknown): string[] {
  return Array.isArray(options)
    ? options.flatMap((option) => stringOf(isRecord(option) ? option.label : '') ?? [])
    : [];
}

/** The address `opencode serve` says it listens on: "… listening on http://…" (1), or `{"url": "http://…"}` (2). */
export function serverUrlIn(line: string): string | undefined {
  return (/listening on (https?:\/\/\S+)/.exec(line) ?? /"url"\s*:\s*"(https?:\/\/[^"]+)"/.exec(line))?.[1];
}

/** Server-sent events, each as the JSON its `data` carries. */
async function* sentEvents(body: AsyncIterable<Uint8Array>): AsyncGenerator<unknown> {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    for (let end = buffer.indexOf('\n\n'); end >= 0; end = buffer.indexOf('\n\n')) {
      const data = buffer
        .slice(0, end)
        .split('\n')
        .flatMap((line) => (line.startsWith('data:') ? [line.slice(5).replace(/^ /, '')] : []))
        .join('\n');
      buffer = buffer.slice(end + 2);
      if (data) {
        try {
          yield JSON.parse(data);
        } catch {
          // Not an event of OpenCode's.
        }
      }
    }
  }
}

/** The error an OpenCode server answers with, in its words. */
function errorIn(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const data = isRecord(body.data) ? body.data : {};
    const error = isRecord(body.error) ? body.error : {};

    return stringOf(body.message) ?? stringOf(data.message) ?? stringOf(error.message) ?? stringOf(body.name);
  } catch {
    return stringOf(text) && clip(text, 200);
  }
}

/** What a session's turns need of the session around them. */
interface TurnHost {
  readonly sessionId: string;
  readonly instructions: string;
  readonly stopping: boolean;
  readonly gone: boolean;
  call: Call;
  report(turn: TurnEnded): void;
  /** Ends OpenCode: a turn that doesn't stop by itself is stopped this way. */
  kill(): void;
}

/** How messages become turns, which differs between OpenCode 1 and OpenCode 2. */
interface Turns {
  send(input: SessionInput): void;
  onEvent(event: OpenCodeEvent): void;
  /** Stops the turn running and drops what waits; resolves once each message was reported. */
  stop(): Promise<void>;
  /** The messages not reported yet. */
  readonly owed: number;
  /** Whether a turn runs, or is about to: only then does OpenCode ask anything. */
  readonly working: boolean;
}

/** A turn of OpenCode 1's: the messages it took, as one message of OpenCode's that the listener names. */
type QueuedTurn = {
  inputs: SessionInput[];
  messageId: string;
  since: number;
  busy: boolean;
  /** What OpenCode said went wrong before the turn ended: the turn being stopped, or an error. */
  stopped?: boolean;
  error?: string;
  ending: boolean;
};

/**
 * OpenCode 1 takes a message into the turn running at its next step, but one that comes as the turn ends stays there
 * unanswered. So messages go one prompt at a time, as OpenCode's own `opencode run` sends them: what comes while a
 * turn runs waits for it to end, then goes in the next turn, all together.
 */
class QueuedTurns implements Turns {
  private queued: SessionInput[] = [];
  private turn?: QueuedTurn;
  private poll?: NodeJS.Timeout;

  constructor(private readonly host: TurnHost) {}

  get owed(): number {
    return this.queued.length + (this.turn?.inputs.length ?? 0);
  }

  get working(): boolean {
    return this.turn !== undefined;
  }

  send(input: SessionInput): void {
    this.queued.push(input);
    if (!this.turn) {
      this.next();
    }
  }

  onEvent(event: OpenCodeEvent): void {
    const turn = this.turn;
    if (!turn || !('sessionId' in event) || event.sessionId !== this.host.sessionId) {
      return;
    }

    if (event.type === 'busy') {
      turn.busy = true;
    } else if (event.type === 'error' && event.name === 'MessageAbortedError') {
      turn.stopped = true;
    } else if (event.type === 'error') {
      turn.error ??= event.message ?? event.name ?? 'OpenCode failed.';
    } else if (event.type === 'idle' && (turn.busy || turn.stopped || turn.error)) {
      void this.finish();
    }
  }

  async stop(): Promise<void> {
    // What waits to be handed over doesn't go.
    if (this.queued.length > 0) {
      const dropped = this.queued;
      this.queued = [];
      this.host.report({ inputIds: dropped.map((input) => input.id), outcome: 'interrupted' });
    }
    if (!this.turn) {
      return;
    }

    await this.host.call('POST', `/session/${this.host.sessionId}/abort`).catch(() => undefined);
    const deadline = Date.now() + INTERRUPT_GRACE_MS;
    while (this.turn && !this.host.gone && Date.now() < deadline) {
      await delay(50);
    }
    if (this.turn && !this.host.gone) {
      const { inputs } = this.turn;
      this.end();
      this.host.report({ inputIds: inputs.map((input) => input.id), outcome: 'interrupted' });
      this.host.kill();
    }
  }

  /** Hands what waits to OpenCode as one message of several parts, unless the run stops. */
  private next(): void {
    if (this.queued.length === 0 || this.host.stopping || this.host.gone) {
      return;
    }

    const inputs = this.queued;
    this.queued = [];
    const turn: QueuedTurn = { inputs, messageId: ascendingId('msg'), since: Date.now(), busy: false, ending: false };
    this.turn = turn;
    this.host
      .call('POST', `/session/${this.host.sessionId}/prompt_async`, {
        messageID: turn.messageId,
        system: this.host.instructions,
        parts: inputs.map((input) => ({ type: 'text', text: input.text })),
      })
      .catch((err) => {
        if (this.turn === turn) {
          turn.error = `OpenCode didn’t take the message: ${errorText(err)}`;
          void this.finish();
        }
      });
    this.poll = setInterval(() => void this.look(turn), STATUS_POLL_MS);
    this.poll.unref();
  }

  /** Looks at the session while the turn runs: an end its events missed still ends it. */
  private async look(turn: QueuedTurn): Promise<void> {
    const status = await this.host
      .call<Record<string, { type?: string }>>('GET', '/session/status')
      .catch(() => undefined);
    if (!status || this.turn !== turn) {
      return;
    }

    if (status[this.host.sessionId]?.type && status[this.host.sessionId]?.type !== 'idle') {
      turn.busy = true;
    } else if (turn.busy || Date.now() - turn.since > START_TIMEOUT_MS) {
      void this.finish();
    }
  }

  /** The turn ended: its answer is the last words OpenCode wrote after the message. */
  private async finish(): Promise<void> {
    const turn = this.turn;
    if (!turn || turn.ending) {
      return;
    }

    turn.ending = true;
    const inputIds = turn.inputs.map((input) => input.id);
    let ended: TurnEnded;
    try {
      const messages = await this.host.call<OpenCodeMessage1[]>('GET', `/session/${this.host.sessionId}/message`);
      ended = turnEndOf(inputIds, turn.messageId, messages, {
        stopped: Boolean(turn.stopped) || this.host.stopping,
        error: turn.error,
      });
    } catch (err) {
      ended = { inputIds, outcome: 'failed', error: `OpenCode’s answer couldn’t be read: ${errorText(err)}` };
    }
    if (this.turn !== turn) {
      return;
    }

    this.end();
    this.host.report(ended);
    this.next();
  }

  private end(): void {
    clearInterval(this.poll);
    this.turn = undefined;
  }
}

/** A message of an OpenCode 1 session, as far as a turn's end reads it. */
type OpenCodeMessage1 = {
  info: { id: string; role: string; error?: { name?: string; data?: { message?: string } } | null };
  parts: Array<{ type: string; text?: string; synthetic?: boolean; ignored?: boolean }>;
};

/**
 * How an OpenCode 1 turn ended, from the session's messages: the agent's last words after the turn's own message, or
 * the error its last message ended with (a stopped turn's is `MessageAbortedError`). `said` is what OpenCode said
 * about the turn while it ran.
 */
export function turnEndOf(
  inputIds: string[],
  messageId: string,
  messages: OpenCodeMessage1[],
  said: { stopped: boolean; error?: string }
): TurnEnded {
  const at = messages.findIndex((message) => message.info.id === messageId);
  const answers = at < 0 ? [] : messages.slice(at + 1).filter((message) => message.info.role === 'assistant');
  const last = answers[answers.length - 1];
  const error = last?.info.error;
  if (said.stopped || error?.name === 'MessageAbortedError') {
    return { inputIds, outcome: 'interrupted' };
  }
  if (error || !last) {
    const why =
      error?.data?.message ?? error?.name ?? said.error ?? (at < 0 ? 'OpenCode didn’t take the message.' : undefined);

    return { inputIds, outcome: 'failed', error: why ?? 'OpenCode ended the turn without an answer.' };
  }

  const text = [...answers]
    .reverse()
    .map((message) =>
      message.parts
        .filter((part) => part.type === 'text' && !part.synthetic && !part.ignored)
        .map((part) => part.text ?? '')
        .join('\n\n')
        .trim()
    )
    .find(Boolean);

  return { inputIds, outcome: 'completed', ...(text ? { text } : {}) };
}

/**
 * OpenCode 2 keeps what it is sent in the session's inbox, and steers each message into the turn running at its next
 * step, or starts a turn for it: each message comes back with the turn it was delivered to.
 */
class SteeredTurns implements Turns {
  /** Messages are handed over one after the other, in order. */
  private handing: Promise<void> = Promise.resolve();
  /** Sent, or being sent, and not delivered to a turn yet: OpenCode's message id → ours. */
  private readonly inbox = new Map<string, string>();
  private readonly sending = new Set<string>();
  private execution?: { taken: string[]; said?: { messageId: string; texts: string[] } };
  private stopped?: () => void;

  constructor(private readonly host: TurnHost) {}

  get owed(): number {
    return this.sending.size + this.inbox.size + (this.execution?.taken.length ?? 0);
  }

  get working(): boolean {
    return this.execution !== undefined || this.owed > 0;
  }

  send(input: SessionInput): void {
    this.sending.add(input.id);
    this.handing = this.handing.then(() => this.hand(input));
  }

  private async hand(input: SessionInput): Promise<void> {
    // A stop dropped it while it waited its turn to be handed over.
    if (!this.sending.delete(input.id)) {
      return;
    }

    // Its id is known before OpenCode answers: it may deliver the message before the answer comes.
    const messageId = ascendingId('msg');
    this.inbox.set(messageId, input.id);
    try {
      await this.host.call('POST', `/api/session/${this.host.sessionId}/prompt`, {
        id: messageId,
        text: input.text,
        delivery: 'steer',
      });
      if (this.host.stopping && this.inbox.has(messageId)) {
        await this.withdraw([messageId]);
      }
    } catch (err) {
      if (this.inbox.delete(messageId) && !this.host.gone) {
        this.host.report({
          inputIds: [input.id],
          outcome: 'failed',
          error: `OpenCode didn’t take the message: ${errorText(err)}`,
        });
      }
    }
  }

  onEvent(event: OpenCodeEvent): void {
    if (!('sessionId' in event) || event.sessionId !== this.host.sessionId) {
      return;
    }

    switch (event.type) {
      case 'execution':
        if (event.phase === 'started') {
          this.execution ??= { taken: [] };
        } else {
          this.ended(event.phase, event.error, event.reason);
        }
        break;
      case 'delivered': {
        const inputId = this.inbox.get(event.messageId);
        if (inputId) {
          this.inbox.delete(event.messageId);
          this.execution ??= { taken: [] };
          this.execution.taken.push(inputId);
        }
        break;
      }
      case 'text':
        if (this.execution && event.text.trim()) {
          const said = this.execution.said;
          if (said?.messageId === event.messageId) {
            said.texts.push(event.text);
          } else {
            this.execution.said = { messageId: event.messageId, texts: [event.text] };
          }
        }
        break;
    }
  }

  private ended(phase: 'succeeded' | 'failed' | 'interrupted', error?: string, reason?: string): void {
    const execution = this.execution;
    this.execution = undefined;
    const inputIds = execution?.taken ?? [];
    const text = execution?.said?.texts.join('\n\n').trim();
    // A turn that took no message of ours, nor said anything, is nothing to the core.
    if (inputIds.length > 0 || text) {
      if (phase === 'interrupted' && (reason === 'user' || this.host.stopping)) {
        this.host.report({ inputIds, outcome: 'interrupted' });
      } else if (phase === 'succeeded') {
        this.host.report(
          this.host.stopping ? { inputIds, outcome: 'interrupted' } : { inputIds, outcome: 'completed', text }
        );
      } else {
        const why = error ?? `OpenCode stopped the turn (${reason ?? 'no reason given'}).`;
        this.host.report({ inputIds, outcome: 'failed', error: why });
      }
    }
    this.stopped?.();
  }

  async stop(): Promise<void> {
    // What waits behind a message being handed over doesn't go: it would start a turn once the stop is over.
    if (this.sending.size > 0) {
      const dropped = [...this.sending];
      this.sending.clear();
      this.host.report({ inputIds: dropped, outcome: 'interrupted' });
    }
    // Nor does what waits in the inbox: OpenCode keeps it parked after an interrupt otherwise.
    await this.withdraw([...this.inbox.keys()]);
    if (!this.execution) {
      return;
    }

    const done = new Promise<void>((resolve) => {
      this.stopped = resolve;
    });
    await this.host.call('POST', `/api/session/${this.host.sessionId}/interrupt`).catch(() => undefined);
    if (!(await within(done, INTERRUPT_GRACE_MS)) && this.execution && !this.host.gone) {
      const { taken } = this.execution;
      this.execution = undefined;
      this.host.report({ inputIds: taken, outcome: 'interrupted' });
      this.host.kill();
    }
    this.stopped = undefined;
  }

  /** Takes messages out of the inbox before a turn takes them, and says so for each. */
  private async withdraw(messageIds: string[]): Promise<void> {
    const dropped = messageIds.flatMap((messageId) => {
      const inputId = this.inbox.get(messageId);
      this.inbox.delete(messageId);

      return inputId ? [{ messageId, inputId }] : [];
    });
    if (dropped.length === 0) {
      return;
    }

    this.host.report({ inputIds: dropped.map((each) => each.inputId), outcome: 'interrupted' });
    await Promise.all(
      dropped.map(({ messageId }) =>
        this.host.call('DELETE', `/api/session/${this.host.sessionId}/inbox/${messageId}`).catch(() => undefined)
      )
    );
  }
}

class OpenCodeSession implements HostSession {
  private child?: ChildProcessWithoutNullStreams;
  private exited: Promise<void> = Promise.resolve();
  /** Whether the session is open, once OpenCode says so: messages wait for it. */
  private readonly ready: Promise<boolean>;
  private api?: OpenCodeApi;
  private turns?: Turns;
  private base?: string;
  private sessionId?: string;
  /** Messages sent before the session was open. */
  private early: SessionInput[] = [];
  private readonly password = randomBytes(24).toString('base64url');
  private readonly events = new AbortController();
  private connected?: () => void;
  /** Questions it waits on, by OpenCode's id. */
  private readonly asking = new Map<string, AbortController>();
  /** Each tool call's name and input, by its id: what a permission question about it names. */
  private readonly tools = new Map<string, { name?: string; input: Record<string, unknown>; started: boolean }>();
  /**
   * The MCP servers OpenCode has, by name, which split an MCP tool's name into its server and tool for the operator
   * and for the core. Listed again whenever one changes: OpenCode 2 lists a server only once it starts.
   */
  private mcpServers: string[] = [];
  private mcpListing: Promise<void> = Promise.resolve();
  private stopping = false;
  private closing = false;
  private gone = false;
  private stderr = '';
  /** Ends OpenCode with this program, should this program end without closing the session. */
  private readonly endWithUs = () => this.child?.kill('SIGTERM');

  constructor(
    private readonly options: OpenOptions,
    private readonly handlers: SessionHandlers
  ) {
    this.ready = this.start();
    void this.ready.then((ok) => {
      const early = this.early;
      this.early = [];
      for (const input of early) {
        if (ok && this.turns && !this.stopping) {
          this.turns.send(input);
        }
      }
    });
  }

  /** The session's id once OpenCode opened it; the one to go on with until then. */
  get id(): string {
    return this.sessionId ?? this.options.resume ?? '';
  }

  send(input: SessionInput): boolean {
    if (this.gone || this.closing || this.stopping) {
      return false;
    }

    if (this.turns) {
      this.turns.send(input);
    } else {
      this.early.push(input);
    }

    return true;
  }

  async interrupt(): Promise<void> {
    if (this.gone || this.stopping || this.closing) {
      return;
    }

    this.stopping = true;
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    if (this.early.length > 0) {
      const dropped = this.early;
      this.early = [];
      this.handlers.turnEnded({ inputIds: dropped.map((input) => input.id), outcome: 'interrupted' });
    }

    // A session still opening has no turn to stop yet; one that doesn't open in time is ended.
    if (await Promise.race([this.ready, delay(INTERRUPT_GRACE_MS).then(() => false)])) {
      await this.turns?.stop();
    } else if (!this.gone && this.sessionId === undefined) {
      // Stopped before it ever opened: nothing of it is owed, so its end isn't a loss either.
      this.gone = true;
      this.child?.kill('SIGTERM');
    }
    this.stopping = false;
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    this.events.abort();
    const child = this.child;
    if (child && child.exitCode === null && child.signalCode === null) {
      // OpenCode 2's server ends with its input; OpenCode 1's is told to.
      if (this.api?.major === 2) {
        child.stdin.end();
      } else {
        child.kill('SIGTERM');
      }
      if (!(await within(this.exited, CLOSE_GRACE_MS))) {
        child.kill('SIGTERM');
        if (!(await within(this.exited, CLOSE_GRACE_MS))) {
          child.kill('SIGKILL');
        }
      }
    }
    process.off('exit', this.endWithUs);
  }

  private async start(): Promise<boolean> {
    const timer = setTimeout(() => this.lose('OpenCode didn’t open the session in time.', false), OPEN_TIMEOUT_MS);
    timer.unref();
    const { resume } = this.options;

    try {
      const api = (await this.majorVersion()) >= 2 ? OPENCODE_2 : OPENCODE_1;
      if (this.gone || this.closing) {
        // Stopped or closed while OpenCode said its version: nothing would end the server it started now.
        return false;
      }

      this.api = api;
      this.base = await this.serve(api);
      await this.listen(api);
      const call = this.call;
      const [agentRules] = await Promise.all([api.agentRules(call), this.listMcpServers()]);
      const rules = sessionRules(api.major, agentRules);
      if (resume) {
        await api.resume(call, resume, rules);
      }
      const sessionId = resume ?? (await api.create(call, this.options.project, rules));
      await api.instruct?.(call, sessionId, this.options.instructions);
      this.sessionId = sessionId;
      const host = this.turnHost(sessionId);
      this.turns = api.major === 1 ? new QueuedTurns(host) : new SteeredTurns(host);

      return !this.gone;
    } catch (err) {
      const sessionGone = Boolean(resume) && err instanceof HttpError && err.status === 404;
      this.lose(
        sessionGone
          ? `OpenCode no longer has session ${resume}.`
          : `OpenCode didn’t open the session: ${errorText(err)}`,
        sessionGone
      );

      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /** What the session's turns see of it. */
  private turnHost(sessionId: string): TurnHost {
    const session = this;

    return {
      sessionId,
      instructions: this.options.instructions,
      get stopping() {
        return session.stopping;
      },
      get gone() {
        return session.gone;
      },
      call: this.call,
      report: (turn) => this.handlers.turnEnded(turn),
      kill: () => this.child?.kill('SIGTERM'),
    };
  }

  /** OpenCode's major version, which says which API its server serves. */
  private majorVersion(): Promise<number> {
    const { command, args } = this.options.program;

    return new Promise((resolve, reject) => {
      execFile(
        command,
        [...args, '--version'],
        { encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, env: programEnv(this.options.env ?? process.env) },
        (err, stdout) => {
          const version = versionIn(stdout ?? '');
          if (version) {
            resolve(version.major);
          } else {
            reject(new Error(err ? err.message : 'it didn’t say its version'));
          }
        }
      );
    });
  }

  /** Starts `opencode serve` in the project, and resolves with the address it listens on. */
  private serve(api: OpenCodeApi): Promise<string> {
    const env = Object.fromEntries(
      Object.entries(programEnv(this.options.env ?? process.env)).filter(([name]) => !SERVER_VARIABLES.includes(name))
    );
    // OpenCode 1 lets its tools see the password too: a command that would use it asks the operator first, as any does.
    const child = spawn(this.options.program.command, [...this.options.program.args, ...api.serve], {
      cwd: this.options.project,
      env: { ...env, [api.passwordVariable]: this.password },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    process.once('exit', this.endWithUs);
    this.exited = new Promise((resolve) => {
      child.once('exit', (code, signal) => {
        resolve();
        this.onExit(code, signal);
      });
    });
    // A closed input only means the process is going; what it said last still counts.
    child.stdin.on('error', () => undefined);
    child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString()}`.slice(-4000);
    });

    return new Promise((resolve, reject) => {
      child.once('error', (err) => reject(new Error(`OpenCode didn’t start: ${err.message}`)));
      void this.exited.then(() => reject(new Error(this.why() || 'OpenCode stopped before its server started.')));
      createInterface({ input: child.stdout }).on('line', (line) => {
        const url = serverUrlIn(line);
        if (url) {
          resolve(url);
        }
      });
    });
  }

  /** Follows the server's events from now on; resolves once it says it is connected, so nothing is missed. */
  private async listen(api: OpenCodeApi): Promise<void> {
    const url = new URL(api.eventsPath, this.base);
    const headers: Record<string, string> = { authorization: this.authorization, accept: 'text/event-stream' };
    api.locate(url, headers, this.options.project);
    const response = await fetch(url, { headers, signal: this.events.signal });
    if (!response.ok || !response.body) {
      throw new Error(`its events answered ${response.status}`);
    }

    const connected = new Promise<void>((resolve) => {
      this.connected = resolve;
    });
    void this.follow(api, response.body);
    await connected;
  }

  private async follow(api: OpenCodeApi, body: AsyncIterable<Uint8Array>): Promise<void> {
    try {
      for await (const raw of sentEvents(body)) {
        const event = api.eventOf(raw);
        if (event) {
          this.onEvent(event);
        }
      }
    } catch {
      // The stream ends with the session, or with OpenCode.
    }
    if (!this.closing && !this.gone) {
      this.lose(`OpenCode stopped sending its events${this.why() ? `: ${this.why()}` : '.'}`, false);
    }
  }

  private readonly call: Call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const api = this.api;
    if (!api || !this.base) {
      throw new Error('OpenCode isn’t up yet.');
    }

    const url = new URL(path, this.base);
    const headers: Record<string, string> = { authorization: this.authorization };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    api.locate(url, headers, this.options.project);
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new HttpError(response.status, errorIn(text) ?? `OpenCode answered ${response.status}.`);
    }

    return (text ? JSON.parse(text) : undefined) as T;
  };

  private get authorization(): string {
    return `Basic ${Buffer.from(`opencode:${this.password}`).toString('base64')}`;
  }

  private onEvent(event: OpenCodeEvent): void {
    switch (event.type) {
      case 'connected':
        this.connected?.();
        break;
      case 'mcp':
        void this.listMcpServers();
        break;
      case 'tool':
        this.onTool(event);
        break;
      case 'permission':
        void this.onPermission(event.asked);
        break;
      case 'question':
        void this.onQuestion(event.asked);
        break;
      case 'settled':
        // OpenCode took it back, or answered it another way (a deny takes the session's others with it).
        this.asking.get(event.id)?.abort();
        break;
      default:
        this.turns?.onEvent(event);
    }
  }

  /** A tool call starts or ends: the core hears of the session's own, and every one's input is kept for its question. */
  private onTool(event: Extract<OpenCodeEvent, { type: 'tool' }>): void {
    const tool = this.tools.get(event.callId) ?? { input: {}, started: false };
    this.tools.set(event.callId, tool);
    tool.name = event.name ?? tool.name;
    tool.input = event.input ?? tool.input;
    if (event.sessionId !== this.sessionId) {
      return;
    }

    if (event.state === 'started' && !tool.started) {
      tool.started = true;
      const { note, subject } = describeTool(tool.name ?? 'a tool', tool.input, this.mcpServers);
      this.handlers.progress(note, subject, event.callId);
    } else if (event.state === 'ended' && tool.started) {
      tool.started = false;
      this.handlers.toolEnded(event.callId);
    }
  }

  /**
   * Puts a permission OpenCode asks for to the core, and answers OpenCode: `once`, `always` where it lasts only as
   * long as this server (OpenCode 1), or `reject` with the words the core has for the agent. Only a turn running asks;
   * anything else is a question left over from a turn that stopped, and is denied.
   */
  private async onPermission(asked: Asked): Promise<void> {
    const api = this.api;
    if (!api) {
      return;
    }

    const controller = new AbortController();
    this.asking.set(asked.id, controller);
    try {
      const question = await this.permissionQuestion(api, asked);
      if (controller.signal.aborted) {
        return;
      }

      const answer =
        this.stopping || !this.turns?.working
          ? { optionId: DENY.id }
          : await this.handlers.askPermission(question, controller.signal);
      if (controller.signal.aborted || this.gone || this.closing) {
        return;
      }

      const reply =
        answer.optionId === ALLOW_ONCE.id
          ? 'once'
          : answer.optionId === ALLOW_SESSION.id && question.options.includes(ALLOW_SESSION)
            ? 'always'
            : 'reject';
      await api
        .replyPermission(this.call, asked, reply, reply === 'reject' ? answer.message : undefined)
        .catch(() => undefined);
    } finally {
      this.asking.delete(asked.id);
    }
  }

  /**
   * What the operator is asked for a permission, once the MCP servers it may name are listed: a tool of a server not
   * listed yet has the servers listed again, should OpenCode have said nothing of it.
   */
  private async permissionQuestion(api: OpenCodeApi, asked: Asked): Promise<PermissionQuestion> {
    await this.mcpListing;
    if (asked.name.includes('_') && !PERMISSIONS.has(asked.name) && !mcpToolOf(asked.name, this.mcpServers)) {
      await this.listMcpServers();
    }

    const offerSession = api.major === 1 && asked.always.length > 0;
    const inputs = new Map([...this.tools].map(([id, tool]) => [id, tool.input]));
    const described = describePermission(asked, { inputs, mcpServers: this.mcpServers });

    return {
      ...described,
      details: offerSession ? [...described.details, sessionScope(asked.always)] : described.details,
      options: offerSession ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY],
    };
  }

  /** Lists OpenCode's MCP servers again, after any listing before, so the last one asked is the one kept. */
  private listMcpServers(): Promise<void> {
    const api = this.api;
    if (api) {
      this.mcpListing = this.mcpListing
        .then(() => api.mcpServers(this.call))
        .then(
          (servers) => {
            this.mcpServers = servers;
          },
          () => undefined
        );
    }

    return this.mcpListing;
  }

  /** Questions for the person, from OpenCode's question tool: they go to the conversation. */
  private async onQuestion(asked: AskedQuestion): Promise<void> {
    const api = this.api;
    if (!api) {
      return;
    }

    if (!asked.answerable) {
      await api.decline(this.call, asked, FORM_DECLINED).catch(() => undefined);

      return;
    }

    const controller = new AbortController();
    this.asking.set(asked.id, controller);
    try {
      const answer =
        this.stopping || !this.turns?.working
          ? undefined
          : await this.handlers.askQuestion(asked.question, controller.signal);
      if (controller.signal.aborted || this.gone || this.closing) {
        return;
      }

      await api.answer(this.call, asked, answer).catch(() => undefined);
    } finally {
      this.asking.delete(asked.id);
    }
  }

  private onExit(code: number | null, signal: NodeJS.Signals | null): void {
    process.off('exit', this.endWithUs);
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    if (this.closing || this.gone) {
      this.gone = true;

      return;
    }

    const owed = this.early.length + (this.turns?.owed ?? 0);
    if (owed > 0 || code !== 0) {
      const why = this.why();
      this.lose(`OpenCode stopped (${signal ?? `exit code ${code}`})${why ? `: ${why}` : ''}`, false);
    }
    this.gone = true;
  }

  /** The last lines OpenCode wrote to its error output. */
  private why(): string {
    return stripColors(this.stderr).trim().split('\n').slice(-3).join(' ');
  }

  private lose(error: string, sessionGone: boolean): void {
    if (this.gone) {
      return;
    }

    this.gone = true;
    this.early = [];
    this.events.abort();
    this.child?.kill('SIGTERM');
    this.handlers.lost(error, sessionGone);
  }
}
