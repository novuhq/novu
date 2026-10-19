import { DurableObject } from 'cloudflare:workers';
import { messageOf } from '../../shared/errors.ts';
import type { HostEnv } from '../env.ts';
import {
  ephemeral,
  hmacHex,
  identity,
  label,
  ROUTER_NAME,
  type RouterCore,
  random,
  slack,
  talkBlocks,
} from './core.ts';
import { inbound } from './inbound.ts';
import type { Envelope, Item, Owner, PostedNotice, RegisteredBox } from './model.ts';
import { download, outbound, upload } from './outbound.ts';
import type { SlackAgent, SlackAnswer, SlackCredentials } from './types.ts';

const RETRY_MS = 10 * 1000;
// A first restore of a new snapshot takes 4 to 6 minutes; a wake about 40 s.
const GIVE_UP_MS = 8 * 60 * 1000;

export class Router extends DurableObject<HostEnv> {
  readonly #draining = new Set<string>();
  readonly #core: RouterCore = {
    storage: this.ctx.storage,
    env: this.env,
    forward: (owner, envelope) => this.#forward(owner, envelope),
    deliver: (item, timeoutMs) => this.#deliver(item, timeoutMs),
    later: (what, work) =>
      this.ctx.waitUntil(work.catch((error: unknown) => console.log(`${what}: ${messageOf(error)}`))),
  };

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      return await this.#route(request, url);
    } catch (error) {
      console.log(`${request.method} ${url.pathname}: ${messageOf(error)}`);

      return new Response('router error\n', { status: 500 });
    }
  }

  #route(request: Request, url: URL): Promise<Response> {
    if (request.method === 'POST' && url.pathname === '/slack') return inbound(this.#core, request);
    if (url.pathname.startsWith('/api/')) return outbound(this.#core, request, url.pathname.slice(5));
    if (url.pathname.startsWith('/files/')) return download(this.#core, request, url);
    if (request.method === 'POST' && url.pathname === '/upload') return upload(this.#core, request, url);

    return Promise.resolve(new Response('not found\n', { status: 404 }));
  }

  async register(name: string, origin: string, identifiers: ReadonlyArray<string>): Promise<SlackCredentials> {
    const box: RegisteredBox = (await this.#core.storage.get<RegisteredBox>(`box:${name}`)) ?? {
      name,
      signingSecret: random(16),
      tokens: {},
      agents: [],
    };
    box.origin = origin;
    const tokens: Record<string, string> = {};
    for (const identifier of identifiers) tokens[identifier] = box.tokens[identifier] ?? `xoxb-novu-box-${random(18)}`;
    for (const [identifier, token] of Object.entries(box.tokens))
      if (!tokens[identifier]) await this.#core.storage.delete(`token:${token}`);
    for (const [agent, token] of Object.entries(tokens))
      await this.#core.storage.put(`token:${token}`, { box: name, agent });
    box.tokens = tokens;
    await this.#core.storage.put(`box:${name}`, box);
    const me = await identity(this.#core);

    return { signingSecret: box.signingSecret, tokens, team: me.team, botUserId: me.botUserId };
  }

  async ready(name: string, agents: ReadonlyArray<SlackAgent>): Promise<void> {
    const box = await this.#core.storage.get<RegisteredBox>(`box:${name}`);
    if (!box) throw new Error(`${name} isn't registered`);
    box.agents = agents;
    const message = {
      channel: this.env.SLACK_CHANNEL,
      text: `${name} ready`,
      blocks: talkBlocks(box),
      username: ROUTER_NAME,
    };
    const updated = box.message && (await slack(this.#core, 'chat.update', { ...message, ts: box.message.ts })).ok;
    if (!updated) {
      const posted = await slack(this.#core, 'chat.postMessage', message);
      if (posted.ok && posted.channel && posted.ts) box.message = { channel: posted.channel, ts: posted.ts };
    }
    await this.#core.storage.put(`box:${name}`, box);
  }

  async unregister(name: string): Promise<void> {
    const box = await this.#core.storage.get<RegisteredBox>(`box:${name}`);
    if (!box) return;
    if (box.message) await slack(this.#core, 'chat.delete', box.message);
    await this.ctx.storage.delete(Object.values(box.tokens).map((token) => `token:${token}`));
    for (const [key, selection] of await this.#core.storage.list<Owner>({ prefix: 'sel:' }))
      if (selection.box === name) await this.#core.storage.delete(key);
    await this.#core.storage.delete(`box:${name}`);
  }

  async #forward(owner: Owner, envelope: Envelope): Promise<void> {
    const item: Item = { ...envelope, box: owner.box, agent: owner.agent, at: Date.now() };
    await this.#core.storage.put(`q:${owner.box}:${String(item.at).padStart(15, '0')}:${random(4)}`, item);
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
    this.#core.later('hand over', this.#handOver(item));
  }

  async #handOver(item: Item): Promise<void> {
    const box = this.env.BOX.get(this.env.BOX.idFromName(item.box));
    const { running } = await box.state().catch(() => ({ running: true }));
    if (!running) await this.#wakingNotice(item);
    await this.#drain(item.box);
  }

  async #drain(box: string): Promise<void> {
    if (this.#draining.has(box)) return;
    this.#draining.add(box);
    try {
      for (;;) {
        const [entry] = await this.#core.storage.list<Item>({ prefix: `q:${box}:`, limit: 1 });
        if (!entry) return await this.#endNotices(box);
        const [key, item] = entry;
        if (Date.now() - item.at > GIVE_UP_MS)
          await this.#endNotices(box, `${box} didn't wake within ${GIVE_UP_MS / 60000} minutes; try again later.`);
        else if (!(await this.#deliver(item))) return;
        await this.#core.storage.delete(key);
      }
    } finally {
      this.#draining.delete(box);
    }
  }

  override async alarm(): Promise<void> {
    const boxes = new Set(
      [...(await this.#core.storage.list<Item>({ prefix: 'q:' })).values()].map((item) => item.box)
    );
    await Promise.all([...boxes].map((box) => this.#drain(box)));
    if ((await this.#core.storage.list({ prefix: 'q:', limit: 1 })).size)
      await this.ctx.storage.setAlarm(Date.now() + RETRY_MS);
  }

  async #deliver(item: Item, timeoutMs?: number): Promise<SlackAnswer | null> {
    const box = await this.#core.storage.get<RegisteredBox>(`box:${item.box}`);
    const agent = box?.agents.find((candidate) => candidate.identifier === item.agent);
    if (!box || !agent) {
      await this.#gone(item);

      return { ok: false, status: 410, contentType: 'text/plain', text: '' };
    }
    const timestamp = String(Math.floor(Date.now() / 1000));
    const started = Date.now();
    const signature = await hmacHex(box.signingSecret, `v0:${timestamp}:${item.body}`);
    const answer = await this.env.BOX.get(this.env.BOX.idFromName(item.box))
      .slackEvent({
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
      .catch((error: unknown) => {
        console.log(`${item.box} didn't answer: ${messageOf(error)}`);

        return null;
      });
    if (!answer) return null;
    console.log(`${label(item)} took the event in ${Date.now() - started} ms: ${answer.status}`);
    if (!answer.ok) console.log(`${item.box} answered ${answer.status}: ${answer.text.slice(0, 300)}`);

    return answer;
  }

  async #gone(item: Item): Promise<void> {
    console.log(`dropped an event for ${label(item)}: not registered`);
    if (!item.user || !item.notice?.channel) return;
    const bot = (await identity(this.#core)).botUserId;
    await ephemeral(this.#core, item.notice.channel, item.user, {
      thread_ts: item.notice.ts,
      text: `*${label(item)}* isn't running any more. Mention <@${bot}> in a new message to talk to another box.`,
    });
  }

  async #wakingNotice(item: Item): Promise<void> {
    if (!item.notice?.channel) return;
    const key = `notice:${item.box}:${item.notice.channel}:${item.notice.ts ?? ''}`;
    if (await this.#core.storage.get(key)) return;
    await this.#core.storage.put(key, { at: Date.now() } satisfies PostedNotice);
    const posted = await slack(this.#core, 'chat.postMessage', {
      channel: item.notice.channel,
      thread_ts: item.notice.ts,
      text: `Waking ${item.box} (about 40 s)…`,
      username: `${item.box} · ${ROUTER_NAME}`,
    });
    if (posted.ok && posted.channel && posted.ts)
      await this.#core.storage.put(key, {
        at: Date.now(),
        channel: posted.channel,
        ts: posted.ts,
      } satisfies PostedNotice);
  }

  async #endNotices(box: string, failure?: string): Promise<void> {
    for (const [key, notice] of await this.#core.storage.list<PostedNotice>({ prefix: `notice:${box}:` })) {
      await this.#core.storage.delete(key);
      if (!notice.ts) continue;
      const text = failure ?? `Woke ${box} in ${Math.round((Date.now() - notice.at) / 1000)} s.`;
      await slack(this.#core, 'chat.update', { channel: notice.channel, ts: notice.ts, text });
    }
  }
}
