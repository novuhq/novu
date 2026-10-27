import { type ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { accessSync, constants, readFileSync, realpathSync } from 'node:fs';
import { homedir, userInfo } from 'node:os';
import { delimiter, join } from 'node:path';
import { createInterface } from 'node:readline';
import { HOST_MARKER_VARIABLES } from '../host';
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

/** Claude Code's own install command for macOS, Linux and WSL, as its setup docs give it. */
const INSTALL_COMMAND = 'curl -fsSL https://claude.ai/install.sh | bash';

const SETUP_DOCS_URL = 'https://code.claude.com/docs/en/setup';

export const CLAUDE_CODE_MISSING_HELP = `Claude Code isn’t installed on this computer, or isn’t on its PATH. Install it with \`${INSTALL_COMMAND}\` (or see ${SETUP_DOCS_URL}), run \`claude\` once to sign in, then run this again.`;

export const CLAUDE_CODE_SIGNED_OUT_HELP =
  'Claude Code isn’t signed in on this computer. Run `claude` once and sign in, then run this again.';

/** How long a stopped turn may take to wind down before its process is ended. */
const INTERRUPT_GRACE_MS = 10_000;

/** How long `close` waits for Claude Code to exit by itself once its input has ended. */
const CLOSE_GRACE_MS = 5_000;

/** The longest command or path a progress line keeps. */
const NOTE_LENGTH = 120;

/**
 * Variables a parent Claude Code session (an agent that ran `listen --foreground`, say) leaves in the
 * environment. The session the listener starts is one of its own, so they go, with every host's marks.
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
];

/**
 * Claude Code, driven in print mode with stream-json both ways: messages go in on stdin while it works, and
 * everything it does comes out on stdout, one JSON object a line. It is the operator's own `claude`, with
 * their sign-in, settings, plugins and plan; nothing of Claude Code ships with the CLI.
 */
export const claudeCode: HostAdapter = {
  id: 'claude-code',
  name: 'Claude Code',
  check: checkClaude,
  open: (options, handlers) => new ClaudeCodeSession(options, handlers),
};

/**
 * The flags of a session the listener starts, as Claude Code 2.1.310 takes them:
 * - `-p` with `--input-format` and `--output-format stream-json`, which needs `--verbose`.
 * - `--permission-prompt-tool stdio` sends its permission questions here as `can_use_tool` requests. It is
 *   what the Agent SDK passes; without it, print mode denies them by itself.
 * - `--permission-mode acceptEdits`: edits and file commands inside the project go ahead, and so does what the
 *   user's and the project's settings allow; anything else asks. Named on purpose, so the operator's own
 *   default mode (`auto`, say) never decides for a run.
 * - `--session-id` names a new session, so its id is known before it starts; `--resume` goes on with one.
 */
export function claudeArgs(
  options: Pick<OpenOptions, 'instructions'> & { sessionId: string; resume: boolean }
): string[] {
  return [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-mode',
    'acceptEdits',
    '--permission-prompts',
    'host',
    '--permission-prompt-tool',
    'stdio',
    '--append-system-prompt',
    options.instructions,
    options.resume ? '--resume' : '--session-id',
    options.sessionId,
  ];
}

function checkClaude(project: string, given: NodeJS.ProcessEnv = process.env): HostCheck {
  const env = withAccount(given);
  // The native installer's launcher, which is often only on the PATH of a login shell.
  const command = onPath('claude', env.PATH) ?? executable(join(homedir(), '.local', 'bin', 'claude'));
  if (!command) {
    return { ok: false, message: CLAUDE_CODE_MISSING_HELP };
  }

  const ran = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 30_000, env });
  if (ran.status !== 0) {
    const why = (ran.stderr || ran.error?.message || '').trim().split('\n')[0];

    return {
      ok: false,
      message: `Claude Code at ${command} didn’t start${why ? `: ${why}` : ''}. ${CLAUDE_CODE_MISSING_HELP}`,
    };
  }

  if (signedOut(command, env)) {
    return { ok: false, message: CLAUDE_CODE_SIGNED_OUT_HELP };
  }

  // Kept as found: the native installer's launcher stays the same path while it updates Claude Code.
  return {
    ok: true,
    program: { command, args: [] },
    version: /\d+\.\d+\.\d+/.exec(ran.stdout)?.[0],
    warnings: untrustedProject(project, env) ? [untrustedWarning(project)] : [],
  };
}

