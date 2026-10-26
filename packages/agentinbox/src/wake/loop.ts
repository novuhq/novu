import {
  type CreateInteractionInput,
  cancelInteraction,
  createInteraction,
  getInteraction,
  type Interaction,
} from '../api/agent-inbox';
import type { ApiClient } from '../api/client';
import { getConversation } from '../api/inbox';
import {
  AGENT_PAUSED_CODE,
  AWAKE_ELSEWHERE_CODE,
  awakeOf,
  errorCode,
  INVALID_WAKE_CURSOR_CODE,
  isKeyRejected,
  NOT_AWAKE_CODE,
  releaseLease,
  showTyping,
  takeLease,
  type WakeMessage,
  type WakeMessagesPage,
  waitForWakeMessages,
} from '../api/wake';
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
import { wakeHostName } from './hosts';
import { isOwnReplySubject, repliesIn } from './own-replies';
import { IDS_KEPT, SESSIONS_KEPT, type StateStore, type StopReason, type WakeState } from './state';
import { Typing } from './typing';
import {
  clipCard,
  hostInstructions,
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
  wakeLimitNotice,
  wokenBy,
} from './words';

const HOUR_MS = 3_600_000;

/** Messages older than this aren't worth a wake: the API never sends them, and the queue drops them too. */
const STALE_MS = 24 * HOUR_MS;

export interface WakeTiming {
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

export const DEFAULT_TIMING: WakeTiming = {
  waitSeconds: 25,
  // "Every few minutes", as the contract has it: a pause is the operator's choice, not an outage.
  pausedRetryMs: 3 * 60_000,
  retryMs: [5_000, 15_000, 30_000, 60_000],
  // Ten minutes, as Inkbox gives its own: time to notice a phone, short enough that no run hangs for hours.
  questionTimeoutMs: 10 * 60_000,
  answerPollMs: 5_000,
  typingMs: 4_000,
};

export interface WakeLoopOptions {
  client: ApiClient;
  agentIdentifier: string;
  /** The operator's contact id: permission questions and notices go to them. */
  operatorId: string;
  computerId: string;
  computerName: string;
  host: HostAdapter;
  store: StateStore;
  timing?: Partial<WakeTiming>;
  log?: (line: string) => void;
  /** Ends the loop: the background service is being stopped. */
  signal?: AbortSignal;
}

export type LoopEnd = { reason: 'signal' } | { reason: StopReason; message: string };

/** How a session's run ended. */
type RunOutcome = { kind: 'idle' } | { kind: 'interrupted' } | { kind: 'lost'; error: string; sessionGone: boolean };

/** The run in progress: one conversation's session in one round, and what it was woken with. */
interface ActiveRun {
  conversationId: string;
  round: number;
  channel: string;
  /** Who woke it, as the operator reads it in a question: "you" or a contact's name. */
  wokenBy: string;
  /** Every message this run carries, so a run can start again with them. */
  messages: WakeMessage[];
  session?: HostSession;
  /** Messages handed to the host that no turn has answered yet. */
  pending: Set<string>;
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

/** The answer to one of wake's own questions, as it came with the messages. */
type StreamAnswer = NonNullable<WakeMessage['answer']>;

/**
 * Keeps an agent awake on this computer until it is stopped: holds the lease, waits for messages, wakes the
 * host with one session per conversation and round, gets its answers out, and asks the operator before the
 * host does what its settings don't allow. It stops for good, without retrying, when the key stops working or
 * another holder takes the agent over; a paused agent only waits.
 */
export async function runWakeLoop(options: WakeLoopOptions): Promise<LoopEnd> {
  return new WakeLoop(options).run();
}

class WakeLoop {
  private state: WakeState;
  private readonly timing: WakeTiming;
  private readonly log: (line: string) => void;
  private readonly abort = new AbortController();
  /** Wake's own questions waiting for an answer, which the messages may bring before a lookup does. */
  private readonly questions = new Map<string, (answer: StreamAnswer) => void>();
  private active?: ActiveRun;
  private activeDone?: Promise<void>;
  private end?: LoopEnd;
  private paused = false;
  private renewAt = 0;
  private failures = 0;

  constructor(private readonly options: WakeLoopOptions) {
    const state = options.store.load();
    if (!state?.allowedAt) {
      throw new Error('Wake isn’t turned on here: nothing was allowed yet.');
    }

    this.state = state;
    this.timing = { ...DEFAULT_TIMING, ...options.timing };
    this.log = options.log ?? ((line) => process.stdout.write(`${new Date().toISOString()} ${line}\n`));
    options.signal?.addEventListener('abort', () => this.finish({ reason: 'signal' }), { once: true });
  }

