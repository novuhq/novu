// Novu Box on Cloudflare, the Slack router: one Slack app (Novu Bot) for every box. It runs in the host Worker
// (host.ts exports it), as one Durable Object, Router("router"), that keeps the boxes, each person's selection, and
// who owns each thread and message. Its address is the Worker `novu-box-slack` (thin.ts, bound to it by
// alchemy.run.ts). It holds the real bot token and signing secret; boxes get fake ones, minted here per box and
// agent, so PR code never sees the real ones. Slack's events, interactivity and the /novu-box command all come to
// POST /slack.
//
//   POST /slack          from Slack: check its signature, queue the event for the box that owns it, ack, then hand
//                        it to Box(<box>), re-signed with that box's fake secret (a sleeping box wakes; the queue
//                        retries until it answers)
//   POST /api/<method>   from boxes (their SLACK_API_URL): a fake token gets the real one for the allowed methods,
//                        only in #novu-box and in DMs people started; any other token goes to slack.com unchanged
//   GET  /files/<path>   files.slack.com downloads (image and PDF input) with the real token
//   POST /upload?url=    file uploads to the upload_url Slack returned, with the real token
//
// Box(<box>) calls `register` for its credentials, `ready` once its agents are set up, and `unregister` when the
// box is deleted (slack/box.ts).

import { DurableObject } from 'cloudflare:workers';
import { Context, Effect, Layer, Scheduler, Schema, Stream } from 'effect';
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/http';
import { SlackAgent, type SlackAnswer, type SlackCredentials } from '../../shared/contracts.ts';
import { bearer } from '../../shared/names.ts';
import type { HostEnv } from '../env.ts';
import { attempt, type Failure, forget, later, log, messageOf, runPromise, store, stored } from '../run.ts';

const SLACK_API = 'https://slack.com/api/';
const SLACK_FILES = 'https://files.slack.com/';
const RETRY_MS = 10 * 1000;
// A first restore of a new snapshot takes 4 to 6 minutes; a wake about 40 s.
const GIVE_UP_MS = 8 * 60 * 1000;
const ROUTER_NAME = 'Novu Box';

// The Slack methods the playground agents use through @chat-adapter/slack and Novu's native delivery, with the
// parameter that names the channel (null: none). Everything else is refused.
const METHODS: Record<string, string | null> = {
  'chat.postMessage': 'channel',
  'chat.postEphemeral': 'channel',
  'chat.update': 'channel',
  'chat.delete': 'channel',
  'chat.startStream': 'channel',
  'chat.appendStream': 'channel',
  'chat.stopStream': 'channel',
  'reactions.add': 'channel',
  'reactions.remove': 'channel',
  'conversations.history': 'channel',
  'conversations.replies': 'channel',
  'conversations.info': 'channel',
  'assistant.threads.setStatus': 'channel_id',
  'files.completeUploadExternal': 'channel_id',
  'files.getUploadURLExternal': null,
  'conversations.open': null,
  'users.info': null,
  'views.open': null,
  'views.update': null,
  'views.push': null,
};
// Parameters that also name channels, which the router doesn't check, so a call with them is refused. @slack/web-api
// sends files.uploadV2's `channels` as `channel_id`, so the agents never use this one.
const UNCHECKED_CHANNELS: Record<string, string> = { 'files.completeUploadExternal': 'channels' };
// Only on the box's own messages, so one box can't change another's.
const OWN_MESSAGE = new Set(['chat.update', 'chat.delete', 'chat.appendStream', 'chat.stopStream']);

const NO_BOX = 'No Novu Box is running: start one with `box up --cloud`.';

class RouterFailed extends Schema.TaggedError<RouterFailed>()('RouterFailed', { message: Schema.String }) {}

// --- what the router stores ---

// A box and agent: the owner of a token, a thread, a message or a view, and a person's selection.
interface Owner {
  readonly box: string;
  readonly agent: string;
}

interface RegisteredBox {
  readonly name: string;
  readonly signingSecret: string;
  origin?: string;
  tokens: Record<string, string>;
  agents: ReadonlyArray<SlackAgent>;
  message?: { readonly channel: string; readonly ts: string };
}

interface Identity {
  readonly team: { readonly id: string; readonly name: string };
  readonly botUserId: string;
  readonly botId?: string;
  readonly url?: string;
}

// Where the router answers about an event: the sender's channel, and the thread there.
interface Notice {
  readonly channel: string;
  readonly ts?: string | undefined;
}

// An event on its way to a box, as Slack sent it.
interface Envelope {
  readonly id?: string | undefined;
  readonly contentType: string;
  readonly user?: string | undefined;
  readonly body: string;
  readonly notice?: Notice | undefined;
}

type Item = Envelope & Owner & { readonly at: number };

interface Pending {
  readonly channel: string;
  readonly ts: string;
  readonly thread?: string | undefined;
  readonly envelope: Envelope;
}

interface PostedNotice {
  readonly at: number;
  readonly channel?: string;
  readonly ts?: string;
}

// --- what Slack sends and answers, the parts the router reads ---

interface SlackMessage {
  readonly user?: string;
  readonly ts?: string;
  readonly thread_ts?: string;
  readonly bot_id?: string;
}

interface SlackEventPayload extends SlackMessage {
  readonly type?: string;
  readonly subtype?: string;
  readonly tab?: string;
  readonly channel?: string;
  readonly deleted_ts?: string;
  readonly item?: { readonly channel?: string; readonly ts?: string };
  readonly message?: SlackMessage;
  readonly previous_message?: SlackMessage;
}