/**
 * Whether Claude Code says it isn't signed in. Only `loggedIn` is read (the answer also names the account).
 * Bedrock, Vertex and the like sign in their own way, and an answer that can't be read doesn't stop anything.
 */
function signedOut(command: string, env: NodeJS.ProcessEnv): boolean {
  const ran = spawnSync(command, ['auth', 'status', '--json'], { encoding: 'utf8', timeout: 30_000, env });
  try {
    const status = JSON.parse(ran.stdout) as { loggedIn?: unknown; apiProvider?: unknown };

    return status.loggedIn === false && (status.apiProvider ?? 'firstParty') === 'firstParty';
  } catch {
    return false;
  }
}

/**
 * A project Claude Code hasn't been opened in and trusted: print mode then ignores the project's own allow
 * list (`.claude/settings.json`), so more of its commands ask the operator. Read only.
 */
export function untrustedProject(project: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!projectAllowList(project)) {
    return false;
  }

  try {
    const config = JSON.parse(readFileSync(join(env.CLAUDE_CONFIG_DIR || homedir(), '.claude.json'), 'utf8')) as {
      projects?: Record<string, { hasTrustDialogAccepted?: boolean }>;
    };
    const projects = config.projects ?? {};
    const real = realpathOr(project);

    return !(projects[project]?.hasTrustDialogAccepted || projects[real]?.hasTrustDialogAccepted);
  } catch {
    return true;
  }
}

function projectAllowList(project: string): boolean {
  try {
    const settings = JSON.parse(readFileSync(join(project, '.claude', 'settings.json'), 'utf8')) as {
      permissions?: { allow?: unknown[]; additionalDirectories?: unknown[] };
    };

    return Boolean(settings.permissions?.allow?.length || settings.permissions?.additionalDirectories?.length);
  } catch {
    return false;
  }
}

export function untrustedWarning(project: string): string {
  return `Claude Code hasn’t been opened in ${shortPath(project)} yet, so the project’s own allow list won’t apply until it is: open Claude Code there once and trust the folder. Until then, more of its commands ask you.`;
}

function realpathOr(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

function onPath(name: string, path: string | undefined): string | undefined {
  for (const folder of (path ?? '').split(delimiter)) {
    const found = folder ? executable(join(folder, name)) : undefined;
    if (found) {
      return found;
    }
  }

  return undefined;
}

function executable(file: string): string | undefined {
  try {
    accessSync(file, constants.X_OK);

    return file;
  } catch {
    return undefined;
  }
}

/** The environment a session the listener starts runs in: the program's own, without a parent session's marks. */
export function sessionEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const dropped = new Set([...PARENT_SESSION_VARIABLES, ...HOST_MARKER_VARIABLES]);

  return withAccount(Object.fromEntries(Object.entries(env).filter(([name]) => !dropped.has(name))));
}

/**
 * Claude Code finds its sign-in in the Keychain under the account `USER` names, and a service launchd starts has
 * no `USER` (nor `LOGNAME` or `HOME`): the account this program runs as stands in, else it says it isn't signed in.
 */
