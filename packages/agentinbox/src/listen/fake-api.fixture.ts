import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ListenHostId, Listening, ListenMessage } from '../api/listen';

/** One HTTP call the fake took, for the tests to look at. */
export interface FakeCall {
  method: string;
  path: string;
  query: Record<string, string>;
  body: Record<string, unknown>;
  host?: string;
}

/** How a question is answered: a button, or with the option picked or the words written. */
export type FakeDecision =
  | 'approved'
  | 'denied'
  | { status: 'approved' | 'denied' | 'answered'; optionId?: string; text?: string };

interface FakeInteraction {
  id: string;
  kind: string;
  status: string;
  response?: { optionId?: string; text?: string };
  card: {
    title: string;
    body?: string;
    approveLabel?: string;
    denyLabel?: string;
    extraActions?: Array<{ id: string; label: string }>;
    options?: Array<{ id: string; label: string }>;
  };
  to?: string | string[];
  thread?: string;
  from?: string;
  ttlSeconds?: number;
  expiresAt: string;
  createdAt: string;
  /** When the agent read a person's answer, by asking for the interaction. */
  answerReadAt?: string;
}

interface FakeConversation {
  id: string;
  channel: string;
  status: 'open' | 'resolved';
  /** How many times it was resolved: the round of the next message. */
  resolves: number;
  messages: Array<{
    id: string;
    from: 'human' | 'agent';
    text: string;
    at: string;
    interaction?: { id: string; kind: string };
  }>;
}

type Send = (status: number, payload: unknown) => void;

type Handler = (call: FakeCall, match: RegExpExecArray, send: Send) => void | Promise<void>;

/** How long a lease lasts: the contract's `LISTEN_LEASE_SECONDS`. */
const LEASE_MS = 180_000;

/**
 * The Agent Inbox API as the listener sees it: the lease, the wait for messages, typing, and the inbox calls it
 * makes (questions, replies, conversations). Tests drive it: they deliver messages, answer
 * questions, pause the agent, turn the key bad, or move the lease to another computer.
 */
