import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import type { Session } from '../types';
import { PartySocketClient } from './party-socket';

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  binaryType = 'blob';
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    FakeWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.readyState !== FakeWebSocket.CONNECTING) return;
      this.readyState = FakeWebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send() {}

  close(code = 1000, reason = '') {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    setTimeout(() => this.dispatchEvent(Object.assign(new Event('close'), { code, reason, wasClean: true })), 0);
  }

  /** Simulates the server dropping the connection. */
  drop() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(Object.assign(new Event('close'), { code: 1006, reason: '', wasClean: false }));
  }
}

const openSockets = () => FakeWebSocket.instances.filter((ws) => ws.readyState !== FakeWebSocket.CLOSED);
const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const createClient = (socketOptions: Record<string, unknown> = {}) => {
  const emitter = new NovuEventEmitter();
  const client = new PartySocketClient({
    socketUrl: 'wss://socket.test',
    socketOptions: { minReconnectionDelay: 10, maxReconnectionDelay: 20, ...socketOptions },
    inboxServiceInstance: new InboxService(),
    eventEmitterInstance: emitter,
  });
  emitter.emit('session.initialize.resolved', {
    args: { applicationIdentifier: 'app', subscriber: { subscriberId: 'user_1' } },
    data: { token: 'token-1' } as Session,
  });

  return { client, emitter };
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PartySocketClient', () => {
  it('reconnects the same socket after a drop instead of opening a second one', async () => {
    const { client, emitter } = createClient();
    const disconnected = vi.fn();
    emitter.on('socket.disconnect.resolved', disconnected);

    await client.connect();
    await wait();
    openSockets()[0].drop();

    // A new subscriber while the socket is reconnecting
    await client.connect();
    await wait();

    expect(disconnected).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(openSockets()).toHaveLength(1);

    await client.disconnect();
  });

  it('stops reconnecting when disconnected after a drop', async () => {
    const { client } = createClient();

    await client.connect();
    await wait();
    openSockets()[0].drop();

    await client.disconnect();
    await wait();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(openSockets()).toHaveLength(0);
  });

  it('reports one disconnect when disconnected while reconnecting after a drop', async () => {
    const { client, emitter } = createClient();
    const disconnected = vi.fn();
    emitter.on('socket.disconnect.resolved', disconnected);

    await client.connect();
    await wait();
    openSockets()[0].drop();
    await client.disconnect();

    expect(disconnected).toHaveBeenCalledTimes(1);
  });

  it('keeps a socket whose last allowed retry is still scheduled', async () => {
    const { client } = createClient({ maxRetries: 2 });

    await client.connect();
    await wait();
    openSockets()[0].drop();
    await wait();
    // This drop schedules the second and last allowed retry, which waits out its backoff
    openSockets()[0].drop();

    await client.connect();
    expect(FakeWebSocket.instances).toHaveLength(2);

    await wait();
    expect(FakeWebSocket.instances).toHaveLength(3);
    expect(openSockets()).toHaveLength(1);

    await client.disconnect();
  });

  it('restarts a socket that used up a caller-provided maxRetries', async () => {
    const { client } = createClient({ maxRetries: 1 });

    await client.connect();
    await wait();
    openSockets()[0].drop();
    await wait();
    openSockets()[0].drop();
    await wait();

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(openSockets()).toHaveLength(0);

    await client.connect();
    await wait();

    expect(openSockets()).toHaveLength(1);

    await client.disconnect();
  });
});
