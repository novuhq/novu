import {
  type CreateInteractionInput,
  cancelInteraction,
  createInteraction,
  getInteraction,
  type Interaction,
} from '../api/agent-inbox';
import type { ApiClient } from '../api/client';
import { type ConversationView, getConversation } from '../api/inbox';
import {
  AGENT_PAUSED_CODE,
  errorCode,
  INVALID_LISTEN_CURSOR_CODE,
  isKeyRejected,
  LISTENING_ELSEWHERE_CODE,
  type ListenMessage,
  type ListenMessagesPage,
  listeningOf,
  NOT_LISTENING_CODE,
  releaseLease,
  showTyping,
  takeLease,
  waitForListenMessages,
} from '../api/listen';
import { projectLabel } from './computer';
import type {
  HostAdapter,
  HostAnswer,
  HostQuestion,
  HostSession,
  PermissionAnswer,
  PermissionQuestion,
  TurnEnded,
} from './host-adapter';
import { hostNameOf } from './hosts';
import { isOwnReplySubject, repliesIn, waitsForAnswerIn } from './own-replies';
import { IDS_KEPT, type ListenState, SESSIONS_KEPT, type StateStore, type StopReason } from './state';
import { Typing } from './typing';
import {
  clipCard,
  hostInstructions,
  hourlyLimitNotice,
  interruptedReply,
  KEY_CHANGED_MESSAGE,
  messageForHost,
  movedMessage,
  NOTHING_TO_STOP_REPLY,
  permissionCard,
  questionCard,
  runFailedNotice,
  runLimitReply,
  STOPPED_REPLY,
  spanWords,
  startedBy,
  TOO_LONG_TO_ASK,
} from './words';

const HOUR_MS = 3_600_000;

/** Messages older than this aren't worth a run: the API never sends them, and the queue drops them too. */
const STALE_MS = 24 * HOUR_MS;

/** The most messages one look at a conversation reads (the API's most), and how many looks back a reply is sought. */
const PAGE_LIMIT = 100;
const PAGES_BACK = 10;

export interface ListenTiming {
  /** How long the server holds one wait for messages, in seconds. */
  waitSeconds: number;
  /** How often a paused agent is tried again. */
  pausedRetryMs: number;
  /** How long to wait after one, two, three… failures in a row. */
  retryMs: readonly number[];
  /** How long the operator has to answer a permission question, and a person a question from the agent. */
  questionTimeoutMs: number;
  /**
   * How often a question's answer is looked up. It usually comes sooner, with the messages (`answer`); this is
   * for when it doesn't.
   */
  answerPollMs: number;
  /** How often "typing…" goes again while the host works: a chat drops it after a few seconds (Telegram five). */
  typingMs: number;
  /** Renews the lease this often instead of when the API says (tests). */
  renewMs?: number;
}

export const DEFAULT_TIMING: ListenTiming = {
  waitSeconds: 25,
  // "Every few minutes", as the contract has it: a pause is the operator's choice, not an outage.
  pausedRetryMs: 3 * 60_000,
  retryMs: [5_000, 15_000, 30_000, 60_000],
  // Ten minutes, as Inkbox gives its own: time to notice a phone, short enough that no run hangs for hours.
  questionTimeoutMs: 10 * 60_000,
  answerPollMs: 5_000,
  typingMs: 4_000,
};

export interface ListenLoopOptions {
  client: ApiClient;
  agentIdentifier: string;
  /** The operator's contact id: permission questions and notices go to them. */
  operatorId: string;
  computerId: string;
  computerName: string;
  host: HostAdapter;
  store: StateStore;
  timing?: Partial<ListenTiming>;
  log?: (line: string) => void;
  /** Ends the loop: the background service is being stopped. */
  signal?: AbortSignal;
}

export type LoopEnd = { reason: 'signal' } | { reason: StopReason; message: string };

/** How a session's run ended. */
type RunOutcome = { kind: 'idle' } | { kind: 'interrupted' } | { kind: 'lost'; error: string; sessionGone: boolean };

/** The run in progress: one conversation's session in one round, and what it was started with. */
interface ActiveRun {
  conversationId: string;
  round: number;
  channel: string;
  /** Whose message started it, as the operator reads it in a question: "you" or a contact's name. */
  startedBy: string;
  /** Every message this run carries, so a run can start again with them. */
  messages: ListenMessage[];
  session?: HostSession;
  /** Messages handed to the host that no turn has answered yet. */
  pending: Set<string>;
  /**
   * The host's commands that asked in the conversation and wait for the answer, by tool id: an answer to the host's
   * own question goes to them while they wait, not into the run.
   */
  waiting: Set<string>;
  /** The conversation's latest message before the host's turn: whatever the agent sent after it is the host's. */
  watermark?: string;
  stopping?: 'stop' | 'limit' | 'paused' | 'shutdown';
  /** Nothing more joins: the run is winding down. */
  closing: boolean;
  /** What the turns that failed said. */
  failures: string[];
  /** Replies go out one after the other, and the run ends only once they have. */
  replies: Promise<void>;
  /** "Typing…" in the conversation's chat while the host works on it. */
  typing: Typing;
  finish?: (outcome: RunOutcome) => void;
}