  async run(): Promise<LoopEnd> {
    this.log(`Keeping ${this.options.host.name} awake on ${this.options.computerName}, in ${this.project}.`);

    while (!this.end) {
      await this.keepLease();
      if (this.end || this.paused) {
        continue;
      }

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
      this.renewAt = Date.now() + (this.timing.renewMs ?? (lease.renewInSeconds || 60) * 1000);
    } catch (err) {
      await this.onError(err);
    }
  }

  private async poll(): Promise<WakeMessagesPage | null> {
    try {
      return await waitForWakeMessages(
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
    if (code === AWAKE_ELSEWHERE_CODE) {
      const here = { computerId: this.options.computerId, hostName: this.options.host.name };
      this.stopForGood('awake_elsewhere', movedMessage(awakeOf(err), wakeHostName, here));

      return;
    }

    if (code === NOT_AWAKE_CODE) {
      // The lease lapsed, or another holder took it: asking for it again tells which.
      this.renewAt = 0;

      return;
    }

    if (code === INVALID_WAKE_CURSOR_CODE) {
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
   * The operator paused the agent: what runs stops, since it can't answer anyway, and nothing wakes until the
   * lease can be taken again. The main loop tries every few minutes.
   */
  private markPaused(): void {
    this.renewAt = 0;
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
      // Stopped on purpose (`wake stop`, a logout): the dashboard should say so now, not in three minutes.
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
  private accept(page: WakeMessagesPage): void {
    const known = new Set([...this.state.handled, ...this.state.queue.map((message) => message.id)]);

    for (const message of page.data) {
      if (known.has(message.id)) {
        continue;
      }
      known.add(message.id);

      if (message.answersMessageId && this.state.own.includes(message.answersMessageId)) {
        // An answer to wake's own question: it settles the question, and wakes nothing.
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

  private markHandled(message: WakeMessage): void {
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

    const next = this.state.queue[0];
    if (!next || !this.mayWake(now)) {
      return;
    }

    this.activeDone = this.wake(next);
  }

  /** Whether a queued message belongs to the session a run has: the same conversation, in the same round. */
  private belongs(message: WakeMessage, conversationId: string, round: number): boolean {
    return message.conversationId === conversationId && roundOf(message) === round;
  }

  /** Hands the host a message, and remembers that a turn owes it an answer. */
  private sendInto(active: ActiveRun, message: WakeMessage): boolean {
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
      // An answer to the host's own question is already in hand: the command that asked it is waiting for it.
      if (!message.answersMessageId) {
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
  private mayWake(now: number): boolean {
    this.state.wakes = this.state.wakes.filter((at) => now - Date.parse(at) < HOUR_MS);
    if (this.state.wakes.length < this.state.limits.wakesPerHour) {
      return true;
    }

    const toldAt = this.state.limitToldAt ? Date.parse(this.state.limitToldAt) : 0;
    if (now - toldAt >= HOUR_MS) {
      this.state.limitToldAt = new Date(now).toISOString();
      this.save();
      this.log(`The hourly limit of ${this.state.limits.wakesPerHour} wakes is reached: messages wait.`);
      void this.notifyOperator(wakeLimitNotice(this.options.host.name, this.state.limits.wakesPerHour));
    }

    return false;
  }

  // --- runs ---

  /** Wakes the host for a conversation with everything queued for its session, and sees the run through. */
  private async wake(first: WakeMessage): Promise<void> {
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
      wokenBy: wokenBy(first),
      messages,
      pending: new Set(),
      closing: false,
      failures: [],
      replies: Promise.resolve(),
      typing: this.typingIn(conversationId),
    };
    this.active = active;
    this.state.wakes.push(new Date().toISOString());
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
      this.active = undefined;
      this.pump();
    }
  }

  private async runOnce(active: ActiveRun, resume: string | undefined): Promise<RunOutcome> {
    active.pending = new Set();
    active.closing = false;
    // From the start: the host takes a while to come up, and the person sees it is on its way.
    active.typing.start();
    active.watermark = await this.latestMessageId(active.conversationId);
    const finished = new Promise<RunOutcome>((resolve) => {
      active.finish = resolve;
    });
    this.log(
      `Woke ${this.options.host.name} for ${active.conversationId} (${active.wokenBy})${resume ? `, going on with session ${resume}` : ''}.`
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
        progress: (note, subject) => {
          this.log(`${active.conversationId}: ${note}`);
          if (repliesIn(subject, active.conversationId)) {
            // Its answer is on its way: the chat gets that, not "typing…" after it.
            active.typing.stop();
          }
        },
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
    if (active.pending.size === 0) {
      // Nothing left to work on: its answer goes out now, not "typing…" after it.
      active.typing.stop();
    }
    // A turn ran, so the session exists: the conversation's next wake in this round goes on with it.
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

  private keepSession(active: ActiveRun, sessionId: string): void {
    const kept = this.state.sessions[active.conversationId];
    if (kept?.sessionId === sessionId && kept.round === active.round) {
      return;
    }

    this.state.sessions[active.conversationId] = {
      sessionId,
      round: active.round,
      lastWakeAt: new Date().toISOString(),
    };
    const recent = Object.entries(this.state.sessions)
      .sort(([, a], [, b]) => b.lastWakeAt.localeCompare(a.lastWakeAt))
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
    const view = await this.recentMessages(active.conversationId);
    active.watermark = view?.[view.length - 1]?.id ?? since;

    if (view && this.hostReplied(view, since)) {
      this.log(`${active.conversationId}: the agent replied itself.`);

      return;
    }

    await this.reply(active.conversationId, text);
  }

  private hostReplied(
    messages: Array<{ id: string; from: string; interaction?: { id: string } }>,
    since?: string
  ): boolean {
    const start = since ? messages.findIndex((message) => message.id === since) + 1 : 0;
    const own = new Set(this.state.own);

    return messages
      .slice(start)
      .some((message) => message.from === 'agent' && !(message.interaction && own.has(message.interaction.id)));
  }

  private async recentMessages(conversationId: string) {
    try {
      const view = await getConversation(this.options.client, conversationId, {
        limit: 20,
        agentIdentifier: this.options.agentIdentifier,
      });

      return view.messages;
    } catch (err) {
      await this.onErrorDuringRun(err);

      return null;
    }
  }

  private async latestMessageId(conversationId: string): Promise<string | undefined> {
    const messages = await this.recentMessages(conversationId);

    return messages?.[messages.length - 1]?.id;
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

  /** A question wake asked that isn't wanted any more comes off the person's phone. */
  private async withdraw(id: string): Promise<void> {
    await cancelInteraction(this.options.client, id).catch(() => undefined);
  }

  /**
   * The host wants to do what its settings don't allow. The agent's own reading and replying in its
   * conversation goes ahead; anything else is the operator's to decide, with an `approve`, even when a contact
   * woke the host. No answer in time is a Deny.
   */
  private async askOperator(
    active: ActiveRun,
    question: PermissionQuestion,
    signal: AbortSignal
  ): Promise<PermissionAnswer> {
    const allowOnce = question.options.find((option) => option.kind === 'allow_once');
    const allowSession = question.options.find((option) => option.kind === 'allow_session');
    const deny = question.options.find((option) => option.kind === 'deny') ?? { id: 'deny' };

    if (allowOnce && isOwnReplySubject(question.subject, active.conversationId)) {
      this.log(`${active.conversationId}: allowed the agent’s own ${question.action}`);

      return { optionId: allowOnce.id };
    }

    if (!allowOnce) {
      return { optionId: deny.id, message: 'Wake can’t allow this.' };
    }

    const timeoutSeconds = this.timing.questionTimeoutMs / 1000;
    const card = permissionCard({
      hostName: this.options.host.name,
      action: question.action,
      brief: question.brief,
      detail: question.details.join(' ') || undefined,
      project: this.project,
      computerName: this.options.computerName,
      wokenBy: active.wokenBy,
      timeoutSeconds,
    });

    let asked: Interaction;
    try {
      asked = await this.send({
        kind: 'approve',
        card: {
          ...card,
          approveLabel: 'Allow',
          denyLabel: 'Deny',
          // Only for as long as the session lasts: wake never writes the host's settings for the operator.
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

    this.log(`${active.conversationId}: asked the operator to allow: ${question.action}`);
    const outcome = await this.waitForAnswer(asked.id, signal);
    this.log(`${active.conversationId}: ${question.action}: ${outcome.status}.`);

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

  /** Waits for an answer to one of wake's questions: as it comes with the messages, or as a lookup finds it. */
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
function roundOf(message: WakeMessage): number {
  return typeof message.round === 'number' ? message.round : 0;
}

/** "/stop" (any case, nothing else) stops the run of the conversation it is sent in. */
export function isStop(text: string): boolean {
  return text.trim().toLowerCase() === '/stop';
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