interface SlackEventBody {
  readonly type?: string;
  readonly challenge?: string;
  readonly event_id?: string;
  readonly event?: SlackEventPayload;
}

interface Interaction {
  readonly type?: string;
  readonly trigger_id?: string;
  readonly response_url?: string;
  readonly user?: { readonly id: string };
  readonly channel?: { readonly id?: string };
  readonly container?: { readonly channel_id?: string; readonly message_ts?: string; readonly type?: string };
  readonly message?: { readonly ts?: string; readonly thread_ts?: string };
  readonly view?: { readonly id?: string };
  readonly actions?: ReadonlyArray<{
    readonly action_id?: string;
    readonly action_ts?: string;
    readonly value?: string;
  }>;
}

interface SlackResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly channel?: string;
  readonly ts?: string;
  readonly message_ts?: string;
  upload_url?: string;
  readonly view?: { readonly id?: string };
  readonly response_metadata?: unknown;
  readonly team_id?: string;
  readonly team?: string;
  readonly user_id?: string;
  readonly bot_id?: string;
  readonly url?: string;
}

type Params = Record<string, unknown>;

interface Facts {
  readonly kind: 'reaction' | 'edit' | 'mention' | 'message';
  readonly user: string;
  readonly channel: string;
  readonly dm: boolean;
  readonly ts: string;
  readonly thread?: string | undefined;
}

// --- routes ---

class RouterSelf extends Context.Service<RouterSelf, Router>()('cloud/Router') {}

type Handler = (router: Router, request: Request, url: URL) => Effect.Effect<Response, Failure>;

const handle = (f: Handler) =>
  Effect.gen(function* () {
    const router = yield* RouterSelf;
    const request = (yield* HttpServerRequest.HttpServerRequest).source as Request;
    const url = new URL(request.url);
    const response = yield* f(router, request, url).pipe(
      Effect.catch((error) =>
        Effect.as(
          log(`${request.method} ${url.pathname}: ${error.message}`),
          new Response('router error\n', { status: 500 })
        )
      )
    );

    return HttpServerResponse.raw(response);
  });

const routes = HttpRouter.toWebHandler(
  Layer.mergeAll(
    HttpRouter.add(
      'POST',
      '/slack',
      handle((router, request) => router.inbound(request))
    ),
    HttpRouter.add(
      '*',
      '/api/*',
      handle((router, request, url) => router.outbound(request, url.pathname.slice(5)))
    ),
    HttpRouter.add(
      '*',
      '/files/*',
      handle((router, request, url) => router.download(request, url))
    ),
    HttpRouter.add(
      'POST',
      '/upload',
      handle((router, request, url) => router.upload(request, url))
    ),
    HttpRouter.add(
      '*',
      '/*',
      handle(() => Effect.succeed(new Response('not found\n', { status: 404 })))
    )
  ).pipe(
    Layer.provide(HttpServer.layerServices),
    Layer.provideMerge(Layer.succeed(Scheduler.Scheduler, new Scheduler.MixedScheduler('sync')))
  ),
  { disableLogger: true }
);

export class Router extends DurableObject<HostEnv> {
  readonly #draining = new Set<string>();

  override fetch(request: Request): Promise<Response> {
    return routes.handler(request, Context.make(RouterSelf, this));
  }

  // --- registry ---

  // A box's credentials: one signing secret, and a bot token per agent, so the router knows which box and agent
  // every outbound call comes from. A box that registers again (every start) gets the same ones.
  register(name: string, origin: string, identifiers: ReadonlyArray<string>): Promise<SlackCredentials> {
    return runPromise(
      Effect.gen({ self: this }, function* () {
        const box: RegisteredBox = (yield* this.#get<RegisteredBox>(`box:${name}`)) ?? {
          name,
          signingSecret: random(16),
          tokens: {},
          agents: [],
        };
        box.origin = origin;
        const tokens: Record<string, string> = {};
        for (const identifier of identifiers)
          tokens[identifier] = box.tokens[identifier] ?? `xoxb-novu-box-${random(18)}`;
        for (const [identifier, token] of Object.entries(box.tokens))
          if (!tokens[identifier]) yield* forget(this.ctx.storage, `token:${token}`);
        for (const [agent, token] of Object.entries(tokens)) yield* this.#put(`token:${token}`, { box: name, agent });
        box.tokens = tokens;
        yield* this.#put(`box:${name}`, box);
        const me = yield* this.#identity();

        return { signingSecret: box.signingSecret, tokens, team: me.team, botUserId: me.botUserId };
      })
    );
  }