function withAccount(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
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

/** One line of Claude Code's stream-json output, as far as the listener reads it. */
type Line = {
  type?: string;
  subtype?: string;
  request_id?: string;
  request?: CanUseToolRequest & { subtype?: string };
  response?: { request_id?: string };
  message?: { content?: unknown };
  command_uuid?: string;
  state?: string;
  is_error?: boolean;
  result?: string;
  terminal_reason?: string;
  errors?: string[];
  user_message_uuid?: string;
  user_message_uuids?: string[];
};

/** Claude Code's permission question, as `--permission-prompt-tool stdio` sends it. */
type CanUseToolRequest = {
  tool_name?: string;
  display_name?: string;
  input?: Record<string, unknown>;
  /** Claude Code's own words for the call, e.g. "Create an empty file in parent directory". */
  description?: string;
  decision_reason?: string;
  /** The file outside the project that made it ask, when that is why. */
  blocked_path?: string;
  /** Rules that would let it through next time; the listener only ever takes them for the session. */
  permission_suggestions?: Array<{ type?: string; rules?: unknown[]; behavior?: string; destination?: string }>;
  /** Claude Code asks not to offer an "always". */
  suppress_always_allow_rule?: boolean;
};

/** The error a `--resume` of a session Claude Code no longer has ends with. */
const SESSION_GONE = /No conversation found/i;

const ALLOW_ONCE: PermissionOption = { id: 'allow', label: 'Allow', kind: 'allow_once' };
const ALLOW_SESSION: PermissionOption = { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' };
const DENY: PermissionOption = { id: 'deny', label: 'Deny', kind: 'deny' };

class ClaudeCodeSession implements HostSession {
  readonly id: string;
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly exited: Promise<void>;
  private readonly handlers: SessionHandlers;
  /** Our inputs by the uuid Claude Code knows them by, until a turn reports them. */
  private readonly inputs = new Map<string, string>();
  /** Questions it waits on, by request id. */
  private readonly asking = new Map<string, AbortController>();
  private readonly controlAnswers = new Map<string, () => void>();
  private stopping = false;
  private closing = false;
  private gone = false;
  private stderr = '';

  constructor(options: OpenOptions, handlers: SessionHandlers) {
    this.handlers = handlers;
    this.id = options.resume ?? randomUUID();
    this.child = spawn(
      options.program.command,
      [
        ...options.program.args,
        ...claudeArgs({ instructions: options.instructions, sessionId: this.id, resume: Boolean(options.resume) }),
      ],
      { cwd: options.project, env: sessionEnv(options.env ?? process.env), stdio: ['pipe', 'pipe', 'pipe'] }
    );
    this.exited = new Promise((resolve) => {
      this.child.once('exit', (code, signal) => {
        resolve();
        this.onExit(code, signal);
      });
    });
    this.child.once('error', (err) => {
      this.lose(`Claude Code didn’t start: ${err.message}`, false);
    });
    // A closed input only means the process is going; what it said last still counts.
    this.child.stdin.on('error', () => {});
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString()}`.slice(-4000);
    });
    createInterface({ input: this.child.stdout }).on('line', (line) => this.read(line));
  }

  send(input: SessionInput): boolean {
    if (this.gone || this.closing || this.stopping || !this.child.stdin.writable) {
      return false;
    }

    const uuid = randomUUID();
    this.inputs.set(uuid, input.id);
    // Without a priority, Claude Code reads it as soon as the tools it is running finish, in the same turn.
    this.write({
      type: 'user',
      message: { role: 'user', content: input.text },
      parent_tool_use_id: null,
      session_id: '',
      uuid,
    });

    return true;
  }

  async interrupt(): Promise<void> {
    // A session already closing has nothing left to stop, and no input to send the request on.
    if (this.gone || this.stopping || this.closing || !this.child.stdin.writable) {
      return;
    }

    this.stopping = true;
    for (const controller of this.asking.values()) {
      controller.abort();
    }

    const requestId = `interrupt_${randomUUID()}`;
    const answered = new Promise<void>((resolve) => this.controlAnswers.set(requestId, resolve));
    // `cancel_queued` drops the messages waiting behind the turn as well.
    this.write({
      type: 'control_request',
      request_id: requestId,
      request: { subtype: 'interrupt', cancel_queued: true },
    });
    await Promise.race([answered, this.exited, delay(INTERRUPT_GRACE_MS)]);

    // The turn reports itself, and the inputs dropped with it; if it doesn't, it is ended.
    const deadline = Date.now() + INTERRUPT_GRACE_MS;
    while (this.inputs.size > 0 && !this.gone && Date.now() < deadline) {
      await delay(50);
    }
    if (this.inputs.size > 0 && !this.gone) {
      this.report({ inputIds: [...this.inputs.values()], outcome: 'interrupted' });
      this.inputs.clear();
      this.child.kill('SIGTERM');
    }
    this.stopping = false;
  }

  async close(): Promise<void> {
    this.closing = true;
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.stdin.end();
      if (!(await within(this.exited, CLOSE_GRACE_MS))) {
        this.child.kill('SIGTERM');
        if (!(await within(this.exited, CLOSE_GRACE_MS))) {
          this.child.kill('SIGKILL');
        }
      }
    }
    for (const controller of this.asking.values()) {
      controller.abort();
    }
  }

  private onExit(code: number | null, signal: NodeJS.Signals | null): void {
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    if (this.closing || this.gone) {
      this.gone = true;

      return;
    }

    if (this.inputs.size > 0 || code !== 0) {
      const why = this.stderr.trim().split('\n').slice(-3).join(' ');
      this.lose(
        `Claude Code stopped (${signal ?? `exit code ${code}`})${why ? `: ${why}` : ''}`,
        SESSION_GONE.test(this.stderr)
      );
    }
    this.gone = true;
  }

  private lose(error: string, sessionGone: boolean): void {
    if (this.gone) {
      return;
    }

    this.gone = true;
    this.inputs.clear();
    this.handlers.lost(error, sessionGone);
  }

  private write(message: unknown): void {
    if (this.child.stdin.writable) {
      this.child.stdin.write(`${JSON.stringify(message)}\n`);
    }
  }

  private read(raw: string): void {
    let line: Line;
    try {
      line = JSON.parse(raw) as Line;
    } catch {
      return;
    }

    switch (line.type) {
      case 'assistant':
        for (const use of toolUses(line.message?.content)) {
          this.handlers.progress(use.note, use.subject, use.id);
        }
        break;
      case 'user':
        // A tool's result comes back as the user's: the tool ended.
        for (const id of toolResults(line.message?.content)) {
          this.handlers.toolEnded(id);
        }
        break;
      case 'control_request':
        this.answerControl(line);
        break;
      case 'control_cancel_request':
        // Claude Code withdrew the question (on an interrupt, say): the operator's card goes too.
        if (line.request_id) {
          this.asking.get(line.request_id)?.abort();
        }
        break;
      case 'control_response':
        if (line.response?.request_id) {
          this.controlAnswers.get(line.response.request_id)?.();
          this.controlAnswers.delete(line.response.request_id);
        }
        break;
      case 'command_lifecycle':
        // A message dropped from the queue gets no turn of its own.
        if (line.state === 'cancelled' && line.command_uuid && this.inputs.has(line.command_uuid)) {
          this.report({ inputIds: [this.takeInput(line.command_uuid)], outcome: 'interrupted' });
        }
        break;
      case 'result':
        this.readResult(line);
        break;
    }
  }

  private takeInput(uuid: string): string {
    const id = this.inputs.get(uuid) ?? uuid;
    this.inputs.delete(uuid);

    return id;
  }

  private readResult(line: Line): void {
    const errors = line.errors ?? [];
    if (line.is_error && errors.some((error) => SESSION_GONE.test(error))) {
      this.lose(errors.join(' '), true);

      return;
    }

    // One result a turn. A CLI that doesn't list what the turn answered answered everything sent so far.
    const uuids =
      line.user_message_uuids ?? (line.user_message_uuid ? [line.user_message_uuid] : [...this.inputs.keys()]);
    const inputIds = uuids.filter((uuid) => this.inputs.has(uuid)).map((uuid) => this.takeInput(uuid));
    const aborted = /^aborted/.test(line.terminal_reason ?? '');
    // A turn that failed to run lists `errors`; one whose model call failed ("Not logged in · Please run /login")
    // gives the reason as its answer.
    const reason = errors.join(' ') || (line.result ?? '').trim();

    this.report(
      !line.is_error
        ? { inputIds, outcome: 'completed', text: (line.result ?? '').trim() }
        : aborted || this.stopping
          ? { inputIds, outcome: 'interrupted' }
          : { inputIds, outcome: 'failed', error: reason || 'Claude Code ended the turn with an error.' }
    );
  }

  private report(turn: TurnEnded): void {
    this.handlers.turnEnded(turn);
  }

  private answerControl(line: Line): void {
    const requestId = line.request_id;
    if (!requestId) {
      return;
    }

    if (line.request?.subtype !== 'can_use_tool') {
      // Nothing else is set up (no hooks, no SDK MCP servers), so nothing else should come; say so rather than hang.
      this.write({
        type: 'control_response',
        response: {
          subtype: 'error',
          request_id: requestId,
          error: 'The Agent Inbox listener doesn’t handle this.',
        },
      });

      return;
    }

    void (line.request.tool_name === 'AskUserQuestion'
      ? this.question(requestId, line.request)
      : this.permission(requestId, line.request));
  }

  /** Runs one of its questions past the core, and answers Claude Code unless it withdrew the question. */
  private async withQuestion(requestId: string, ask: (signal: AbortSignal) => Promise<object>): Promise<void> {
    const controller = new AbortController();
    this.asking.set(requestId, controller);
    const response = await ask(controller.signal).catch((err: unknown) => ({
      behavior: 'deny',
      message: `It couldn’t be asked (${err instanceof Error ? err.message : String(err)}), so it isn’t allowed.`,
    }));
    this.asking.delete(requestId);

    if (!controller.signal.aborted && !this.gone) {
      this.write({ type: 'control_response', response: { subtype: 'success', request_id: requestId, response } });
    }
  }

  private permission(requestId: string, request: CanUseToolRequest): Promise<void> {
    const input = request.input ?? {};
    const sessionRules = (request.permission_suggestions ?? []).filter(
      (suggestion) => suggestion.type === 'addRules' && suggestion.behavior === 'allow' && suggestion.rules?.length
    );
    const offerSession = sessionRules.length > 0 && !request.suppress_always_allow_rule;
    const question: PermissionQuestion = {
      subject: subjectOf(request),
      action: describeAction(request),
      brief: describeBrief(request),
      details: describeDetails(request),
      options: offerSession ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY],
    };

    return this.withQuestion(requestId, async (signal) => {
      if (this.stopping) {
        return { behavior: 'deny', message: 'The run was stopped.' };
      }

      const answer = await this.handlers.askPermission(question, signal);
      if (answer.optionId === ALLOW_ONCE.id) {
        // The input as Claude Code sent it: a changed one would run without the model knowing.
        return { behavior: 'allow', updatedInput: input };
      }
      if (answer.optionId === ALLOW_SESSION.id && offerSession) {
        // Its own suggested rules, kept for this session only: nothing is written to the person's settings.
        return {
          behavior: 'allow',
          updatedInput: input,
          updatedPermissions: sessionRules.map((suggestion) => ({ ...suggestion, destination: 'session' })),
        };
      }

      return { behavior: 'deny', message: answer.message ?? 'It isn’t allowed.' };
    });
  }

  /** `AskUserQuestion`: the questions go to the person in the conversation, and their answers come back. */
  private question(requestId: string, request: CanUseToolRequest): Promise<void> {
    const input = request.input ?? {};
    const asked = Array.isArray(input.questions) ? (input.questions as AskedQuestion[]) : [];
    const question: HostQuestion = {
      questions: asked.map((item, index) => ({
        id: item.question ?? String(index),
        text: item.question ?? '',
        options: (item.options ?? []).map((option) => option.label ?? '').filter(Boolean),
        multiple: Boolean(item.multiSelect),
      })),
    };

    return this.withQuestion(requestId, async (signal) => {
      const answer: HostAnswer | undefined = this.stopping
        ? undefined
        : await this.handlers.askQuestion(question, signal);
      if (!answer) {
        return {
          behavior: 'deny',
          message: 'Nobody answered in time. Go on with your best judgment, or ask again in the conversation later.',
        };
      }

      // Claude Code takes the answers by question text, with several picks joined.
      const answers = Object.fromEntries(
        question.questions.map((item) => [item.text, (answer.answers[item.id] ?? []).join(', ')])
      );

      return { behavior: 'allow', updatedInput: { ...input, answers } };
    });
  }
}

type AskedQuestion = { question?: string; options?: Array<{ label?: string }>; multiSelect?: boolean };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref();
  });
}

async function within(promise: Promise<void>, ms: number): Promise<boolean> {
  return Promise.race([promise.then(() => true), delay(ms).then(() => false)]);
}

function clip(text: string, length = NOTE_LENGTH): string {
  const line = text.replace(/\s+/g, ' ').trim();

  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
}

/** Ends with a full stop, unless it ends with its own punctuation. */
function sentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function hostOf(url: string): string[] {
  try {
    return [new URL(url).hostname];
  } catch {
    return [];
  }
}

/** What is asked for, so the core can tell the agent's own replies from everything else. */
export function subjectOf(request: CanUseToolRequest): PermissionQuestion['subject'] {
  const input = request.input ?? {};
  const tool = request.tool_name ?? '';
  const path =
    stringOf(input.file_path) ?? stringOf(input.notebook_path) ?? stringOf(input.path) ?? request.blocked_path;

  if (tool === 'Bash' || tool === 'PowerShell') {
    return { kind: 'command', command: stringOf(input.command) ?? '' };
  }
  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Read', 'Glob', 'Grep'].includes(tool)) {
    return { kind: 'files', paths: path ? [path] : [] };
  }
  if (tool === 'WebFetch') {
    return { kind: 'network', hosts: hostOf(stringOf(input.url) ?? '') };
  }
  if (tool === 'WebSearch') {
    return { kind: 'network', hosts: [] };
  }
  if (tool.startsWith('mcp__')) {
    // Claude Code names an MCP server's tools `mcp__<server>__<tool>`.
    const [, server = '', ...name] = tool.split('__');

    return { kind: 'mcp', server, tool: name.join('__'), input };
  }
  if (tool) {
    return { kind: 'tool', name: tool };
  }

  return { kind: 'other' };
}

/**
 * What Claude Code asks to do, as the operator reads it on their phone. A command or an address is given whole,
 * as it would run: the operator allows what they read.
 */
export function describeAction(request: CanUseToolRequest): string {
  const input = request.input ?? {};
  const tool = request.tool_name ?? 'a tool';
  const path = stringOf(input.file_path) ?? stringOf(input.notebook_path) ?? stringOf(input.path);

  switch (tool) {
    case 'Bash':
    case 'PowerShell':
      return `run \`${stringOf(input.command) ?? ''}\``;
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
      return path ? `edit ${shortPath(path)}` : 'edit a file';
    case 'Read':
    case 'Glob':
    case 'Grep':
      return path || request.blocked_path ? `read ${shortPath(path ?? request.blocked_path ?? '')}` : 'read files';
    case 'WebFetch':
      return stringOf(input.url) ? `fetch ${String(input.url)}` : 'fetch a web page';
    case 'WebSearch':
      return stringOf(input.query) ? `search the web for “${clip(String(input.query))}”` : 'search the web';
  }

  if (tool.startsWith('mcp__')) {
    const [, server, name] = tool.split('__');

    return `use ${name ?? tool} from ${server ?? 'an MCP server'}`;
  }

  return `use ${request.display_name ?? tool}`;
}

/** What `describeAction` says, short, for a card title the whole doesn't fit. */
export function describeBrief(request: CanUseToolRequest): string {
  switch (request.tool_name) {
    case 'Bash':
    case 'PowerShell':
      return 'run a command';
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
    case 'NotebookEdit':
      return 'edit a file';
    case 'Read':
    case 'Glob':
    case 'Grep':
      return 'read files';
    case 'WebFetch':
      return 'fetch a web page';
    case 'WebSearch':
      return 'search the web';
    default:
      // An MCP tool or another tool goes by its name, which is short already.
      return describeAction(request);
  }
}

function describeDetails(request: CanUseToolRequest): string[] {
  return [
    stringOf(request.description) ? sentence(clip(String(request.description), 300)) : '',
    request.blocked_path ? `It reaches outside the project: ${shortPath(request.blocked_path)}.` : '',
  ].filter(Boolean);
}

/**
 * Each tool an assistant message starts: "Bash: npm test" for the log, what it is, as `subjectOf` says, and its id,
 * which its result names.
 */
function toolUses(content: unknown): Array<{ note: string; subject: PermissionQuestion['subject']; id?: string }> {
  if (!Array.isArray(content)) {
    return [];
  }

  return content.flatMap((block: { type?: string; id?: string; name?: string; input?: Record<string, unknown> }) => {
    if (block?.type !== 'tool_use' || !block.name) {
      return [];
    }

    const input = block.input ?? {};
    const what = stringOf(input.command) ?? stringOf(input.file_path) ?? stringOf(input.url) ?? stringOf(input.pattern);

    return [
      {
        note: what ? `${block.name}: ${clip(what)}` : block.name,
        subject: subjectOf({ tool_name: block.name, input }),
        ...(block.id ? { id: block.id } : {}),
      },
    ];
  });
}

/** The tools whose results a user message brings back, by their ids. */
function toolResults(content: unknown): string[] {
  if (!Array.isArray(content)) {
    return [];
  }

  return content.flatMap((block: { type?: string; tool_use_id?: string }) =>
    block?.type === 'tool_result' && block.tool_use_id ? [block.tool_use_id] : []
  );
}
