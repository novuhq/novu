import { type ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { version } from '../../package.json';
import { CLI_COMMAND } from '../config';
import { shortPath } from './computer';
import type {
  HostAdapter,
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
  isRecord,
  NOBODY_ANSWERED,
  onPath,
  programEnv,
  settingsAmong,
  stringOf,
  stripColors,
  withAccount,
  within,
} from './host-program';
import { METHOD_NOT_FOUND, NO_ANSWER, RpcError, type RpcId, RpcPeer } from './json-rpc';
import { simpleCommandWords } from './own-replies';

/** Codex's own install command for macOS and Linux, as its docs give it. */
const INSTALL_COMMAND = 'curl -fsSL https://chatgpt.com/codex/install.sh | sh';

const SETUP_DOCS_URL = 'https://learn.chatgpt.com/docs/codex/cli';

export const CODEX_MISSING_HELP = `Codex isn’t installed on this computer, or isn’t on its PATH. Install it with \`${INSTALL_COMMAND}\` (or see ${SETUP_DOCS_URL}), run \`codex\` once to sign in, then run this again.`;

export const CODEX_SIGNED_OUT_HELP =
  'Codex isn’t signed in on this computer. Run `codex login` and sign in, then run this again.';

/** How long Codex may take to come up and open the session, before it counts as stuck. */
const OPEN_TIMEOUT_MS = 60_000;

/** How long the check waits for Codex to say which provider it uses. */
const CHECK_TIMEOUT_MS = 30_000;

/** How long a stopped turn may take to wind down before Codex is ended. */
const INTERRUPT_GRACE_MS = 10_000;

/** How long `close` waits for Codex to exit by itself once its input has ended. */
const CLOSE_GRACE_MS = 5_000;

/**
 * Codex's own settings among the shell's variables: where it keeps its config, sign-in and sessions
 * (`CODEX_HOME`, `CODEX_SQLITE_HOME`), and the address it reaches OpenAI at.
 */
const SETTINGS = /^(CODEX_HOME|CODEX_SQLITE_HOME|OPENAI_BASE_URL)$/;

/** The providers Codex has built in besides OpenAI: models on this computer, which need no sign-in. */
const LOCAL_PROVIDERS: Record<string, string> = { oss: 'Ollama', ollama: 'Ollama', lmstudio: 'LM Studio' };

/** The error `thread/resume` gives for a session Codex no longer has. */
const SESSION_GONE = /no rollout found/i;

/** The items of a turn that are tools: each starts, may ask, and ends. */
const TOOL_ITEMS = new Set(['commandExecution', 'fileChange', 'mcpToolCall', 'dynamicToolCall', 'webSearch']);

/** The shells Codex runs a command in, as `<shell> -lc <script>`. */
const SHELLS = new Set(['bash', 'zsh', 'sh', 'dash', 'ksh', 'fish']);

/** Who Codex knows this program as. */
const CLIENT_INFO = { name: 'agentinbox', title: 'Agent Inbox', version };

/**
 * Codex, driven through `codex app-server`: JSON-RPC over its stdio, the interface its own apps use. A session is
 * a Codex thread; each message starts a turn, or joins the one running. It is the operator's own `codex`, with
 * their sign-in, config, MCP servers and plan; nothing of Codex ships with the CLI.
 */
export const codex: HostAdapter = {
  id: 'codex',
  name: 'Codex',
  check: checkCodex,
  settingsIn: (env) => settingsAmong(env, SETTINGS),
  open: (options, handlers) => new CodexSession(options, handlers),
};

/**
 * What Codex is told on top of the listener's instructions: its sandbox has no network, and the CLI's commands need
 * it (and npm's cache, outside the project). Asked for up front, they don't fail once first; the listener allows
 * them for the conversation.
 */
export const SANDBOX_NOTE = `- Codex's sandbox has no network, and Agent Inbox's commands (\`${CLI_COMMAND} …\`) need it: run them with escalated permissions from the start. For this conversation, they still run without asking anyone.`;

/**
 * How a session the listener starts works, named on purpose so the operator's own defaults (`never` asking, or an
 * automatic reviewer) never decide for a run:
 * - `workspace-write`: Codex's sandbox lets its commands write inside the project only, without the network.
 * - `on-request`: Codex asks before anything the sandbox doesn't allow, such as the network or another folder.
 * - `user` answers what it asks: the operator, on their channel.
 * The operator's own developer instructions (`own`) stay, before the listener's: the thread's replace them.
 */
export function threadParams(
  options: Pick<OpenOptions, 'project' | 'instructions'> & { own?: string }
): Record<string, unknown> {
  return {
    cwd: options.project,
    approvalPolicy: 'on-request',
    approvalsReviewer: 'user',
    sandbox: 'workspace-write',
    developerInstructions: [options.own?.trim(), options.instructions, SANDBOX_NOTE].filter(Boolean).join('\n\n'),
  };
}

async function checkCodex(project: string, given: NodeJS.ProcessEnv = process.env): Promise<HostCheck> {
  const env = withAccount(given);
  // The standalone installer's link, which is often only on the PATH of a login shell.
  const command = onPath('codex', env.PATH) ?? executable(join(homedir(), '.local', 'bin', 'codex'));
  if (!command) {
    return { ok: false, message: CODEX_MISSING_HELP };
  }

  const ran = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, env });
  if (ran.status !== 0) {
    const why = firstLine(ran.stderr || ran.error?.message);

    return { ok: false, message: `Codex at ${command} didn’t start${why ? `: ${why}` : ''}. ${CODEX_MISSING_HELP}` };
  }

  const config = await readConfig(command, project, env);
  if (!config.ok) {
    return {
      ok: false,
      message: `Codex at ${command} didn’t start the way the listener drives it (\`codex app-server\`): ${config.message}. Update Codex with \`${INSTALL_COMMAND}\`, then run this again.`,
    };
  }

  const provider = providerOf(config.config);
  if (provider.signsInToOpenAI) {
    const status = spawnSync(command, ['login', 'status'], { encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, env });
    if (status.status !== 0) {
      return { ok: false, message: CODEX_SIGNED_OUT_HELP };
    }
  }

  // Kept as found: the standalone installer's link stays the same path while it updates Codex.
  return {
    ok: true,
    program: { command, args: [] },
    version: /\d+\.\d+\.\d+/.exec(ran.stdout)?.[0],
    warnings: [],
    secrets: provider.envKey && env[provider.envKey]?.trim() ? [provider.envKey] : [],
    ...(provider.name ? { provider: provider.name } : {}),
  };
}