/** What became of a question: the answer, or why there is none. */
type QuestionOutcome =
  | { status: 'approved' | 'denied' | 'answered'; optionId?: string; text?: string }
  | { status: 'unanswered' | 'withdrawn' };

/** The answer to one of the listener's own questions, as it came with the messages. */
type StreamAnswer = NonNullable<ListenMessage['answer']>;

/**
 * Keeps an agent listening on this computer until it is stopped: holds the lease, waits for messages, starts the
 * host with one session per conversation and round, gets its answers out, and asks the operator before the
 * host does what its settings don't allow. It stops for good, without retrying, when the key stops working or
 * another holder takes the agent over; a paused agent only waits.
 */
export async function runListenLoop(options: ListenLoopOptions): Promise<LoopEnd> {
  return new ListenLoop(options).run();
}

class ListenLoop {
  private state: ListenState;
  private readonly timing: ListenTiming;
  private readonly log: (line: string) => void;
  private readonly abort = new AbortController();
  /** The listener's own questions waiting for an answer, which the messages may bring before a lookup does. */
  private readonly questions = new Map<string, (answer: StreamAnswer) => void>();
  private active?: ActiveRun;
  private activeDone?: Promise<void>;
  private end?: LoopEnd;
  private paused = false;
  private renewAt = 0;
  /** Until then the lease is surely this computer's: no run starts after it, until the lease is renewed. */
  private leaseUntil = 0;
  private failures = 0;

  constructor(private readonly options: ListenLoopOptions) {
    const state = options.store.load();
    if (!state?.allowedAt) {
      throw new Error('Listening isn’t turned on here: nothing was allowed yet.');
    }

    this.state = state;
    this.timing = { ...DEFAULT_TIMING, ...options.timing };
    this.log = options.log ?? ((line) => process.stdout.write(`${new Date().toISOString()} ${line}\n`));
    options.signal?.addEventListener('abort', () => this.finish({ reason: 'signal' }), { once: true });
  }

  async run(): Promise<LoopEnd> {
    this.log(`Keeping ${this.options.host.name} listening on ${this.options.computerName}, in ${this.project}.`);

    while (!this.end) {
      await this.keepLease();
      if (this.end || this.paused) {
        continue;
      }

      await this.tellInterrupted();
      const page = await this.poll();
      if (page) {
        this.failures = 0;
        this.accept(page);
      }

      this.pump();
    }

    await this.windDown();

    return this.end;
  }

  private get project(): string {
    return projectLabel(this.state.project);
  }

  private save(): void {
    this.options.store.save(this.state);
  }

  // --- the lease ---

  private async keepLease(): Promise<void> {
    if (Date.now() < this.renewAt) {
      return;
    }

    try {
      const lease = await takeLease(this.options.client, {
        computerId: this.options.computerId,
        computerName: this.options.computerName,
        host: this.state.host,
        project: this.project,
        takeOver: this.state.takeOver,
        agentIdentifier: this.options.agentIdentifier,
      });
      if (this.state.takeOver) {
        // Taken over once, as the operator allowed: from now on it's only kept.
        this.state.takeOver = undefined;
        this.save();
      }
      if (this.paused) {
        this.paused = false;
        this.log('The agent was resumed: waking again.');
      }
      this.failures = 0;
      const renewIn = (lease.renewInSeconds || 60) * 1000;
      this.renewAt = Date.now() + (this.timing.renewMs ?? renewIn);
      // As long as it lasts, by this computer's clock: the API's may differ.
      const lasts = Date.parse(lease.listening.expiresAt) - Date.parse(lease.listening.renewedAt);
      this.leaseUntil = Date.now() + (Number.isFinite(lasts) && lasts > 0 ? lasts : renewIn);
    } catch (err) {
      await this.onError(err);
    }
  }

  /**
   * A run the program stopped in (a restart, a logout, a crash) isn't run again, so nothing is done twice: its
   * conversation is told instead, once the lease is this computer's again.
   */
  private async tellInterrupted(): Promise<void> {
    const cut = this.state.running;
    if (!cut || this.active || Date.now() >= this.leaseUntil) {
      return;
    }

    this.state.running = undefined;
    this.save();
    this.log(`${cut.conversationId}: the run it was in when it last stopped didn’t finish; telling the conversation.`);
    await this.reply(cut.conversationId, interruptedReply(this.options.host.name));
  }