  // The agents the box set up, with their webhook IDs, replace its list; #novu-box gets (or keeps) its ready message.
  ready(name: string, agents: ReadonlyArray<SlackAgent>): Promise<void> {
    return runPromise(
      Effect.gen({ self: this }, function* () {
        const box = yield* this.#get<RegisteredBox>(`box:${name}`);
        if (!box) return yield* new RouterFailed({ message: `${name} isn't registered` });
        box.agents = yield* Schema.decodeUnknownEffect(Schema.Array(SlackAgent))(agents);
        const message = {
          channel: this.env.SLACK_CHANNEL,
          text: `${name} ready`,
          blocks: talkBlocks(box),
          username: ROUTER_NAME,
        };
        const updated = box.message && (yield* this.#slack('chat.update', { ...message, ts: box.message.ts })).ok;
        if (!updated) {
          const posted = yield* this.#slack('chat.postMessage', message);
          if (posted.ok && posted.channel && posted.ts) box.message = { channel: posted.channel, ts: posted.ts };
        }
        yield* this.#put(`box:${name}`, box);
      })
    );
  }

  unregister(name: string): Promise<void> {
    return runPromise(
      Effect.gen({ self: this }, function* () {
        const box = yield* this.#get<RegisteredBox>(`box:${name}`);
        if (!box) return;
        if (box.message) yield* this.#slack('chat.delete', box.message);
        yield* Effect.promise(() =>
          this.ctx.storage.delete(Object.values(box.tokens).map((token) => `token:${token}`))
        );
        for (const [key, selection] of yield* this.#list<Owner>('sel:'))
          if (selection.box === name) yield* forget(this.ctx.storage, key);
        yield* forget(this.ctx.storage, `box:${name}`);
      })
    );
  }

  #boxes(): Effect.Effect<Array<RegisteredBox>> {
    return Effect.map(this.#list<RegisteredBox>('box:'), (boxes) =>
      [...boxes.values()].filter((box) => box.agents.length)
    );
  }

  // The real bot's workspace and user, which boxes need for mention detection (`<@U…>`).
  #identity(): Effect.Effect<Identity, Failure> {
    return Effect.gen({ self: this }, function* () {
      const known = yield* this.#get<Identity>('identity');
      if (known) return known;
      const auth = yield* this.#slack('auth.test', {});
      if (!auth.ok) return yield* new RouterFailed({ message: `auth.test: ${auth.error}` });
      const me: Identity = {
        team: { id: auth.team_id ?? '', name: auth.team ?? '' },
        botUserId: auth.user_id ?? '',
        ...(auth.bot_id && { botId: auth.bot_id }),
        ...(auth.url && { url: auth.url }),
      };
      yield* this.#put('identity', me);

      return me;
    });
  }

  // --- Slack -> box ---