/** What the check reads of Codex's config, as `config/read` gives it for the project. */
type CodexConfig = {
  model_provider?: string | null;
  profile?: string | null;
  profiles?: Record<string, { model_provider?: string | null } | undefined> | null;
  model_providers?: Record<
    string,
    { name?: string | null; env_key?: string | null; requires_openai_auth?: boolean | null } | undefined
  > | null;
};

/**
 * The provider Codex reaches for the project: OpenAI's own, which needs `codex login`, unless the config names
 * another. Another one may sign in with a key from the shell (`env_key`), which the background program goes
 * without, or with nothing, as models on this computer do.
 */
export function providerOf(config: CodexConfig): { name?: string; envKey?: string; signsInToOpenAI: boolean } {
  const id = (config.profile && config.profiles?.[config.profile]?.model_provider) || config.model_provider || 'openai';
  const custom = config.model_providers?.[id];
  if (custom) {
    return {
      name: custom.name || id,
      ...(custom.env_key ? { envKey: custom.env_key } : {}),
      signsInToOpenAI: Boolean(custom.requires_openai_auth),
    };
  }

  return id === 'openai' ? { signsInToOpenAI: true } : { name: LOCAL_PROVIDERS[id] ?? id, signsInToOpenAI: false };
}

/** Codex's config for the project, as its app-server reads it: also whether that app-server works at all. */
async function readConfig(
  command: string,
  project: string,
  env: NodeJS.ProcessEnv
): Promise<{ ok: true; config: CodexConfig } | { ok: false; message: string }> {
  const child = spawn(command, ['app-server'], { cwd: project, env, stdio: ['pipe', 'pipe', 'pipe'] });
  const peer = new RpcPeer(child.stdout, child.stdin, {
    request: async () => {
      throw new RpcError(METHOD_NOT_FOUND, 'Nothing is handled while the listener only reads the config.');
    },
    notification: () => undefined,
  });
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-2000);
  });
  child.stdin.on('error', () => undefined);
  child.once('error', (err) => peer.close(err.message));
  child.once('exit', (code) => peer.close(firstLine(stderr) || `it stopped with exit code ${code}`));
  const timer = setTimeout(() => peer.close('it didn’t answer in time'), CHECK_TIMEOUT_MS);

  try {
    await peer.request('initialize', { clientInfo: CLIENT_INFO, capabilities: null });
    peer.notify('initialized');
    const read = await peer.request<{ config?: CodexConfig }>('config/read', { cwd: project });

    return { ok: true, config: read.config ?? {} };
  } catch (err) {
    return { ok: false, message: errorText(err) };
  } finally {
    clearTimeout(timer);
    child.kill();
  }
}