  private async poll(): Promise<ListenMessagesPage | null> {
    try {
      return await waitForListenMessages(
        this.options.client,
        {
          computerId: this.options.computerId,
          host: this.state.host,
          after: this.state.cursor,
          wait: this.timing.waitSeconds,
          agentIdentifier: this.options.agentIdentifier,
        },
        this.abort.signal
      );
    } catch (err) {
      if (!this.end) {
        await this.onError(err);
      }

      return null;
    }
  }

  /** What an error from the API means for the loop: stop for good, wait, or try again a little later. */
  private async onError(err: unknown): Promise<void> {
    if (this.end) {
      return;
    }

    if (isKeyRejected(err)) {
      this.stopForGood('key_changed', KEY_CHANGED_MESSAGE);

      return;
    }

    const code = errorCode(err);
    if (code === LISTENING_ELSEWHERE_CODE) {
      const here = { computerId: this.options.computerId, hostName: this.options.host.name };
      this.stopForGood('listening_elsewhere', movedMessage(listeningOf(err), hostNameOf, here));

      return;
    }

    if (code === NOT_LISTENING_CODE) {
      // The lease lapsed, or another holder took it: asking for it again tells which.
      this.renewAt = 0;
      this.leaseUntil = 0;

      return;
    }

    if (code === INVALID_LISTEN_CURSOR_CODE) {
      // Not a cursor this API handed out: waiting goes on from now.
      this.log('The API didn’t know where the last wait got to: going on from now.');
      this.state.cursor = undefined;
      this.save();

      return;
    }

    if (code === AGENT_PAUSED_CODE) {
      this.markPaused();
      await this.sleep(this.timing.pausedRetryMs);

      return;
    }

    const wait = this.timing.retryMs[Math.min(this.failures, this.timing.retryMs.length - 1)] ?? 5_000;
    this.failures += 1;
    this.log(`Couldn’t reach Agent Inbox (${describeError(err)}); trying again in ${spanWords(wait / 1000)}.`);
    await this.sleep(wait);
  }

  /**
   * The operator paused the agent: what runs stops, since it can't answer anyway, and nothing starts until the
   * lease can be taken again. The main loop tries every few minutes.
   */
  private markPaused(): void {
    this.renewAt = 0;
    this.leaseUntil = 0;
    if (this.paused) {
      return;
    }

    this.paused = true;
    this.log('The agent is paused on agentinbox.md: waiting until it is resumed.');
    void this.stopRun('paused');
  }

  private stopForGood(reason: StopReason, message: string): void {
    this.state.stopped = { reason, message, at: new Date().toISOString() };
    this.save();
    this.log(message);
    this.finish({ reason, message });
  }

  private finish(end: LoopEnd): void {
    if (this.end) {
      return;
    }

    this.end = end;
    this.abort.abort();
  }

  private async windDown(): Promise<void> {
    await this.stopRun('shutdown');
    await this.activeDone;

    if (this.end?.reason === 'signal') {
      // Stopped on purpose (`listen stop`, a logout): the dashboard should say so now, not in three minutes.
      await releaseLease(this.options.client, {
        computerId: this.options.computerId,
        host: this.state.host,
        agentIdentifier: this.options.agentIdentifier,
      }).catch(() => false);
    }
  }

  private sleep(ms: number): Promise<void> {
    return waitOrAbort(ms, this.abort.signal);
  }

  // --- messages ---

  /** Takes in a page of messages: each is handled once, and the cursor moves on only together with them. */
  private accept(page: ListenMessagesPage): void {
    const known = new Set([...this.state.handled, ...this.state.queue.map((message) => message.id)]);

    for (const message of page.data) {
      if (known.has(message.id)) {
        continue;
      }
      known.add(message.id);

      if (message.answersMessageId && this.state.own.includes(message.answersMessageId)) {
        // An answer to the listener's own question: it settles the question, and starts nothing.
        this.markHandled(message);
        if (message.answer) {
          this.questions.get(message.answersMessageId)?.(message.answer);
        }
        continue;
      }

      if (isStop(message.text)) {
        this.markHandled(message);
        void this.stopConversation(message.conversationId);
        continue;
      }

      this.state.queue.push(message);
    }

    this.state.cursor = page.next || this.state.cursor;
    this.save();
  }

  private markHandled(message: ListenMessage): void {
    this.state.handled = [...this.state.handled.filter((id) => id !== message.id), message.id].slice(-IDS_KEPT);
  }