  inbound(request: Request): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const raw = yield* attempt('', () => request.text());
      if (!(yield* attempt('', () => verified(request.headers, raw, this.env.SLACK_SIGNING_SECRET ?? ''))))
        return new Response('bad signature\n', { status: 401 });
      // An event is queued before its ack, so a retry after a slow ack is a duplicate; one after an error isn't.
      if (request.headers.get('x-slack-retry-reason') === 'http_timeout') return ack();
      if (request.headers.get('content-type')?.includes('json')) {
        const body = yield* parse<SlackEventBody>(raw);
        if (body.type === 'url_verification') return Response.json({ challenge: body.challenge });
        if (body.type === 'event_callback') yield* this.#event(body);

        return ack();
      }
      const form = new URLSearchParams(raw);
      if (form.get('command')) return Response.json(yield* this.#command(form));
      // Slack's ssl_check for the command URL has neither.
      const payload = form.get('payload');
      if (!payload) return ack();

      return yield* this.#interaction(yield* parse<Interaction>(payload), raw);
    });
  }

  // New things (a mention in the channel, a main-DM message) go to the sender's selection; continued ones (a thread
  // reply, a reaction, an edit or delete of a known message) go to the box that owns the thread or message.
  #event(body: SlackEventBody): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      const event = body.event ?? {};
      if (event.type === 'app_home_opened') {
        if (event.tab === 'home' && event.user) this.#later('home', this.#publishHome(event.user));

        return;
      }
      const facts = classify(event, (yield* this.#identity()).botUserId, this.env.SLACK_CHANNEL);
      if (!facts) return;
      if (facts.dm && facts.kind !== 'reaction') yield* this.#put(`dm:${facts.channel}`, facts.user);
      const envelope: Envelope = {
        id: body.event_id,
        contentType: 'application/json',
        user: facts.user,
        body: JSON.stringify(body).replaceAll(SLACK_FILES, `${this.env.SLACK_ROUTER_URL}/files/`),
        notice: { channel: facts.channel, ts: replyTo(facts.channel, facts.ts, facts.thread) },
      };
      if (facts.kind === 'reaction' || facts.kind === 'edit') return yield* this.#continued(facts, envelope);

      return yield* this.#message(facts, envelope);
    });
  }

  // A reaction, edit or delete goes to the box that owns the message or its thread; a reaction on anything else
  // (the box's ready message) to the sender's selection.
  #continued({ kind, user, channel, ts, thread }: Facts, envelope: Envelope): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const owner =
        (yield* this.#ownerOf(channel, ts, thread)) ??
        (kind === 'reaction' ? yield* this.#get<Owner>(`sel:${user}`) : null);
      if (owner) yield* this.#forward(owner, envelope);
    });
  }

  #message(facts: Facts, envelope: Envelope): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      const { kind, user, channel, ts, thread, dm } = facts;
      // A mention comes as both `app_mention` and `message`, in either order: the second one is the same message.
      if (yield* this.#get(`msg:${channel}:${ts}`)) return;
      const owner = thread && (yield* this.#get<Owner>(`msg:${channel}:${thread}`));
      // A mention in a thread a box owns also comes as a `message`, which goes to that box.
      if (owner && kind === 'mention') return;
      if (owner) {
        yield* this.#claim(owner, facts);
        if (!dm && thread) yield* this.#noteOtherSelection(owner, user, channel, thread);
        yield* this.#forward(owner, envelope);

        return;
      }
      // In the channel only a mention starts something; a DM needs none.
      if (kind === 'message' && !dm) return;
      const selection = yield* this.#get<Owner>(`sel:${user}`);
      if (!selection) return yield* this.#pick(facts, envelope);
      yield* this.#claim(selection, facts);
      yield* this.#forward(selection, envelope);
    });
  }

  #ownerOf(
    channel: string | undefined,
    ts: string | undefined,
    thread: string | undefined
  ): Effect.Effect<Owner | undefined> {
    return Effect.gen({ self: this }, function* () {
      return (
        (ts ? yield* this.#get<Owner>(`msg:${channel}:${ts}`) : undefined) ??
        (thread ? yield* this.#get<Owner>(`msg:${channel}:${thread}`) : undefined)
      );
    });
  }

  // The first forwarded message of a thread decides its owner for good. The main DM has none: it follows the
  // person's selection, so switching boxes starts a new conversation on the new one.
  #claim(
    owner: Owner,
    { channel, ts, thread }: { channel: string; ts: string; thread?: string | undefined }
  ): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      yield* this.#put(`msg:${channel}:${ts}`, owner);
      if (thread && !(yield* this.#get(`msg:${channel}:${thread}`)))
        yield* this.#put(`msg:${channel}:${thread}`, owner);
    });
  }

  #noteOtherSelection(owner: Owner, user: string, channel: string, thread: string): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      const selection = yield* this.#get<Owner>(`sel:${user}`);
      if (!selection || (selection.box === owner.box && selection.agent === owner.agent)) return;
      const key = `noted:${channel}:${thread}:${user}`;
      if (yield* this.#get(key)) return;
      yield* this.#put(key, true);
      const bot = (yield* this.#identity()).botUserId;
      this.#later(
        'note',
        this.#ephemeral(channel, user, {
          thread_ts: thread,
          text: `This thread talks to *${label(owner)}*. Mention <@${bot}> in a new message to talk to *${label(selection)}*.`,
        })
      );
    });
  }

  // Nobody picked a box yet: the message waits while the sender picks one.
  #pick({ user, channel, ts, thread }: Facts, envelope: Envelope): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const key = `pending:${channel}:${ts}`;
      yield* this.#put(key, { channel, ts, thread, envelope } satisfies Pending);
      const boxes = yield* this.#boxes();
      const thread_ts = replyTo(channel, ts, thread);
      this.#later(
        'pick',
        this.#ephemeral(
          channel,
          user,
          boxes.length
            ? { thread_ts, text: 'Which box should answer?', blocks: boxes.flatMap((box) => talkBlocks(box, key)) }
            : { thread_ts, text: NO_BOX }
        )
      );
    });
  }

  #interaction(payload: Interaction, raw: string): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const action = payload.actions?.[0];
      if (payload.type === 'block_actions' && action?.action_id?.startsWith('novubox_'))
        return yield* this.#routerAction(payload, action);
      const channel = payload.channel?.id ?? payload.container?.channel_id;
      const ts = payload.container?.message_ts ?? payload.message?.ts;
      const owner = yield* this.#interactionOwner(payload, channel, ts);
      if (!owner) return ack();
      const envelope: Envelope = {
        id: payload.trigger_id ?? action?.action_ts,
        contentType: 'application/x-www-form-urlencoded',
        user: payload.user?.id,
        body: raw,
        notice: channel ? { channel, ts: replyTo(channel, ts, payload.message?.thread_ts) } : undefined,
      };
      // A modal submission and an options request answer with the box's response; there is no time to wake it.
      if (payload.type === 'view_submission' || payload.type === 'block_suggestion') {
        const answer = yield* this.#deliver({ ...envelope, box: owner.box, agent: owner.agent, at: Date.now() }, 2500);

        return answer?.ok && answer.text
          ? new Response(answer.text, { headers: { 'content-type': answer.contentType } })
          : ack();
      }
      yield* this.#forward(owner, envelope);

      return ack();
    });
  }

  // A modal's box, or the box that owns the message or thread the click was on.
  #interactionOwner(
    payload: Interaction,
    channel: string | undefined,
    ts: string | undefined
  ): Effect.Effect<Owner | undefined> {
    const view = payload.view?.id;
    const inView = view && (payload.type !== 'block_actions' || payload.container?.type === 'view');

    return inView ? this.#get<Owner>(`view:${view}`) : this.#ownerOf(channel, ts, payload.message?.thread_ts);
  }

  // The router's own buttons: Talk to (ready message, App Home, /novu-box) and the picker.
  #routerAction(payload: Interaction, action: { readonly action_id?: string; readonly value?: string }) {
    return Effect.gen({ self: this }, function* () {
      if (!action.action_id?.startsWith('novubox_talk') || !payload.user) return ack();
      const user = payload.user.id;
      const { box, agent, pending } = yield* parse<{ box: string; agent: string; pending?: string }>(
        action.value ?? ''
      );
      const selection = yield* this.#select(user, box, agent);
      const text = selection ? yield* this.#talkingTo(selection) : `${box} isn't running any more.`;
      const responseUrl = payload.response_url;
      if (payload.container?.type === 'view') this.#later('home', this.#publishHome(user));
      else if (responseUrl)
        this.#later(
          'response_url',
          this.#http(
            HttpClientRequest.post(responseUrl).pipe(
              HttpClientRequest.bodyJsonUnsafe({ response_type: 'ephemeral', replace_original: Boolean(pending), text })
            )
          )
        );
      const waiting = selection && pending ? yield* this.#get<Pending>(pending) : undefined;
      if (selection && pending && waiting) {
        yield* forget(this.ctx.storage, pending);
        yield* this.#claim(selection, waiting);
        yield* this.#forward(selection, waiting.envelope);
      }

      return ack();
    });
  }

  #select(user: string, name: string, identifier: string | undefined): Effect.Effect<Owner | null> {
    return Effect.gen({ self: this }, function* () {
      const box = yield* this.#get<RegisteredBox>(`box:${name}`);
      const agent =
        box?.agents.find((item) => item.identifier === identifier || short(item.identifier) === identifier) ??
        (identifier ? undefined : box?.agents[0]);
      if (!agent) return null;
      const selection = { box: name, agent: agent.identifier };
      yield* this.#put(`sel:${user}`, selection);

      return selection;
    });
  }

  #talkingTo(selection: Owner): Effect.Effect<string, Failure> {
    return Effect.map(
      this.#identity(),
      (me) =>
        `You're talking to *${label(selection)}*. Mention <@${me.botUserId}> in <#${this.env.SLACK_CHANNEL}>, or write to me in a DM.`
    );
  }

  // /novu-box [box [agent]]: lists the boxes, or talks to one (its first agent unless named).
  #command(form: URLSearchParams) {
    return Effect.gen({ self: this }, function* () {
      const [name, agent] = (form.get('text') ?? '').trim().split(/\s+/).filter(Boolean);
      const boxes = yield* this.#boxes();
      const reply = (text: string, blocks?: ReadonlyArray<unknown>) => ({
        response_type: 'ephemeral',
        text,
        ...(blocks && { blocks }),
      });
      if (!name)
        return boxes.length
          ? reply(
              'Novu Boxes',
              boxes.flatMap((box) => talkBlocks(box))
            )
          : reply(NO_BOX);
      const selection = yield* this.#select(form.get('user_id') ?? '', name, agent);
      if (!selection) {
        const running = boxes.map((box) => box.name).join(', ') || 'none';

        return reply(`No box ${name}${agent ? ` with agent ${agent}` : ''}. Running: ${running}.`);
      }

      return reply(yield* this.#talkingTo(selection));
    });
  }

  #publishHome(user: string): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      const selection = yield* this.#get<Owner>(`sel:${user}`);
      const boxes = yield* this.#boxes();
      const blocks = [
        { type: 'header', text: { type: 'plain_text', text: 'Novu Box' } },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: selection ? yield* this.#talkingTo(selection) : 'Pick a box and an agent to talk to.',
            },
          ],
        },
        ...(boxes.length
          ? boxes.flatMap((box) => [{ type: 'divider' }, ...talkBlocks(box)])
          : [{ type: 'section', text: { type: 'mrkdwn', text: NO_BOX } }]),
      ];
      yield* this.#slack('views.publish', { user_id: user, view: { type: 'home', blocks } });
    });
  }

  // Every event waits in its box's queue, written before Slack gets its ack, so none is lost and a box gets its
  // events in the order they came.
  #forward(owner: Owner, envelope: Envelope): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const item: Item = { ...envelope, box: owner.box, agent: owner.agent, at: Date.now() };
      yield* this.#put(`q:${owner.box}:${String(item.at).padStart(15, '0')}:${random(4)}`, item);
      if (!(yield* Effect.promise(() => this.ctx.storage.getAlarm())))
        yield* Effect.promise(() => this.ctx.storage.setAlarm(Date.now() + RETRY_MS));
      this.#later('hand over', this.#handOver(item));
    });
  }

  // Only a box that was asleep gets the "Waking" notice: a running box can miss once (its API restarting after an
  // apply, a redeploy) and answers on the next try.
  #handOver(item: Item): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      const box = this.env.BOX.get(this.env.BOX.idFromName(item.box));
      const { running } = yield* attempt('', () => box.state() as Promise<{ running: boolean }>).pipe(
        Effect.orElseSucceed(() => ({ running: true }))
      );
      if (!running) yield* this.#wakingNotice(item);
      yield* this.#drain(item.box);
    });
  }

  // Hands a box its waiting events, oldest first, until it doesn't answer; the alarm tries again.
  #drain(box: string): Effect.Effect<void, Failure> {
    if (this.#draining.has(box)) return Effect.void;
    this.#draining.add(box);

    return Effect.gen({ self: this }, function* () {
      for (;;) {
        const [entry] = yield* this.#list<Item>(`q:${box}:`, 1);
        if (!entry) return yield* this.#endNotices(box);
        const [key, item] = entry;
        const late = Date.now() - item.at > GIVE_UP_MS;
        if (late)
          yield* this.#endNotices(box, `${box} didn't wake within ${GIVE_UP_MS / 60000} minutes; try again later.`);
        else if (!(yield* this.#deliver(item))) return;
        yield* forget(this.ctx.storage, key);
      }
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          this.#draining.delete(box);
        })
      )
    );
  }

  override alarm(): Promise<void> {
    return runPromise(
      Effect.gen({ self: this }, function* () {
        const boxes = new Set([...(yield* this.#list<Item>('q:')).values()].map((item) => item.box));
        yield* Effect.forEach([...boxes], (box) => this.#drain(box), { concurrency: 'unbounded', discard: true });
        if ((yield* this.#list('q:', 1)).size)
          yield* Effect.promise(() => this.ctx.storage.setAlarm(Date.now() + RETRY_MS));
      })
    );
  }

  // The box's answer once it took the event (an error answer counts: retrying won't help); null while it's asleep
  // or starting. An event for a box or agent that's gone is dropped, and its sender told.
  #deliver(item: Item, timeoutMs?: number): Effect.Effect<SlackAnswer | null, Failure> {
    return Effect.gen({ self: this }, function* () {
      const box = yield* this.#get<RegisteredBox>(`box:${item.box}`);
      const agent = box?.agents.find((candidate) => candidate.identifier === item.agent);
      if (!box || !agent) {
        yield* this.#gone(item);

        return { ok: false, status: 410, contentType: 'text/plain', text: '' };
      }
      const timestamp = String(Math.floor(Date.now() / 1000));
      const started = Date.now();
      const signature = yield* attempt('', () => hmacHex(box.signingSecret, `v0:${timestamp}:${item.body}`));
      const answer = yield* attempt('', () =>
        this.env.BOX.get(this.env.BOX.idFromName(item.box)).slackEvent({
          ...(item.id && { id: item.id }),
          agent,
          ...(item.user && { user: item.user }),
          headers: {
            'content-type': item.contentType,
            'x-slack-request-timestamp': timestamp,
            'x-slack-signature': `v0=${signature}`,
          },
          body: item.body,
          ...(timeoutMs && { timeoutMs }),
        })
      ).pipe(Effect.catch((error) => Effect.as(log(`${item.box} didn't answer: ${error.message}`), null)));
      if (!answer) return null;
      yield* log(`${label(item)} took the event in ${Date.now() - started} ms: ${answer.status}`);
      if (!answer.ok) yield* log(`${item.box} answered ${answer.status}: ${answer.text.slice(0, 300)}`);

      return answer;
    });
  }

  #gone(item: Item): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      yield* log(`dropped an event for ${label(item)}: not registered`);
      if (!item.user || !item.notice?.channel) return;
      const bot = (yield* this.#identity()).botUserId;
      yield* this.#ephemeral(item.notice.channel, item.user, {
        thread_ts: item.notice.ts,
        text: `*${label(item)}* isn't running any more. Mention <@${bot}> in a new message to talk to another box.`,
      });
    });
  }

  #wakingNotice(item: Item): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      if (!item.notice?.channel) return;
      const key = `notice:${item.box}:${item.notice.channel}:${item.notice.ts ?? ''}`;
      if (yield* this.#get(key)) return;
      yield* this.#put(key, { at: Date.now() } satisfies PostedNotice);
      const posted = yield* this.#slack('chat.postMessage', {
        channel: item.notice.channel,
        thread_ts: item.notice.ts,
        text: `Waking ${item.box} (about 40 s)…`,
        username: `${item.box} · ${ROUTER_NAME}`,
      });
      if (posted.ok && posted.channel && posted.ts)
        yield* this.#put(key, { at: Date.now(), channel: posted.channel, ts: posted.ts } satisfies PostedNotice);
    });
  }

  #endNotices(box: string, failure?: string): Effect.Effect<void, Failure> {
    return Effect.gen({ self: this }, function* () {
      for (const [key, notice] of yield* this.#list<PostedNotice>(`notice:${box}:`)) {
        yield* forget(this.ctx.storage, key);
        if (!notice.ts) continue;
        const text = failure ?? `Woke ${box} in ${Math.round((Date.now() - notice.at) / 1000)} s.`;
        yield* this.#slack('chat.update', { channel: notice.channel, ts: notice.ts, text });
      }
    });
  }

  // --- box -> Slack ---

  outbound(request: Request, method: string): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const raw = yield* attempt('', () => request.text());
      const json = Boolean(request.headers.get('content-type')?.includes('json'));
      const params: Params = json ? yield* parse<Params>(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
      const owner = yield* this.#get<Owner>(`token:${bearer(request) ?? params.token}`);
      // Not a token the router minted (a person's own Slack app, connected in the box's dashboard): Slack decides.
      if (!owner) return yield* this.#passThrough(request, method, raw);
      delete params.token;
      if (method === 'auth.test') return Response.json(authTest(yield* this.#identity()));
      const refused = yield* this.#refusal(method, params, owner);
      if (refused) {
        yield* log(`refused ${method} from ${label(owner)}: ${refused}`);

        return Response.json({ ok: false, error: refused });
      }
      if (method === 'chat.postMessage' || method === 'chat.postEphemeral') params.username = label(owner);

      const request_ = HttpClientRequest.post(`${SLACK_API}${method}`).pipe(
        HttpClientRequest.bearerToken(this.env.SLACK_BOT_TOKEN ?? '')
      );
      const response = yield* this.#http(
        json
          ? HttpClientRequest.bodyText(request_, JSON.stringify(params), 'application/json; charset=utf-8')
          : HttpClientRequest.bodyUrlParams(request_, params as Record<string, string>)
      );
      const body = yield* this.#json<SlackResult>(response);
      if (body.ok) yield* this.#record(method, params, body, owner);
      else yield* log(`${label(owner)} ${method}: ${body.error}`);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      const retryAfter = response.headers['retry-after'];
      if (retryAfter) headers['retry-after'] = retryAfter;

      return new Response(JSON.stringify(body), { status: response.status, headers });
    });
  }

  #refusal(method: string, params: Params, owner: Owner): Effect.Effect<string | null> {
    return Effect.gen({ self: this }, function* () {
      if (!Object.hasOwn(METHODS, method)) return 'method_not_allowed_by_novu_box';
      const unchecked = UNCHECKED_CHANNELS[method];
      if (unchecked && params[unchecked]) return 'channel_not_allowed_by_novu_box';
      const parameter = METHODS[method];
      const channel = parameter ? params[parameter] : undefined;
      if (parameter && !(yield* this.#allowedChannel(channel))) return 'channel_not_allowed_by_novu_box';
      if (OWN_MESSAGE.has(method) && (yield* this.#get<Owner>(`msg:${channel}:${params.ts}`))?.box !== owner.box)
        return 'message_not_owned_by_this_box';

      return null;
    });
  }

  #allowedChannel(channel: unknown): Effect.Effect<boolean> {
    if (channel === this.env.SLACK_CHANNEL) return Effect.succeed(true);
    if (typeof channel !== 'string' || !isDm(channel)) return Effect.succeed(false);

    return Effect.map(this.#get(`dm:${channel}`), Boolean);
  }

  // Message and view owners, from what the box posted, so replies, reactions, edits and clicks find the box.
  #record(method: string, params: Params, body: SlackResult, owner: Owner): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      if (method === 'chat.postMessage' || method === 'chat.startStream')
        yield* this.#put(`msg:${body.channel}:${body.ts}`, owner);
      if (method === 'chat.postEphemeral' && body.message_ts)
        yield* this.#put(`msg:${params.channel}:${body.message_ts}`, owner);
      if (method.startsWith('views.') && body.view?.id) yield* this.#put(`view:${body.view.id}`, owner);
      if (method === 'files.getUploadURLExternal' && body.upload_url)
        body.upload_url = `${this.env.SLACK_ROUTER_URL}/upload?url=${encodeURIComponent(body.upload_url)}`;
    });
  }

  download(request: Request, url: URL): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      if (!(yield* this.#get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
      const response = yield* this.#http(
        HttpClientRequest.get(`${SLACK_FILES}${url.pathname.slice('/files/'.length)}${url.search}`).pipe(
          HttpClientRequest.bearerToken(this.env.SLACK_BOT_TOKEN ?? '')
        )
      );

      return relayed(response);
    });
  }

  upload(request: Request, url: URL): Effect.Effect<Response, Failure> {
    return Effect.gen({ self: this }, function* () {
      const target = yield* Effect.try({
        try: () => new URL(url.searchParams.get('url') ?? ''),
        catch: () => new RouterFailed({ message: 'not a URL' }),
      }).pipe(Effect.orElseSucceed(() => null));
      if (target?.origin !== new URL(SLACK_FILES).origin)
        return new Response('not a Slack upload URL\n', { status: 400 });
      if (!(yield* this.#get(`token:${bearer(request)}`))) return new Response('unknown token\n', { status: 403 });
      const body = yield* attempt('', () => request.arrayBuffer());
      const response = yield* this.#http(
        HttpClientRequest.post(target.href).pipe(
          HttpClientRequest.bearerToken(this.env.SLACK_BOT_TOKEN ?? ''),
          HttpClientRequest.bodyUint8Array(
            new Uint8Array(body),
            request.headers.get('content-type') ?? 'application/octet-stream'
          )
        )
      );

      return relayed(response);
    });
  }

  #passThrough(request: Request, method: string, raw: string): Effect.Effect<Response, Failure> {
    const authorization = request.headers.get('authorization');
    let outgoing = HttpClientRequest.make(request.method === 'GET' ? 'GET' : 'POST')(
      `${SLACK_API}${method}${new URL(request.url).search}`
    );
    if (authorization) outgoing = HttpClientRequest.setHeader(outgoing, 'authorization', authorization);
    if (request.method !== 'GET')
      outgoing = HttpClientRequest.bodyText(
        outgoing,
        raw,
        request.headers.get('content-type') ?? 'application/x-www-form-urlencoded'
      );

    return Effect.map(this.#http(outgoing), (response) => relayed(response, true));
  }

  // --- helpers ---

  #slack(method: string, params: Params): Effect.Effect<SlackResult, Failure> {
    return Effect.gen({ self: this }, function* () {
      const response = yield* this.#http(
        HttpClientRequest.post(`${SLACK_API}${method}`).pipe(
          HttpClientRequest.bearerToken(this.env.SLACK_BOT_TOKEN ?? ''),
          HttpClientRequest.bodyText(JSON.stringify(params), 'application/json; charset=utf-8')
        )
      );
      const body = yield* this.#json<SlackResult>(response);
      if (!body.ok) yield* log(`router ${method}: ${body.error} ${JSON.stringify(body.response_metadata ?? {})}`);

      return body;
    });
  }

  #ephemeral(channel: string, user: string, message: Params): Effect.Effect<SlackResult, Failure> {
    return this.#slack('chat.postEphemeral', { channel, user, username: ROUTER_NAME, ...message });
  }

  #http(request: HttpClientRequest.HttpClientRequest): Effect.Effect<HttpClientResponse.HttpClientResponse, Failure> {
    return Effect.flatMap(HttpClient.HttpClient, (client) => client.execute(request)).pipe(
      Effect.provide(FetchHttpClient.layer)
    );
  }

  #json<A>(response: HttpClientResponse.HttpClientResponse): Effect.Effect<A, Failure> {
    return Effect.map(response.json, (body) => body as A);
  }

  // Work that outlives the request (Slack wants its ack within 3 s); the Durable Object keeps running it.
  #later(what: string, effect: Effect.Effect<unknown, Failure>): void {
    later(this.ctx, what, effect);
  }

  #get<A = unknown>(key: string): Effect.Effect<A | undefined> {
    return stored<A>(this.ctx.storage, key);
  }

  #put(key: string, value: unknown): Effect.Effect<void> {
    return store(this.ctx.storage, key, value);
  }

  #list<A>(prefix: string, limit?: number): Effect.Effect<Map<string, A>> {
    return Effect.promise(() => this.ctx.storage.list<A>({ prefix, ...(limit && { limit }) }));
  }
}