/**
 * The command as the person reads it: Codex runs one as `/bin/zsh -lc '<script>'`, and the script is what it
 * does. Anything else stays as Codex gave it.
 */
export function unwrapShell(command: string): string {
  const words = simpleCommandWords(command);
  if (words?.length === 3 && SHELLS.has(basename(words[0])) && /^-(l?c|cl)$/.test(words[1])) {
    return words[2];
  }

  return command;
}

const ALLOW_ONCE: PermissionOption = { id: 'allow', label: 'Allow', kind: 'allow_once' };
const ALLOW_SESSION: PermissionOption = { id: 'allow_session', label: 'Allow for this session', kind: 'allow_session' };
const DENY: PermissionOption = { id: 'deny', label: 'Deny', kind: 'deny' };

/** Codex's words for a text the person wrote. */
function textInput(text: string): Array<{ type: 'text'; text: string; text_elements: [] }> {
  return [{ type: 'text', text, text_elements: [] }];
}

type Turn = { id: string; status?: string; error?: { message?: string } | null };

type Item = {
  type?: string;
  id?: string;
  command?: string;
  changes?: Array<{ path?: string }>;
  server?: string;
  tool?: string;
  arguments?: unknown;
  namespace?: string;
  query?: string;
  text?: string;
  phase?: string;
};

type CommandApproval = {
  threadId?: string;
  turnId?: string;
  itemId?: string;
  kind?: string;
  reason?: string | null;
  command?: string | null;
  cwd?: string | null;
  networkApprovalContext?: { host?: string; protocol?: string } | null;
  availableDecisions?: unknown[] | null;
};

type FileChangeApproval = { turnId?: string; itemId?: string; reason?: string | null; grantRoot?: string | null };

type PermissionsApproval = {
  turnId?: string;
  reason?: string | null;
  permissions?: {
    network?: { enabled?: boolean | null } | null;
    fileSystem?: {
      read?: string[] | null;
      write?: string[] | null;
      entries?: Array<{ path?: { type?: string; path?: string; pattern?: string }; access?: string }>;
    } | null;
  };
};

type Elicitation = {
  turnId?: string | null;
  serverName?: string;
  message?: string;
  _meta?: Record<string, unknown> | null;
};

type UserInputRequest = {
  questions?: Array<{
    id: string;
    header?: string;
    question?: string;
    isSecret?: boolean;
    options?: Array<{ label?: string }> | null;
  }>;
};

class CodexSession implements HostSession {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly peer: RpcPeer;
  private readonly exited: Promise<void>;
  /** Whether the session is open, once Codex says so: messages wait for it. */
  private readonly ready: Promise<boolean>;
  private threadId?: string;
  /** Messages are handed over one after the other, in order. */
  private handing: Promise<void> = Promise.resolve();
  /** Messages not handed to Codex yet. */
  private readonly waiting = new Set<string>();
  /** Messages handed over, until Codex says which turn took them. */
  private readonly handed = new Set<string>();
  /** The messages each turn took, until it ends. */
  private readonly turns = new Map<string, string[]>();
  private activeTurn?: string;
  /** How each turn ended: a message whose turn ended before Codex said it took it went with that turn. */
  private readonly ended = new Map<string, TurnEnded['outcome']>();
  /** Each turn's latest words, and whether they are its final answer. */
  private readonly words = new Map<string, { text: string; final: boolean }>();
  /** The files each file change touches, by its item: what its question is about. */
  private readonly fileChanges = new Map<string, string[]>();
  /** Questions it waits on, by request id. */
  private readonly asking = new Map<RpcId, AbortController>();
  private stopping = false;
  private closing = false;
  private gone = false;
  private stderr = '';