  /** Hands the queue on: messages of the running session join it; the next conversation waits its turn. */
  private pump(): void {
    if (this.end || this.paused) {
      return;
    }

    const now = Date.now();
    const fresh = this.state.queue.filter((message) => now - Date.parse(message.at) < STALE_MS);
    if (fresh.length !== this.state.queue.length) {
      for (const message of this.state.queue.filter((queued) => !fresh.includes(queued))) {
        this.log(`Skipped ${message.id} in ${message.conversationId}: older than a day.`);
        this.markHandled(message);
      }
      this.state.queue = fresh;
      this.save();
    }

    const active = this.active;
    if (active) {
      this.joinActive(active);

      return;
    }

    // A run starts only while the lease is surely this computer's: by then another may have taken it, and run it too.
    const next = this.state.queue[0];
    if (!next || now >= this.leaseUntil || !this.mayRun(now)) {
      return;
    }

    this.activeDone = this.startRun(next);
  }

  /** Whether a queued message belongs to the session a run has: the same conversation, in the same round. */
  private belongs(message: ListenMessage, conversationId: string, round: number): boolean {
    return message.conversationId === conversationId && roundOf(message) === round;
  }

  /** Hands the host a message, and remembers that a turn owes it an answer. */
  private sendInto(active: ActiveRun, message: ListenMessage): boolean {
    if (!active.session?.send({ id: message.id, text: messageForHost(message) })) {
      return false;
    }

    active.pending.add(message.id);

    return true;
  }

  private joinActive(active: ActiveRun): void {
    if (!active.session || active.closing || active.stopping) {
      return;
    }

    const joining = this.state.queue.filter((message) => this.belongs(message, active.conversationId, active.round));
    for (const message of joining) {
      // An answer to the host's own question goes to its command that still waits for one. Any other, such as the
      // answer to a question asked with --async, or one whose command gave up waiting, joins the run.
      if (!message.answersMessageId || active.waiting.size === 0) {
        if (!this.sendInto(active, message)) {
          // The run is ending: the message waits for the next one.
          break;
        }
        active.messages.push(message);
        active.typing.start();
        this.log(`${message.conversationId}: a new message joined the run.`);
      }
      this.state.queue = this.state.queue.filter((queued) => queued.id !== message.id);
      this.markHandled(message);
    }
    if (joining.length > 0) {
      this.save();
    }
  }

  /** Whether another run may start this hour; tells the operator once an hour when not. */
  private mayRun(now: number): boolean {
    this.state.runs = this.state.runs.filter((at) => now - Date.parse(at) < HOUR_MS);
    if (this.state.runs.length < this.state.limits.runsPerHour) {
      return true;
    }

    const toldAt = this.state.limitToldAt ? Date.parse(this.state.limitToldAt) : 0;
    if (now - toldAt >= HOUR_MS) {
      this.state.limitToldAt = new Date(now).toISOString();
      this.save();
      this.log(`The hourly limit of ${this.state.limits.runsPerHour} runs is reached: messages wait.`);
      void this.notifyOperator(hourlyLimitNotice(this.options.host.name, this.state.limits.runsPerHour));
    }

    return false;
  }

  // --- runs ---

  /** Starts the host for a conversation with everything queued for its session, and sees the run through. */
  private async startRun(first: ListenMessage): Promise<void> {
    const { conversationId } = first;
    const round = roundOf(first);
    const messages = this.state.queue.filter((message) => this.belongs(message, conversationId, round));
    this.state.queue = this.state.queue.filter((message) => !messages.includes(message));
    for (const message of messages) {
      this.markHandled(message);
    }

    const active: ActiveRun = {
      conversationId,
      round,
      channel: first.channel,
      startedBy: startedBy(first),
      messages,
      pending: new Set(),
      waiting: new Set(),
      closing: false,
      failures: [],
      replies: Promise.resolve(),
      typing: this.typingIn(conversationId),
    };
    this.active = active;
    this.state.runs.push(new Date().toISOString());
    this.state.running = { conversationId, at: new Date().toISOString() };
    this.save();

    try {
      // The session goes on in the same round; a resolve since then starts a fresh one.
      const kept = this.state.sessions[conversationId];
      const resume = kept && kept.round === round ? kept.sessionId : undefined;
      let outcome = await this.runOnce(active, resume);
      if (outcome.kind === 'lost' && outcome.sessionGone && resume && !active.stopping) {
        // The host no longer has that session (it cleans up old ones): the conversation starts a fresh one.
        this.log(`${conversationId}: the old session is gone; starting a fresh one.`);
        delete this.state.sessions[conversationId];
        this.save();
        outcome = await this.runOnce(active, undefined);
      }

      await this.afterRun(active, outcome);
    } catch (err) {
      this.log(`${conversationId}: the run failed: ${describeError(err)}`);
    } finally {
      // A run the program's end cut off stays on record: the next start tells its conversation.
      if (active.stopping !== 'shutdown') {
        this.state.running = undefined;
        this.save();
      }
      this.active = undefined;
      this.pump();
    }
  }