function parse<A>(text: string): Effect.Effect<A, RouterFailed> {
  return Effect.try({
    try: () => JSON.parse(text) as A,
    catch: (error) => new RouterFailed({ message: `not JSON: ${messageOf(error)}` }),
  });
}

// What an event is, or null for what the router ignores: the bot's own messages, other channels, and other
// subtypes. `kind`: a reaction, an edit (or delete), a mention (`app_mention`, only in the channel), or a message.
function classify(event: SlackEventPayload, botUserId: string, home: string | undefined): Facts | null {
  const reaction = event.type === 'reaction_added' || event.type === 'reaction_removed';
  const edit = event.subtype === 'message_changed' || event.subtype === 'message_deleted';
  const message = event.subtype === 'message_changed' ? event.message : (event.previous_message ?? event);
  const user = reaction ? event.user : message?.user;
  const channel = reaction ? event.item?.channel : event.channel;
  const dm = isDm(channel);
  if (!user || !channel || user === botUserId || message?.bot_id || (!dm && channel !== home)) return null;
  if (reaction) return event.item?.ts ? { user, channel, dm, kind: 'reaction', ts: event.item.ts } : null;
  const ts = message?.ts ?? event.deleted_ts;
  if (edit) return ts ? { user, channel, dm, kind: 'edit', ts, thread: message?.thread_ts } : null;
  const kind = newKind(event, dm);

  return kind && event.ts ? { user, channel, dm, kind, ts: event.ts, thread: threadOf(event) } : null;
}