  constructor(
    private readonly options: OpenOptions,
    private readonly handlers: SessionHandlers
  ) {
    this.child = spawn(options.program.command, [...options.program.args, 'app-server'], {
      cwd: options.project,
      env: programEnv(options.env ?? process.env),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.exited = new Promise((resolve) => {
      this.child.once('exit', (code, signal) => {
        resolve();
        this.onExit(code, signal);
      });
    });
    this.child.once('error', (err) => {
      this.lose(`Codex didn’t start: ${err.message}`, false);
    });
    // A closed input only means the process is going; what it said last still counts.
    this.child.stdin.on('error', () => undefined);
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString()}`.slice(-4000);
    });
    this.peer = new RpcPeer(this.child.stdout, this.child.stdin, {
      request: (method, params, id) => this.onRequest(method, params, id),
      notification: (method, params) => this.onNotification(method, params),
    });
    this.ready = this.openThread();
  }

  /** The thread's id once Codex opened it; the one to go on with until then. */
  get id(): string {
    return this.threadId ?? this.options.resume ?? '';
  }

  send(input: SessionInput): boolean {
    if (this.gone || this.closing || this.stopping) {
      return false;
    }

    this.waiting.add(input.id);
    this.handing = this.handing.then(() => this.hand(input));

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
    // What waits to be handed over doesn't go.
    if (this.waiting.size > 0) {
      const dropped = [...this.waiting];
      this.waiting.clear();
      this.report({ inputIds: dropped, outcome: 'interrupted' });
    }

    // A session still opening has no turn to stop yet; one that doesn't open in time is ended below.
    const deadline = Date.now() + INTERRUPT_GRACE_MS;
    if (await Promise.race([this.ready, delay(INTERRUPT_GRACE_MS).then(() => false)])) {
      for (const turnId of new Set([this.activeTurn, ...this.turns.keys()])) {
        if (turnId) {
          this.stopTurn(turnId);
        }
      }
    } else if (!this.gone && this.threadId === undefined) {
      // Stopped before it ever opened: nothing of it is owed, so its end isn't a loss either.
      this.gone = true;
      this.child.kill('SIGTERM');
    }

    // The turns report themselves, with the messages they took; if they don't, Codex is ended.
    while ((this.turns.size > 0 || this.handed.size > 0) && !this.gone && Date.now() < deadline) {
      await delay(50);
    }
    if ((this.turns.size > 0 || this.handed.size > 0) && !this.gone) {
      this.report({ inputIds: [...[...this.turns.values()].flat(), ...this.handed], outcome: 'interrupted' });
      this.turns.clear();
      this.handed.clear();
      this.child.kill('SIGTERM');
    }
    this.stopping = false;
  }

  async close(): Promise<void> {
    this.closing = true;
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    if (this.child.exitCode === null && this.child.signalCode === null) {
      this.child.stdin.end();
      if (!(await within(this.exited, CLOSE_GRACE_MS))) {
        this.child.kill('SIGTERM');
        if (!(await within(this.exited, CLOSE_GRACE_MS))) {
          this.child.kill('SIGKILL');
        }
      }
    }
    this.peer.close('The session closed.');
  }

  private async openThread(): Promise<boolean> {
    const { resume } = this.options;
    const timer = setTimeout(() => this.lose('Codex didn’t open the session in time.', false), OPEN_TIMEOUT_MS);
    timer.unref();

    try {
      await this.peer.request('initialize', { clientInfo: CLIENT_INFO, capabilities: null });
      this.peer.notify('initialized');
      const own = await this.peer
        .request<{ config?: { developer_instructions?: string | null } }>('config/read', { cwd: this.options.project })
        .then((read) => read.config?.developer_instructions ?? undefined)
        .catch(() => undefined);
      const params = threadParams({ ...this.options, own });
      const opened = await this.peer.request<{ thread: { id: string } }>(
        resume ? 'thread/resume' : 'thread/start',
        resume ? { threadId: resume, ...params, excludeTurns: true } : params
      );
      this.threadId = opened.thread.id;

      return !this.gone;
    } catch (err) {
      const message = errorText(err);
      const sessionGone = Boolean(resume) && SESSION_GONE.test(message);
      this.lose(sessionGone ? message : `Codex didn’t open the session: ${message}`, sessionGone);

      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Hands a message to Codex: it starts a turn, or joins the one running, as Codex decides. */
  private async hand(input: SessionInput): Promise<void> {
    if (!(await this.ready) || !this.waiting.delete(input.id)) {
      return;
    }

    this.handed.add(input.id);
    try {
      const started = await this.peer.request<{ turn: Turn }>('turn/start', {
        threadId: this.threadId,
        input: textInput(input.text),
      });
      this.handed.delete(input.id);
      this.took(started.turn.id, input.id);
    } catch (err) {
      if (this.handed.delete(input.id) && !this.gone) {
        this.report({
          inputIds: [input.id],
          outcome: 'failed',
          error: `Codex didn’t take the message: ${errorText(err)}`,
        });
      }
    }
  }

  /** A turn took a message: the one running, or one Codex started for it. */
  private took(turnId: string, inputId: string): void {
    const outcome = this.ended.get(turnId);
    if (outcome) {
      // Its turn ended before Codex said it took it: its words went out with that turn.
      this.report({ inputIds: [inputId], outcome });

      return;
    }

    this.turns.set(turnId, [...(this.turns.get(turnId) ?? []), inputId]);
    if (this.stopping) {
      // Taken while the run stops: that turn stops too.
      this.stopTurn(turnId);
    }
  }

  private stopTurn(turnId: string): void {
    void this.peer.request('turn/interrupt', { threadId: this.threadId, turnId }).catch(() => undefined);
  }

  private onExit(code: number | null, signal: NodeJS.Signals | null): void {
    this.peer.close('Codex stopped.');
    for (const controller of this.asking.values()) {
      controller.abort();
    }
    if (this.closing || this.gone) {
      this.gone = true;

      return;
    }

    const owed = this.waiting.size + this.handed.size + this.turns.size;
    if (owed > 0 || code !== 0) {
      const why = stripColors(this.stderr).trim().split('\n').slice(-3).join(' ');
      this.lose(`Codex stopped (${signal ?? `exit code ${code}`})${why ? `: ${why}` : ''}`, false);
    }
    this.gone = true;
  }

  private lose(error: string, sessionGone: boolean): void {
    if (this.gone) {
      return;
    }

    this.gone = true;
    this.waiting.clear();
    this.handed.clear();
    this.turns.clear();
    this.handlers.lost(error, sessionGone);
  }

  private report(turn: TurnEnded): void {
    this.handlers.turnEnded(turn);
  }

  // --- what Codex says ---

  private onNotification(method: string, params: unknown): void {
    const message = (params ?? {}) as {
      threadId?: string;
      turnId?: string;
      turn?: Turn;
      item?: Item;
      requestId?: RpcId;
    };
    switch (method) {
      case 'turn/started':
        if (message.threadId === this.threadId && message.turn) {
          this.activeTurn = message.turn.id;
        }
        break;
      case 'turn/completed':
        if (message.threadId === this.threadId && message.turn) {
          const turn = message.turn;
          // Codex can end a turn before its answer to the `turn/start` that took a message into it is read: which
          // turn took the message is known only from that answer, so the end waits for it.
          if (this.handed.size > 0) {
            void this.handing.then(() => this.turnEnded(turn));
          } else {
            this.turnEnded(turn);
          }
        }
        break;
      case 'item/started':
        if (message.item) {
          this.itemStarted(message.item);
        }
        break;
      case 'item/completed':
        if (message.item) {
          this.itemEnded(message.item, message.turnId);
        }
        break;
      case 'serverRequest/resolved':
        // Codex took a question back (the turn stopped, say): the operator's card goes too.
        if (message.requestId !== undefined) {
          this.asking.get(message.requestId)?.abort();
        }
        break;
    }
  }

  private turnEnded(turn: Turn): void {
    if (this.activeTurn === turn.id) {
      this.activeTurn = undefined;
    }
    const inputIds = this.turns.get(turn.id) ?? [];
    this.turns.delete(turn.id);
    const outcome: TurnEnded['outcome'] =
      turn.status === 'completed'
        ? 'completed'
        : turn.status === 'interrupted' || this.stopping
          ? 'interrupted'
          : 'failed';
    this.ended.set(turn.id, outcome);
    const text = this.words.get(turn.id)?.text.trim();
    this.words.delete(turn.id);
    // A turn that took no message of ours, nor said anything, is nothing to the core.
    if (inputIds.length === 0 && !text) {
      return;
    }

    this.report(
      outcome === 'completed'
        ? { inputIds, outcome, text }
        : outcome === 'interrupted'
          ? { inputIds, outcome }
          : { inputIds, outcome, error: turn.error?.message?.trim() || 'Codex ended the turn with an error.' }
    );
  }

  private itemStarted(item: Item): void {
    if (!item.id || !TOOL_ITEMS.has(item.type ?? '')) {
      return;
    }

    if (item.type === 'fileChange') {
      this.fileChanges.set(
        item.id,
        (item.changes ?? []).flatMap((change) => (change.path ? [change.path] : []))
      );
    }
    const { note, subject } = describeItem(item);
    this.handlers.progress(note, subject, item.id);
  }

  private itemEnded(item: Item, turnId: string | undefined): void {
    if (item.type === 'agentMessage') {
      const text = item.text ?? '';
      const final = item.phase !== 'commentary';
      // The turn's answer is its last final words; words along the way only stand in when there are none.
      if (turnId && text.trim() && (final || !this.words.get(turnId)?.final)) {
        this.words.set(turnId, { text, final });
      }

      return;
    }

    if (item.id && TOOL_ITEMS.has(item.type ?? '')) {
      this.handlers.toolEnded(item.id);
    }
  }

  // --- what Codex asks ---

  private async onRequest(method: string, params: unknown, id: RpcId): Promise<unknown> {
    switch (method) {
      case 'item/commandExecution/requestApproval':
        return this.approveCommand(params as CommandApproval, id);
      case 'item/fileChange/requestApproval':
        return this.approveFileChange(params as FileChangeApproval, id);
      case 'item/permissions/requestApproval':
        return this.approvePermissions(params as PermissionsApproval, id);
      case 'mcpServer/elicitation/request':
        return this.elicitation(params as Elicitation, id);
      case 'item/tool/requestUserInput':
        return this.userInput(params as UserInputRequest, id);
      default:
        // Nothing else is set up (no tools of its own, no other sign-in), so nothing else should come; say so.
        throw new RpcError(METHOD_NOT_FOUND, 'The Agent Inbox listener doesn’t handle this.');
    }
  }

  /** Runs one of its questions past the core, and answers Codex unless it took the question back. */
  private async withQuestion(id: RpcId, ask: (signal: AbortSignal) => Promise<unknown>): Promise<unknown> {
    const controller = new AbortController();
    this.asking.set(id, controller);
    try {
      const answer = await ask(controller.signal);

      return controller.signal.aborted || this.gone ? NO_ANSWER : answer;
    } finally {
      this.asking.delete(id);
    }
  }

  /**
   * Puts a permission question to the core, and turns its answer into Codex's: `allow` and `allowSession` for the
   * two ways to allow, `deny` otherwise, with the words the core has for the agent told to it in the turn.
   */
  private permission<T>(
    id: RpcId,
    turnId: string | undefined,
    question: PermissionQuestion,
    answers: { allow: T; allowSession: T; deny: T }
  ): Promise<unknown> {
    return this.withQuestion(id, async (signal) => {
      if (this.stopping) {
        return answers.deny;
      }

      const answer = await this.handlers.askPermission(question, signal);
      if (answer.optionId === ALLOW_ONCE.id) {
        return answers.allow;
      }
      if (answer.optionId === ALLOW_SESSION.id && question.options.includes(ALLOW_SESSION)) {
        return answers.allowSession;
      }

      if (!signal.aborted) {
        await this.tell(turnId, answer.message);
      }

      return answers.deny;
    });
  }

  /**
   * Codex's own no carries no words, so what the core has for the agent ("Your operator answered in words…")
   * joins the turn, as a message of its own, before the no.
   */
  private async tell(turnId: string | undefined, message: string | undefined): Promise<void> {
    if (!message || !turnId || this.stopping || this.gone) {
      return;
    }

    await this.peer
      .request('turn/steer', { threadId: this.threadId, expectedTurnId: turnId, input: textInput(message) })
      .catch(() => undefined);
  }

  private approveCommand(request: CommandApproval, id: RpcId): Promise<unknown> {
    const offered = request.availableDecisions;
    const offerSession = !offered || offered.includes('acceptForSession');
    const host = request.networkApprovalContext?.host;
    const command = unwrapShell(request.command ?? '');
    const question: PermissionQuestion = host
      ? {
          subject: { kind: 'network', hosts: [host] },
          action: `reach ${host}`,
          brief: 'reach the network',
          details: details(request.reason),
          options: offerSession ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY],
        }
      : {
          subject: { kind: 'command', command, ...(request.cwd ? { cwd: request.cwd } : {}) },
          action: request.kind === 'writeStdin' ? `type into \`${command}\`` : `run \`${command}\``,
          brief: 'run a command',
          details: [
            ...details(request.reason),
            ...(request.cwd && request.cwd !== this.options.project ? [`It runs in ${shortPath(request.cwd)}.`] : []),
          ],
          options: offerSession ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY],
        };