  private async runOnce(active: ActiveRun, resume: string | undefined): Promise<RunOutcome> {
    active.pending = new Set();
    active.waiting = new Set();
    active.closing = false;
    // From the start: the host takes a while to come up, and the person sees it is on its way.
    active.typing.start();
    active.watermark = await this.latestMessageId(active.conversationId);
    const finished = new Promise<RunOutcome>((resolve) => {
      active.finish = resolve;
    });
    this.log(
      `Started ${this.options.host.name} for ${active.conversationId} (${active.startedBy})${resume ? `, going on with session ${resume}` : ''}.`
    );

    const session = this.options.host.open(
      {
        program: this.state.program,
        project: this.state.project,
        resume,
        instructions: hostInstructions({
          conversationId: active.conversationId,
          channel: active.channel,
          project: this.project,
        }),
      },
      {
        progress: (note, subject, toolId) => {
          this.log(`${active.conversationId}: ${note}`);
          if (repliesIn(subject, active.conversationId)) {
            // Its answer is on its way: the chat gets that, not "typing…" after it.
            active.typing.stop();
          }
          if (toolId && waitsForAnswerIn(subject, active.conversationId)) {
            active.waiting.add(toolId);
          }
        },
        toolEnded: (toolId) => active.waiting.delete(toolId),
        turnEnded: (turn) => this.onTurn(active, session, turn),
        askPermission: (question, signal) =>
          this.withoutTyping(active, () => this.askOperator(active, question, signal)),
        askQuestion: (question, signal) => this.withoutTyping(active, () => this.askPerson(active, question, signal)),
        lost: (error, sessionGone) => active.finish?.({ kind: 'lost', error, sessionGone }),
      }
    );
    active.session = session;
    for (const message of active.messages) {
      this.sendInto(active, message);
    }
    if (active.stopping) {
      // "/stop" came while the host was starting.
      void session.interrupt();
    } else {
      // Whatever came for this session since joins it.
      this.joinActive(active);
    }

    const limit = setTimeout(() => void this.stopRun('limit'), this.state.limits.maxRunSeconds * 1000);
    limit.unref?.();
    try {
      return await finished;
    } finally {
      clearTimeout(limit);
      active.closing = true;
      active.typing.stop();
      await session.close();
    }
  }

  /** "Typing…" in a conversation, as long as the host works there. */
  private typingIn(conversationId: string): Typing {
    return new Typing(
      () =>
        showTyping(this.options.client, {
          computerId: this.options.computerId,
          host: this.state.host,
          conversationId,
          agentIdentifier: this.options.agentIdentifier,
        }),
      this.timing.typingMs
    );
  }

  /** No "typing…" while someone is asked something: the host waits for them then, it isn't writing. */
  private async withoutTyping<T>(active: ActiveRun, wait: () => Promise<T>): Promise<T> {
    const wasTyping = active.typing.stop();
    try {
      return await wait();
    } finally {
      if (wasTyping && !active.closing && !active.stopping) {
        active.typing.start();
      }
    }
  }

  /** A turn ended: its answer goes out, and once nothing is owed any more the run ends. */
  private onTurn(active: ActiveRun, session: HostSession, turn: TurnEnded): void {
    for (const id of turn.inputIds) {
      active.pending.delete(id);
    }
    // A turn ends with its tools: no command of it waits any more.
    active.waiting.clear();
    if (active.pending.size === 0) {
      // Nothing left to work on: its answer goes out now, not "typing…" after it.
      active.typing.stop();
    }
    // A turn ran, so the session exists: the conversation's next run in this round goes on with it.
    this.keepSession(active, session.id);

    if (turn.outcome === 'completed' && turn.text) {
      const text = turn.text;
      active.replies = active.replies.then(() => this.deliver(active, text));
    } else if (turn.outcome === 'failed') {
      active.failures.push(turn.error ?? 'the turn failed');
    }

    if (active.pending.size === 0 && !active.closing) {
      active.closing = true;
      const outcome: RunOutcome = active.stopping ? { kind: 'interrupted' } : { kind: 'idle' };
      void active.replies.then(() => active.finish?.(outcome));
    }
  }