function newKind(event: SlackEventPayload, dm: boolean): 'mention' | 'message' | null {
  if (event.type === 'app_mention') return dm ? null : 'mention';
  if (event.type === 'message' && [undefined, 'file_share', 'thread_broadcast'].includes(event.subtype))
    return 'message';

  return null;
}

function threadOf(event: SlackEventPayload): string | undefined {
  return event.thread_ts && event.thread_ts !== event.ts ? event.thread_ts : undefined;
}

function isDm(channel: string | undefined): boolean {
  return Boolean(channel?.startsWith('D'));
}

// Where the router answers about a message: in its thread, in a new thread on a channel message, or in the DM.
function replyTo(channel: string, ts: string | undefined, thread: string | undefined): string | undefined {
  return thread ?? (isDm(channel) ? undefined : ts);
}

// "<box> ready · Talk to: custom-code | ai-sdk | langchain", with a link to its dashboard. `pending`: the picker,
// which then forwards the waiting message. Action IDs are unique per message and view, so they name the box.
function talkBlocks(box: RegisteredBox, pending?: string): Array<unknown> {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${box.name}* ready · Talk to:` } },
    {
      type: 'actions',
      elements: [
        ...box.agents.map((agent) => ({
          type: 'button',
          action_id: `novubox_talk:${box.name}:${agent.identifier}`,
          text: { type: 'plain_text', text: short(agent.identifier) },
          value: JSON.stringify({ box: box.name, agent: agent.identifier, ...(pending && { pending }) }),
        })),
        {
          type: 'button',
          action_id: `novubox_open:${box.name}`,
          text: { type: 'plain_text', text: 'Open dashboard' },
          url: box.origin,
        },
      ],
    },
  ];
}

// Slack's answer as it came: its status and body, with the headers worth keeping (all of them for a pass-through,
// but the encoding and length of a body fetch already decompressed).
function relayed(response: HttpClientResponse.HttpClientResponse, allHeaders = false): Response {
  const names = allHeaders
    ? Object.keys(response.headers).filter((name) => name !== 'content-encoding' && name !== 'content-length')
    : ['content-type', 'content-length', 'content-disposition'];
  const headers = Object.fromEntries(
    names.flatMap((name) => {
      const value = response.headers[name];

      return value ? [[name, value]] : [];
    })
  );

  return new Response(Stream.toReadableStream(response.stream), { status: response.status, headers });
}

function authTest(me: Identity) {
  return { ok: true, url: me.url, team: me.team.name, team_id: me.team.id, user_id: me.botUserId, bot_id: me.botId };
}

function label({ box, agent }: Owner): string {
  return `${box} · ${short(agent)}`;
}

function short(identifier: string): string {
  return identifier.replace(/-agent$/, '');
}

function ack(): Response {
  return new Response(null, { status: 200 });
}

function random(bytes: number): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret: string, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);

  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Slack's request signature: v0=HMAC-SHA256(signing secret, "v0:<timestamp>:<body>"), within 5 minutes.
async function verified(headers: Headers, raw: string, secret: string): Promise<boolean> {
  const timestamp = headers.get('x-slack-request-timestamp');
  const signature = headers.get('x-slack-signature') ?? '';
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = new TextEncoder().encode(`v0=${await hmacHex(secret, `v0:${timestamp}:${raw}`)}`);
  const given = new TextEncoder().encode(signature);

  return expected.length === given.length && crypto.subtle.timingSafeEqual(expected, given);
}