    return this.permission(id, request.turnId, question, {
      allow: { decision: 'accept' },
      allowSession: { decision: 'acceptForSession' },
      deny: { decision: 'decline' },
    });
  }

  private approveFileChange(request: FileChangeApproval, id: RpcId): Promise<unknown> {
    const paths = request.grantRoot ? [request.grantRoot] : (this.fileChanges.get(request.itemId ?? '') ?? []);
    const question: PermissionQuestion = {
      subject: { kind: 'files', paths },
      action: request.grantRoot
        ? `write anywhere in ${shortPath(request.grantRoot)}`
        : paths.length > 0
          ? `edit ${paths.map(shortPath).join(', ')}`
          : 'edit files',
      brief: paths.length === 1 && !request.grantRoot ? 'edit a file' : 'edit files',
      details: details(request.reason),
      options: [ALLOW_ONCE, ALLOW_SESSION, DENY],
    };

    return this.permission(id, request.turnId, question, {
      allow: { decision: 'accept' },
      allowSession: { decision: 'acceptForSession' },
      deny: { decision: 'decline' },
    });
  }

  /** More than its sandbox gives it, asked for ahead: the network, or folders to read or write. */
  private approvePermissions(request: PermissionsApproval, id: RpcId): Promise<unknown> {
    const asked = request.permissions ?? {};
    const network = asked.network?.enabled === true;
    const files = asked.fileSystem;
    const entries = files?.entries ?? [];
    const pathsFor = (access: string, legacy: string[] | null | undefined) => [
      ...(legacy ?? []),
      ...entries.flatMap((entry) =>
        entry.access === access ? [entry.path?.path ?? entry.path?.pattern ?? ''].filter(Boolean) : []
      ),
    ];
    const writes = pathsFor('write', files?.write);
    const reads = pathsFor('read', files?.read);
    const wants = [
      network ? 'use the network' : '',
      writes.length > 0 ? `write to ${writes.map(shortPath).join(', ')}` : '',
      reads.length > 0 ? `read ${reads.map(shortPath).join(', ')}` : '',
    ].filter(Boolean);
    const question: PermissionQuestion = {
      subject:
        writes.length + reads.length > 0
          ? { kind: 'files', paths: [...writes, ...reads] }
          : { kind: 'network', hosts: [] },
      action: wants.join(' and ') || 'have more access than its sandbox gives',
      brief: network && wants.length === 1 ? 'use the network' : 'have more access',
      details: details(request.reason),
      options: [ALLOW_ONCE, ALLOW_SESSION, DENY],
    };
    const granted = { ...(asked.network ? { network: asked.network } : {}), ...(files ? { fileSystem: files } : {}) };

    // Codex gives such access for a turn at the least: that is what "Allow" gives.
    return this.permission(id, request.turnId, question, {
      allow: { permissions: granted, scope: 'turn' },
      allowSession: { permissions: granted, scope: 'session' },
      deny: { permissions: {}, scope: 'turn' },
    });
  }

  /**
   * What an MCP server asks through Codex. Codex asks before calling a tool of one this way, marked
   * `codex_approval_kind: mcp_tool_call`; anything else (a form the server wants filled, a page to sign in on)
   * nobody here can answer, so it is declined.
   */
  private async elicitation(request: Elicitation, id: RpcId): Promise<unknown> {
    const meta = request._meta ?? {};
    const decline = { action: 'decline', content: null, _meta: null };
    if (meta.codex_approval_kind !== 'mcp_tool_call') {
      return decline;
    }

    const server = request.serverName ?? '';
    const tool = stringOf(meta.tool_name) ?? '';
    const input = isRecord(meta.tool_params) ? meta.tool_params : {};
    const persist = Array.isArray(meta.persist) ? meta.persist : [meta.persist];
    const offerSession = persist.includes('session');
    const question: PermissionQuestion = {
      subject: { kind: 'mcp', server, tool, input },
      action: describeMcpCall(server, tool, input),
      brief: briefMcpCall(server, tool),
      details: details(request.message),
      options: offerSession ? [ALLOW_ONCE, ALLOW_SESSION, DENY] : [ALLOW_ONCE, DENY],
    };

    return this.permission(id, request.turnId ?? undefined, question, {
      allow: { action: 'accept', content: null, _meta: null },
      allowSession: { action: 'accept', content: null, _meta: { persist: 'session' } },
      deny: decline,
    });
  }

  /** Questions for the person, from Codex's `request_user_input` tool: they go to the conversation. */
  private userInput(request: UserInputRequest, id: RpcId): Promise<unknown> {
    const asked = request.questions ?? [];
    const answered = (each: (question: (typeof asked)[number]) => string[]) => ({
      answers: Object.fromEntries(asked.map((question) => [question.id, { answers: each(question) }])),
    });
    if (asked.some((question) => question.isSecret)) {
      // A secret is never asked for in a chat.
      return Promise.resolve(
        answered(() => ['Agent Inbox doesn’t ask people for secrets in a chat. Go on without it.'])
      );
    }

    const question: HostQuestion = {
      questions: asked.map((item) => ({
        id: item.id,
        text: item.question || item.header || '',
        options: (item.options ?? []).flatMap((option) => (option.label ? [option.label] : [])),
        multiple: false,
      })),
    };

    return this.withQuestion(id, async (signal) => {
      const answer = this.stopping ? undefined : await this.handlers.askQuestion(question, signal);

      return answered((item) => (answer ? (answer.answers[item.id] ?? []) : [NOBODY_ANSWERED]));
    });
  }
}