  private async afterRun(active: ActiveRun, outcome: RunOutcome): Promise<void> {
    if (outcome.kind === 'lost') {
      this.log(`${active.conversationId}: ${outcome.error}`);
      await this.notifyOperator(runFailedNotice(this.options.host.name, active.conversationId, outcome.error));

      return;
    }

    if (active.failures.length > 0) {
      this.log(`${active.conversationId}: ${active.failures.join('; ')}`);
      await this.notifyOperator(
        runFailedNotice(this.options.host.name, active.conversationId, active.failures.join('; '))
      );
    }

    if (outcome.kind === 'interrupted') {
      this.log(`${active.conversationId}: stopped (${active.stopping ?? 'interrupted'}).`);
      if (active.stopping === 'stop') {
        await this.reply(active.conversationId, STOPPED_REPLY);
      } else if (active.stopping === 'limit') {
        await this.reply(active.conversationId, runLimitReply(this.state.limits.maxRunSeconds));
      }

      return;
    }

    this.log(`${active.conversationId}: done.`);
  }

  /** The session goes on with the conversation's next run in this round; when it last ran keeps it among the kept. */
  private keepSession(active: ActiveRun, sessionId: string): void {
    this.state.sessions[active.conversationId] = {
      sessionId,
      round: active.round,
      lastRunAt: new Date().toISOString(),
    };
    const recent = Object.entries(this.state.sessions)
      .sort(([, a], [, b]) => b.lastRunAt.localeCompare(a.lastRunAt))
      .slice(0, SESSIONS_KEPT);
    this.state.sessions = Object.fromEntries(recent);
    this.save();
  }

  /** "/stop" in a conversation: stops its run, or drops what waits for it. */
  private async stopConversation(conversationId: string): Promise<void> {
    if (this.active?.conversationId === conversationId) {
      await this.stopRun('stop');

      return;
    }

    const waiting = this.state.queue.filter((message) => message.conversationId === conversationId);
    if (waiting.length > 0) {
      this.state.queue = this.state.queue.filter((message) => message.conversationId !== conversationId);
      for (const message of waiting) {
        this.markHandled(message);
      }
      this.save();
      await this.reply(conversationId, STOPPED_REPLY);

      return;
    }

    await this.reply(conversationId, NOTHING_TO_STOP_REPLY);
  }

  /** Stops the run in progress; one still starting stops as soon as its host is up. */
  private async stopRun(why: NonNullable<ActiveRun['stopping']>): Promise<void> {
    const active = this.active;
    if (!active || active.stopping) {
      return;
    }

    active.stopping = why;
    active.typing.stop();
    await active.session?.interrupt();
  }

  // --- answers ---

  /**
   * A turn's last words go into the conversation, unless the agent already replied there itself during the
   * turn, as its instructions ask.
   */
  private async deliver(active: ActiveRun, text: string): Promise<void> {
    const since = active.watermark;
    const after = await this.messagesAfter(active.conversationId, since);
    active.watermark = after?.[after.length - 1]?.id ?? since;

    if (after && this.hostReplied(after)) {
      this.log(`${active.conversationId}: the agent replied itself.`);

      return;
    }

    await this.reply(active.conversationId, text);
  }

  private hostReplied(messages: Array<{ from: string; interaction?: { id: string } }>): boolean {
    const own = new Set(this.state.own);

    return messages.some(
      (message) => message.from === 'agent' && !(message.interaction && own.has(message.interaction.id))
    );
  }

  /**
   * The conversation's messages after `since`, oldest first: read back page by page until `since` shows up, as
   * the host's own reply can be far behind the latest message in a busy chat. Null when they can't be read.
   */
  private async messagesAfter(conversationId: string, since: string | undefined) {
    const found: ConversationView['messages'] = [];
    let before: string | undefined;

    for (let page = 0; page < PAGES_BACK; page++) {
      const view = await this.readConversation(conversationId, { limit: PAGE_LIMIT, before });
      if (!view) {
        return null;
      }

      const at = since ? view.messages.findIndex((message) => message.id === since) : -1;
      if (at >= 0) {
        return [...view.messages.slice(at + 1), ...found];
      }
      found.unshift(...view.messages);
      if (!since || !view.hasMore || view.messages.length === 0) {
        break;
      }
      before = view.messages[0].id;
    }

    return found;
  }

  private async readConversation(
    conversationId: string,
    query: { limit: number; before?: string }
  ): Promise<ConversationView | null> {
    try {
      return await getConversation(this.options.client, conversationId, {
        ...query,
        agentIdentifier: this.options.agentIdentifier,
      });
    } catch (err) {
      await this.onErrorDuringRun(err);

      return null;
    }
  }

  private async latestMessageId(conversationId: string): Promise<string | undefined> {
    const view = await this.readConversation(conversationId, { limit: 1 });

    return view?.messages[view.messages.length - 1]?.id;
  }