export class FakeApi {
  url = '';
  readonly calls: FakeCall[] = [];
  readonly interactions: FakeInteraction[] = [];
  readonly conversations = new Map<string, FakeConversation>();
  /** When "typing…" was shown, and in which conversation, in order. */
  readonly typing: Array<{ conversationId: string; at: number }> = [];
  /** Every message that may start a host, in order; a cursor is a position in it. */
  readonly listenMessages: ListenMessage[] = [];
  lease: Listening | null = null;
  paused = false;
  keyRejected = false;
  /** Agent Inbox can't be reached: every call fails, as in an outage. */
  down = false;
  /** Answers each new question (`approve`, `choose`, `ask`) as it comes, or leaves it pending (undefined). */
  decide: (interaction: FakeInteraction) => FakeDecision | undefined = () => undefined;
  private server?: Server;
  private waiters: Array<() => void> = [];

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      void this.handle(req, res);
    });
    await new Promise<void>((resolve) => this.server?.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;

    return this;
  }

  async stop(): Promise<void> {
    for (const done of this.waiters.splice(0)) done();
    this.server?.closeAllConnections();
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  /** A person writes: the message lands in its conversation and may start the host. */
  deliver(input: Partial<ListenMessage> & { text: string }): ListenMessage {
    const conversationId = input.conversationId ?? 'conv_1';
    const conversation = this.conversation(conversationId, input.channel);
    const message: ListenMessage = {
      id: input.id ?? `msg_${randomUUID().slice(0, 8)}`,
      conversationId,
      channel: input.channel ?? conversation.channel,
      from: input.from ?? { id: 'ada', name: 'Ada', isOperator: true },
      text: input.text,
      at: input.at ?? new Date().toISOString(),
      round: input.round ?? conversation.resolves,
      isDirectMessage: input.isDirectMessage ?? true,
      ...(input.answersMessageId ? { answersMessageId: input.answersMessageId } : {}),
      ...(input.answer ? { answer: input.answer } : {}),
      ...(input.attachments ? { attachments: input.attachments } : {}),
    };
    conversation.status = 'open';
    conversation.messages.push({ id: message.id, from: 'human', text: message.text, at: message.at });
    this.listenMessages.push(message);
    for (const done of this.waiters.splice(0)) done();

    return message;
  }

  /**
   * The operator presses a button on a question: it is settled, and the press comes with the messages as an
   * answer to it, unless `quietly` (the answer is then only there for a lookup). `by` is someone else answering,
   * also from their own chat: as the API gives it, the answer comes back to the question's conversation.
   */
  answer(id: string, decision: FakeDecision, quietly = false, by?: ListenMessage['from']): void {
    const interaction = this.interactions.find((candidate) => candidate.id === id);
    if (!interaction || interaction.status !== 'pending') return;
    const { status, optionId, text } = typeof decision === 'string' ? { status: decision } : decision;
    interaction.status = status;
    interaction.response = { optionId, text };
    if (!quietly) {
      // As the API gives them: a written reply is the person's own message; a pressed button is an entry of its
      // own, `human:<interaction id>:response`, with the button's label as its text.
      const label =
        interaction.card.options?.find((option) => option.id === optionId)?.label ??
        interaction.card.extraActions?.find((action) => action.id === optionId)?.label ??
        (status === 'approved' ? 'Approved' : 'Denied');
      this.deliver({
        ...(text ? {} : { id: `human:${id}:response` }),
        text: text ?? label,
        conversationId: interaction.thread ?? 'conv_operator',
        ...(by ? { from: by } : {}),
        answersMessageId: id,
        answer: text
          ? { status, text }
          : { status, optionId: optionId ?? (status === 'approved' ? 'approve' : 'deny') },
      });
    }
  }

  /** People write in a conversation without waking anything, as strangers in a group do. */
  chatter(conversationId: string, count: number): void {
    const conversation = this.conversation(conversationId);
    for (let index = 0; index < count; index++) {
      conversation.messages.push({
        id: `msg_${randomUUID().slice(0, 8)}`,
        from: 'human',
        text: `chatter ${index + 1}`,
        at: new Date().toISOString(),
      });
    }
  }

  /** The operator resolves a conversation on agentinbox.md. */
  resolve(conversationId: string): void {
    const conversation = this.conversation(conversationId);
    conversation.status = 'resolved';
    conversation.resolves += 1;
  }

  /** Another holder takes the lease, as a take-over there would: another computer, unless one is named. */
  takeOverElsewhere(host: ListenHostId = 'codex', computerId = 'cmp_other_computer_0001'): void {
    const now = new Date();
    this.lease = {
      computerId,
      computerName: 'Desktop',
      host,
      project: '~/work',
      since: now.toISOString(),
      renewedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + LEASE_MS).toISOString(),
    };
  }

  /** The agent's messages and the listener's own cards in a conversation, newest last. */
  sentInto(conversationId: string): string[] {
    return (this.conversations.get(conversationId)?.messages ?? [])
      .filter((m) => m.from === 'agent')
      .map((m) => m.text);
  }

  callsTo(method: string, path: string): FakeCall[] {
    return this.calls.filter((call) => call.method === method && call.path === path);
  }

  private conversation(id: string, channel = 'telegram'): FakeConversation {
    let conversation = this.conversations.get(id);
    if (!conversation) {
      conversation = { id, channel, status: 'open', resolves: 0, messages: [] };
      this.conversations.set(id, conversation);
    }

    return conversation;
  }

  private liveLease(): Listening | null {
    return this.lease && Date.parse(this.lease.expiresAt) > Date.now() ? this.lease : null;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://fake');
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const call: FakeCall = {
      method: req.method ?? 'GET',
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      body,
      host: req.headers['agent-inbox-host'] as string | undefined,
    };
    this.calls.push(call);

    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (this.down) {
      send(503, { message: 'Service Unavailable' });

      return;
    }
    if (this.keyRejected) {
      send(401, { statusCode: 401, message: 'API Key not found' });

      return;
    }
    // A paused agent's hosts may still see where it is listening and let go of the lease (`listen status`, `listen stop`).
    const openWhilePaused =
      call.path === '/v1/listen/lease' ? call.method === 'GET' : call.path === '/v1/listen/lease/release';
    if (this.paused && !openWhilePaused) {
      send(403, { code: 'agent_paused', message: 'This agent is paused.', pausedAt: new Date().toISOString() });

      return;
    }

    try {
      await this.route(call, send);
    } catch (err) {
      send(500, { message: String(err) });
    }
  }

  /** The routes the fake answers, in the order they are tried. */
  private readonly routes: Array<[method: string, path: RegExp, handle: Handler]> = [
    ['POST', /^\/v1\/listen\/lease$/, (call, _match, send) => this.takeLease(call, send)],
    [
      'GET',
      /^\/v1\/listen\/lease$/,
      (_call, _match, send) => send(200, { data: { listening: this.liveLease(), paused: this.paused } }),
    ],
    ['POST', /^\/v1\/listen\/lease\/release$/, (call, _match, send) => this.release(call, send)],
    ['GET', /^\/v1\/listen\/messages$/, (call, _match, send) => this.waitForMessages(call, send)],
    ['POST', /^\/v1\/listen\/typing$/, (call, _match, send) => this.showTyping(call, send)],
    ['POST', /^\/v1\/inbox\/messages$/, (call, _match, send) => this.createInteraction(call, send)],
    ['POST', /^\/v1\/inbox\/messages\/([^/]+)\/cancel$/, (_call, match, send) => this.cancel(match[1], send)],
    ['GET', /^\/v1\/inbox\/messages\/([^/]+)$/, (_call, match, send) => this.showInteraction(match[1], send)],
    ['GET', /^\/v1\/inbox$/, (call, _match, send) => this.listConversations(call, send)],
    [
      'POST',
      /^\/v1\/inbox\/([^/]+)\/resolve$/,
      (_call, match, send) => {
        this.resolve(match[1]);
        send(200, { data: this.threadView(this.conversation(match[1])) });
      },
    ],
    ['GET', /^\/v1\/inbox\/([^/]+)$/, (call, match, send) => this.showConversation(call, match[1], send)],
  ];

  private async route(call: FakeCall, send: Send): Promise<void> {
    for (const [method, path, handle] of this.routes) {
      const match = call.method === method ? path.exec(call.path) : null;
      if (match) {
        await handle(call, match, send);

        return;
      }
    }

    send(404, { message: `No route ${call.method} ${call.path}` });
  }

  private takeLease({ body }: FakeCall, send: Send): void {
    const holder = this.liveLease();
    // The holder is a computer and a host together.
    const theirs = holder && (holder.computerId !== body.computerId || holder.host !== body.host);
    if (theirs && !body.takeOver) {
      send(409, { code: 'listening_elsewhere', message: 'Listening elsewhere.', listening: holder });

      return;
    }

    const now = new Date().toISOString();
    this.lease = {
      computerId: String(body.computerId),
      computerName: String(body.computerName),
      host: body.host as ListenHostId,
      ...(body.project ? { project: String(body.project) } : {}),
      since: holder && !theirs ? holder.since : now,
      renewedAt: now,
      expiresAt: new Date(Date.now() + LEASE_MS).toISOString(),
    };
    send(200, { data: { listening: this.lease, renewInSeconds: 60 } });
  }

  private release({ body }: FakeCall, send: Send): void {
    if (!body.host) {
      send(422, { message: 'Validation Error', errors: { host: ['host is required'] } });

      return;
    }

    const holder = this.liveLease();
    const released = Boolean(holder && holder.computerId === body.computerId && holder.host === body.host);
    if (released) this.lease = null;
    send(200, { data: { released } });
  }

  private holds(query: Record<string, string>): boolean {
    const holder = this.liveLease();

    return holder?.computerId === query.computerId && holder.host === query.host;
  }

  private async waitForMessages({ query }: FakeCall, send: Send): Promise<void> {
    if (!query.host) {
      send(422, { message: 'Validation Error', errors: { host: ['host is required'] } });

      return;
    }
    if (query.after && !/^c\d+$/.test(query.after)) {
      send(400, { code: 'invalid_listen_cursor', message: 'This cursor was not handed out here.' });

      return;
    }
    if (!this.holds(query)) {
      send(409, { code: 'not_listening', message: 'Not listening here.', listening: this.liveLease() });

      return;
    }

    const from = query.after ? Number(query.after.slice(1)) : this.listenMessages.length;
    const wait = Number(query.wait ?? 0) * 1000;
    if (this.listenMessages.length <= from && wait > 0) {
      await this.held(wait);
    }
    // A take-over meanwhile ends this holder's wait.
    if (!this.holds(query)) {
      send(409, { code: 'not_listening', message: 'Not listening here.', listening: this.liveLease() });

      return;
    }

    const looked = this.listenMessages.slice(from, from + Number(query.limit ?? 20));
    // As the API does: an answer the agent already read, waiting for it, is left out.
    const data = looked.filter(
      (message) =>
        !message.answersMessageId ||
        !this.interactions.find((interaction) => interaction.id === message.answersMessageId)?.answerReadAt
    );
    send(200, { data, next: `c${from + looked.length}` });
  }

  /** "Typing…" for a few seconds, for the holder only; an email conversation has none. */
  private showTyping({ body }: FakeCall, send: Send): void {
    if (!this.holds(body as Record<string, string>)) {
      send(409, { code: 'not_listening', message: 'Not listening here.', listening: this.liveLease() });

      return;
    }

    const conversation = this.conversation(String(body.conversationId));
    const typing = conversation.channel !== 'email';
    if (typing) {
      this.typing.push({ conversationId: conversation.id, at: Date.now() });
    }
    send(200, { data: { typing } });
  }

  /** Holds a wait until a message comes or `ms` runs out. */
  private held(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);
      const waiters = this.waiters;
      function done() {
        clearTimeout(timer);
        const at = waiters.indexOf(done);
        if (at >= 0) waiters.splice(at, 1);
        resolve();
      }
      waiters.push(done);
    });
  }

  private createInteraction({ body }: FakeCall, send: Send): void {
    const now = new Date();
    const interaction: FakeInteraction = {
      id: `int_${randomUUID().slice(0, 8)}`,
      kind: String(body.kind),
      status: body.kind === 'tell' ? 'delivered' : 'pending',
      card: body.card as FakeInteraction['card'],
      to: body.to as FakeInteraction['to'],
      thread: body.thread as string | undefined,
      from: body.from as string | undefined,
      ttlSeconds: body.ttlSeconds as number | undefined,
      expiresAt: new Date(now.getTime() + Number(body.ttlSeconds ?? 86_400) * 1000).toISOString(),
      createdAt: now.toISOString(),
    };
    this.interactions.push(interaction);
    // A send without a conversation goes to the operator's own, as on Telegram.
    const conversation = this.conversation(interaction.thread ?? 'conv_operator');
    conversation.messages.push({
      id: `msg_${randomUUID().slice(0, 8)}`,
      from: 'agent',
      text: interaction.card.title,
      at: now.toISOString(),
      interaction: { id: interaction.id, kind: interaction.kind },
    });
    send(201, { data: this.interactionView(interaction, conversation.id) });

    const decided = interaction.kind === 'tell' ? undefined : this.decide(interaction);
    if (decided) setTimeout(() => this.answer(interaction.id, decided), 20);
  }

  private cancel(id: string, send: Send): void {
    const interaction = this.interactions.find((candidate) => candidate.id === id);
    if (!interaction) {
      send(404, { message: 'Not found' });

      return;
    }

    if (interaction.status === 'pending') interaction.status = 'canceled';
    send(200, { data: this.interactionView(interaction) });
  }

  private showInteraction(id: string, send: Send): void {
    const interaction = this.interactions.find((candidate) => candidate.id === id);
    // Reading a person's answer hands it to the agent: the listener's wait leaves it out from then on.
    if (interaction && ['approved', 'denied', 'answered'].includes(interaction.status)) {
      interaction.answerReadAt ??= new Date().toISOString();
    }
    send(interaction ? 200 : 404, interaction ? { data: this.interactionView(interaction) } : { message: 'Not found' });
  }

  private listConversations({ query }: FakeCall, send: Send): void {
    const status = query.status ?? 'open';
    const data = [...this.conversations.values()]
      .filter((conversation) => status === 'all' || conversation.status === status)
      .map((conversation) => this.threadView(conversation));
    send(200, { data, next: null });
  }

  private showConversation({ query }: FakeCall, id: string, send: Send): void {
    const conversation = this.conversation(id);
    const limit = Number(query.limit ?? 20);
    // Older pages end before the message `before` names.
    const end = query.before
      ? Math.max(
          0,
          conversation.messages.findIndex((message) => message.id === query.before)
        )
      : conversation.messages.length;
    const older = conversation.messages.slice(0, end);
    send(200, {
      data: {
        thread: this.threadView(conversation),
        messages: older.slice(-limit),
        hasMore: older.length > limit,
      },
    });
  }

  private interactionView(interaction: FakeInteraction, conversationId?: string) {
    return {
      id: interaction.id,
      kind: interaction.kind,
      status: interaction.status,
      content: { cardChrome: interaction.card },
      ...(interaction.response && interaction.status !== 'pending'
        ? {
            response: {
              type: interaction.response.optionId ? 'option' : 'text',
              ...interaction.response,
              respondedAt: new Date().toISOString(),
            },
          }
        : {}),
      to: Array.isArray(interaction.to) ? interaction.to : interaction.to ? [interaction.to] : [],
      integrationIdentifier: 'telegram',
      platform: 'telegram',
      expiresAt: interaction.expiresAt,
      createdAt: interaction.createdAt,
      ...(conversationId ? { threads: [{ id: conversationId, unreadBefore: 0 }] } : {}),
    };
  }

  private threadView(conversation: FakeConversation) {
    const last = conversation.messages[conversation.messages.length - 1];

    return {
      id: conversation.id,
      channel: conversation.channel,
      kind: 'contact',
      people: [],
      status: conversation.status,
      unreadCount: 0,
      lastMessage: last ? { text: last.text, at: last.at, from: last.from } : null,
      isDirectMessage: true,
      lastActivityAt: last?.at ?? new Date().toISOString(),
    };
  }
}