/** A tool item as the log reads it ("Shell: npm test"), and what it is, as a permission question names it. */
function describeItem(item: Item): { note: string; subject: PermissionQuestion['subject'] } {
  switch (item.type) {
    case 'commandExecution': {
      const command = unwrapShell(item.command ?? '');

      return { note: `Shell: ${clip(command)}`, subject: { kind: 'command', command } };
    }
    case 'fileChange': {
      const paths = (item.changes ?? []).flatMap((change) => (change.path ? [change.path] : []));

      return { note: `Edit: ${clip(paths.map(shortPath).join(', '))}`, subject: { kind: 'files', paths } };
    }
    case 'mcpToolCall': {
      const server = item.server ?? '';
      const tool = item.tool ?? '';

      return {
        note: `MCP: ${tool} from ${server}`,
        subject: { kind: 'mcp', server, tool, input: isRecord(item.arguments) ? item.arguments : {} },
      };
    }
    case 'webSearch':
      return {
        note: `Web search${item.query ? `: ${clip(item.query)}` : ''}`,
        subject: { kind: 'network', hosts: [] },
      };
    default:
      return {
        note: item.tool ?? item.type ?? 'a tool',
        subject: { kind: 'tool', name: item.tool ?? item.type ?? '' },
      };
  }
}