  /**
   * An error on the side, while a run goes on: a changed key ends everything, and a pause stops the run; the
   * rest is left to the main loop, which meets it again soon enough. Never waits.
   */
  private async onErrorDuringRun(err: unknown): Promise<void> {
    if (isKeyRejected(err)) {
      this.stopForGood('key_changed', KEY_CHANGED_MESSAGE);
    } else if (errorCode(err) === AGENT_PAUSED_CODE) {
      this.markPaused();
    }
  }

  // --- sending ---

  private async send(input: Omit<CreateInteractionInput, 'agentIdentifier'>): Promise<Interaction> {
    const interaction = await createInteraction(this.options.client, {
      ...input,
      agentIdentifier: this.options.agentIdentifier,
    });
    this.state.own = [...this.state.own, interaction.id].slice(-IDS_KEPT);
    this.save();

    return interaction;
  }

  private async reply(conversationId: string, text: string): Promise<void> {
    try {
      await this.send({ kind: 'tell', card: { title: clipCard(text) }, thread: conversationId });
    } catch (err) {
      this.log(`${conversationId}: couldn’t reply (${describeError(err)}).`);
      await this.onErrorDuringRun(err);
    }
  }

  private async notifyOperator(text: string): Promise<void> {
    try {
      await this.send({ kind: 'tell', card: { title: clipCard(text) }, to: this.options.operatorId });
    } catch (err) {
      this.log(`Couldn’t tell the operator (${describeError(err)}).`);
      await this.onErrorDuringRun(err);
    }
  }

  /** A question the listener asked that isn't wanted any more comes off the person's phone. */
  private async withdraw(id: string): Promise<void> {
    await cancelInteraction(this.options.client, id).catch(() => undefined);
  }

  /**
   * The host wants to do what its settings don't allow. The agent's own reading and replying in its
   * conversation goes ahead; anything else is the operator's to decide, with an `approve`, even when a contact's
   * message started the host. No answer in time is a Deny.
   */
  private async askOperator(
    active: ActiveRun,
    question: PermissionQuestion,
    signal: AbortSignal
  ): Promise<PermissionAnswer> {
    const allowOnce = question.options.find((option) => option.kind === 'allow_once');
    const allowSession = question.options.find((option) => option.kind === 'allow_session');
    const deny = question.options.find((option) => option.kind === 'deny') ?? { id: 'deny' };

    const action = oneLine(question.action);
    if (allowOnce && isOwnReplySubject(question.subject, active.conversationId)) {
      this.log(`${active.conversationId}: allowed the agent’s own ${action}`);

      return { optionId: allowOnce.id };
    }

    if (!allowOnce) {
      return { optionId: deny.id, message: 'The listener can’t allow this.' };
    }

    const timeoutSeconds = this.timing.questionTimeoutMs / 1000;
    const card = permissionCard({
      hostName: this.options.host.name,
      action: question.action,
      brief: question.brief,
      detail: question.details.join(' ') || undefined,
      project: this.project,
      computerName: this.options.computerName,
      startedBy: active.startedBy,
      timeoutSeconds,
    });
    if (!card) {
      this.log(`${active.conversationId}: too long to ask the operator, so denied: ${action}`);

      return { optionId: deny.id, message: TOO_LONG_TO_ASK };
    }

    let asked: Interaction;
    try {
      asked = await this.send({
        kind: 'approve',
        card: {
          ...card,
          approveLabel: 'Allow',
          denyLabel: 'Deny',
          // Only for as long as the session lasts: the listener never writes the host's settings for the operator.
          ...(allowSession ? { extraActions: [{ id: allowSession.id, label: allowSession.label }] } : {}),
        },
        to: this.options.operatorId,
        from: this.options.host.name,
        // A late tap can't allow what was already denied: the card expires with the wait.
        ttlSeconds: Math.max(60, Math.ceil(timeoutSeconds)),
      });
    } catch (err) {
      this.log(`${active.conversationId}: couldn’t ask the operator (${describeError(err)}): denied.`);
      await this.onErrorDuringRun(err);

      return { optionId: deny.id, message: 'Your operator couldn’t be asked, so it isn’t allowed.' };
    }

    this.log(`${active.conversationId}: asked the operator to allow: ${action}`);
    const outcome = await this.waitForAnswer(asked.id, signal);
    this.log(`${active.conversationId}: ${action}: ${outcome.status}.`);

    if (outcome.status === 'approved') {
      return { optionId: allowSession && outcome.optionId === allowSession.id ? allowSession.id : allowOnce.id };
    }
    if (outcome.status === 'withdrawn' || outcome.status === 'unanswered') {
      await this.withdraw(asked.id);
    }
    if (outcome.status === 'withdrawn') {
      return { optionId: deny.id, message: 'The run was stopped.' };
    }
    if (outcome.status === 'unanswered') {
      return {
        optionId: deny.id,
        message: `Nobody answered within ${spanWords(timeoutSeconds)}, which counts as Deny.`,
      };
    }

    if (outcome.status === 'answered' && outcome.text) {
      // Words instead of a button: not an Allow, but what they wrote may say what to do instead.
      return {
        optionId: deny.id,
        message: `Your operator answered in words instead of allowing it: “${clipCard(outcome.text)}”. It isn’t allowed; follow what they wrote if it says what to do instead.`,
      };
    }

    return { optionId: deny.id, message: 'Your operator said no.' };
  }

