import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';
import { wsTestServer } from '@novu/testing';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import { io, Socket } from 'socket.io-client';
import { WSGateway } from './ws.gateway';

const LOG_PATH = process.env.WS_SESSION_EXPIRY_LOG ?? join(tmpdir(), 'ws-session-expiry.log');
const DAY_IN_SECONDS = 24 * 60 * 60;

type ObservedEvent = { at: number; client: string; event: string; detail?: string };

const subscriberRepository = new SubscriberRepository();
const observed: ObservedEvent[] = [];

function objectId() {
  return randomBytes(12).toString('hex');
}

async function createSubscriber(): Promise<SubscriberEntity> {
  return subscriberRepository.create({
    _environmentId: objectId(),
    _organizationId: objectId(),
    subscriberId: `ws-expiry-${objectId()}`,
  });
}

function signSession(subscriber: SubscriberEntity, exp: number, authMethod?: 'token') {
  return jwt.sign(
    {
      _id: subscriber._id,
      subscriberId: subscriber.subscriberId,
      organizationId: subscriber._organizationId,
      environmentId: subscriber._environmentId,
      contextKeys: [],
      firstName: '',
      lastName: '',
      email: '',
      exp,
      ...(authMethod && { authMethod }),
    },
    process.env.JWT_SECRET as string,
    { algorithm: 'HS256', audience: 'widget_user', issuer: 'novu_api' }
  );
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

type TrackedClient = {
  socket: Socket;
  connected: Promise<void>;
  disconnected: Promise<{ reason: string; at: number }>;
  sessionExpiredAt: () => number | undefined;
};

function connect(name: string, token: string): TrackedClient {
  const socket = io(`http://localhost:${process.env.PORT}`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
  let sessionExpiredAt: number | undefined;

  socket.onAny((event: string) => {
    observed.push({ at: Date.now(), client: name, event });
    if (event === WebSocketEventEnum.SESSION_EXPIRED) {
      sessionExpiredAt = Date.now();
    }
  });

  const connected = new Promise<void>((resolve) =>
    socket.once('connect', () => {
      observed.push({ at: Date.now(), client: name, event: 'connect' });
      resolve();
    })
  );
  const disconnected = new Promise<{ reason: string; at: number }>((resolve) =>
    socket.once('disconnect', (reason) => {
      const at = Date.now();
      observed.push({ at, client: name, event: 'disconnect', detail: reason });
      resolve({ reason, at });
    })
  );

  return { socket, connected, disconnected, sessionExpiredAt: () => sessionExpiredAt };
}

function within<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error(`${label} did not happen within ${ms}ms`);
    }),
  ]);
}

async function findSubscriber(subscriber: SubscriberEntity) {
  return subscriberRepository.findOne({ _id: subscriber._id, _environmentId: subscriber._environmentId });
}

async function waitForPresence(subscriber: SubscriberEntity, presence: 'online' | 'offline') {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const found = await findSubscriber(subscriber);
    const matches =
      presence === 'online' ? found?.isOnline === true : found?.isOnline === false && !!found.lastOnlineAt;
    if (matches) {
      return;
    }
    await sleep(50);
  }
  throw new Error(`subscriber ${subscriber._id} was not marked ${presence}`);
}

async function expectClosedAtExpiry(name: string, authMethod?: 'token') {
  const subscriber = await createSubscriber();
  const exp = nowInSeconds() + 3;
  const client = connect(name, signSession(subscriber, exp, authMethod));
  await within(client.connected, 2000, `${name} connect`);
  await waitForPresence(subscriber, 'online');

  const { reason, at } = await within(client.disconnected, 6000, `${name} server disconnect`);

  expect(reason).to.equal('io server disconnect');
  const expiredAt = client.sessionExpiredAt();
  expect(expiredAt, `${name} received ${WebSocketEventEnum.SESSION_EXPIRED}`).to.be.a('number');
  expect(expiredAt).to.be.at.most(at);
  expect(at).to.be.within(exp * 1000 - 50, exp * 1000 + 1000);

  await waitForPresence(subscriber, 'offline');
}

describe('WSGateway session expiry', () => {
  // 30 days is past setTimeout's 2^31-1 ms (~24.8 days) limit; SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME allows it.
  const longSessions = [15, 30].map((days) => ({ days, name: `hmac-${days}-days` }));
  const longClients = new Map<string, { subscriber: SubscriberEntity; client: TrackedClient }>();

  before(async () => {
    for (const { days, name } of longSessions) {
      const subscriber = await createSubscriber();
      const client = connect(name, signSession(subscriber, nowInSeconds() + days * DAY_IN_SECONDS));
      longClients.set(name, { subscriber, client });
      await within(client.connected, 2000, `${name} connect`);
    }
  });

  after(() => {
    for (const { client } of longClients.values()) {
      client.socket.disconnect();
    }
    writeFileSync(
      LOG_PATH,
      observed
        .sort((a, b) => a.at - b.at)
        .map((e) => `${new Date(e.at).toISOString()} ${e.client} ${e.event}${e.detail ? ` ${e.detail}` : ''}`)
        .join('\n')
        .concat('\n')
    );
  });

  it('closes a token session at its exp after emitting session_expired, and marks the subscriber offline', async () => {
    await expectClosedAtExpiry('token-2s', 'token');
  });

  it('closes an HMAC session at its exp the same way', async () => {
    await expectClosedAtExpiry('hmac-2s');
  });

  it('refuses a session that is already expired at connect', async () => {
    const subscriber = await createSubscriber();
    const client = connect('expired-at-connect', signSession(subscriber, nowInSeconds() - 10, 'token'));

    const { reason } = await within(client.disconnected, 2000, 'expired-at-connect refusal');

    expect(reason).to.equal('io server disconnect');
    expect(client.sessionExpiredAt()).to.equal(undefined);
    expect((await findSubscriber(subscriber))?.isOnline).to.equal(false);
  });

  it('sends nothing to a client that left before exp, and marks the subscriber offline', async () => {
    const subscriber = await createSubscriber();
    const exp = nowInSeconds() + 3;
    const client = connect('leaves-early', signSession(subscriber, exp, 'token'));
    await within(client.connected, 2000, 'leaves-early connect');
    await waitForPresence(subscriber, 'online');

    client.socket.disconnect();
    expect((await client.disconnected).reason).to.equal('io client disconnect');
    await waitForPresence(subscriber, 'offline');
    const offlineAt = (await findSubscriber(subscriber))?.lastOnlineAt;

    await sleep(Math.max(0, exp * 1000 + 1000 - Date.now()));

    expect(client.sessionExpiredAt()).to.equal(undefined);
    const stored = await findSubscriber(subscriber);
    expect(stored?.isOnline).to.equal(false);
    expect(stored?.lastOnlineAt).to.equal(offlineAt);
  });

  for (const { name } of longSessions) {
    it(`keeps a ${name} session open and delivering messages after the short sessions closed`, async () => {
      const { subscriber, client } = longClients.get(name)!;
      expect(client.socket.connected).to.equal(true);
      expect(client.sessionExpiredAt()).to.equal(undefined);

      const received = new Promise((resolve) => client.socket.once(WebSocketEventEnum.AGENT_EVENT, resolve));
      await wsTestServer
        .getService(WSGateway)
        .sendMessage(subscriber._id, WebSocketEventEnum.AGENT_EVENT, { message: 'still here' }, []);

      expect(await within(received, 3000, `${name} message`)).to.deep.equal({ message: 'still here' });
    });
  }
});