  /**
   * A question from the agent that isn't a permission ("which one?") goes to the person whose message started
   * the turn, in that conversation: a `choose` for one pick among a few, an `ask` otherwise.
   */
  private async askPerson(
    active: ActiveRun,
    question: HostQuestion,
    signal: AbortSignal
  ): Promise<HostAnswer | undefined> {
    const answers: Record<string, string[]> = {};

    for (const item of question.questions) {
      const card = questionCard(item);
      const options =
        card.kind === 'choose' ? card.options.map((label, index) => ({ id: `opt_${index + 1}`, label })) : [];
      let asked: Interaction;
      try {
        asked = await this.send({
          kind: card.kind,
          card:
            card.kind === 'choose'
              ? { title: card.title, options }
              : { title: card.title, ...(card.body ? { body: card.body } : {}) },
          thread: active.conversationId,
          ttlSeconds: Math.max(60, Math.ceil(this.timing.questionTimeoutMs / 1000)),
        });
      } catch (err) {
        this.log(`${active.conversationId}: couldn’t ask (${describeError(err)}).`);
        await this.onErrorDuringRun(err);

        return undefined;
      }

      this.log(`${active.conversationId}: the agent asked: ${item.text}`);
      const outcome = await this.waitForAnswer(asked.id, signal);
      if (outcome.status !== 'answered') {
        await this.withdraw(asked.id);

        return undefined;
      }

      const picked = options.find((option) => option.id === outcome.optionId)?.label;
      answers[item.id] = [picked ?? outcome.text ?? ''];
    }

    return { answers };
  }

  /** Waits for an answer to one of the listener's questions: as it comes with the messages, or as a lookup finds it. */
  private async waitForAnswer(id: string, signal: AbortSignal): Promise<QuestionOutcome> {
    const deadline = Date.now() + this.timing.questionTimeoutMs;
    let streamed: StreamAnswer | undefined;
    const nudge = new AbortController();
    this.questions.set(id, (answer) => {
      streamed = answer;
      nudge.abort();
    });

    try {
      while (Date.now() < deadline) {
        if (signal.aborted || this.end) {
          return { status: 'withdrawn' };
        }

        const found = streamed
          ? { status: streamed.status, optionId: streamed.optionId, text: streamed.text }
          : await this.lookUp(id);
        if (found && found.status !== 'pending') {
          return found.status === 'approved' || found.status === 'denied' || found.status === 'answered'
            ? { status: found.status, optionId: found.optionId, text: found.text }
            : // Expired or canceled: no answer.
              { status: 'unanswered' };
        }

        const wait = Math.min(this.timing.answerPollMs, Math.max(0, deadline - Date.now()));
        await waitOrAbort(wait, anyOf(signal, nudge.signal, this.abort.signal));
      }

      return signal.aborted ? { status: 'withdrawn' } : { status: 'unanswered' };
    } finally {
      this.questions.delete(id);
    }
  }

  private async lookUp(id: string): Promise<{ status: string; optionId?: string; text?: string } | undefined> {
    try {
      const interaction = await getInteraction(this.options.client, id);

      return { status: interaction.status, optionId: interaction.response?.optionId, text: interaction.response?.text };
    } catch (err) {
      await this.onErrorDuringRun(err);

      return undefined;
    }
  }
}

function waitOrAbort(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();

      return;
    }

    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/** Aborted as soon as any of them is (`AbortSignal.any`, which older Node doesn't have). */
function anyOf(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/** The message's round: how many times its conversation was resolved before it. */
function roundOf(message: ListenMessage): number {
  return typeof message.round === 'number' ? message.round : 0;
}

/** "/stop" (any case, nothing else) stops the run of the conversation it is sent in. */
export function isStop(text: string): boolean {
  return text.trim().toLowerCase() === '/stop';
}

/** A long or several-line text as one line of the log. */
function oneLine(text: string, length = 300): string {
  const line = text.replace(/\s+/g, ' ').trim();

  return line.length > length ? `${line.slice(0, length - 1)}…` : line;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
