import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InboxService } from '../api';
import { NovuEventEmitter } from '../event-emitter';
import type { Session } from '../types';
import { Socket } from './socket';

type Handler = (...args: unknown[]) => void;

const fakeSocketIo = vi.hoisted(() => {
  const create = () => {
    const handlers = new Map<string, Handler>();
    const managerHandlers = new Map<string, Handler>();

    return {
      handlers,
      managerHandlers,
      on: (event: string, handler: Handler) => handlers.set(event, handler),
      connect: () => {},
      disconnect: () => {},
      io: {
        opts: {} as { query?: Record<string, string> },
        on: (event: string, handler: Handler) => managerHandlers.set(event, handler),
        reconnectionDelayMax: () => 10,
      },
    };
  };

  return { create, current: undefined as ReturnType<typeof create> | undefined };
});

vi.mock('socket.io-client', () => ({
  __esModule: true,
  default: vi.fn((_url: string, options: { query: Record<string, string> }) => {
    const socket = fakeSocketIo.create();
    socket.io.opts.query = options.query;
    socket.connect = vi.fn();
    fakeSocketIo.current = socket;

    return socket;
  }),
}));

const HOUR_MS = 60 * 60 * 1000;
const toBase64Url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const createJwt = (name: string, expiresAtMs: number) =>
  `${toBase64Url({ alg: 'HS256' })}.${toBase64Url({ sub: name, exp: Math.floor(expiresAtMs / 1000) })}.sig`;

let now = Date.now();
const oldToken = createJwt('old', now + HOUR_MS);
const newToken = createJwt('new', now + 3 * HOUR_MS);

const emitSession = (emitter: NovuEventEmitter, token: string) =>
  emitter.emit('session.initialize.resolved', {
    args: { applicationIdentifier: 'app', subscriber: { subscriberId: 'user_1' } },
    data: { token } as Session,
  });

const createClient = () => {
  const emitter = new NovuEventEmitter();
  const refreshSession = vi.fn(async () => {
    emitSession(emitter, newToken);

    return true;
  });
  const client = new Socket({
    socketUrl: 'https://ws.example.com',
    inboxServiceInstance: new InboxService(),
    eventEmitterInstance: emitter,
    refreshSession,
  });
  emitSession(emitter, oldToken);

  return { client, refreshSession };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  now = Date.now();
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Socket (socket.io)', () => {
  it('gets a new token and connects again when the server drops a socket whose token expired', async () => {
    const { client, refreshSession } = createClient();
    await client.connect();
    const socket = fakeSocketIo.current!;
    expect(socket.io.opts.query?.token).toBe(oldToken);

    now += 2 * HOUR_MS;
    // A transport drop: socket.io retries with the expired token and the server disconnects it
    socket.managerHandlers.get('reconnect_attempt')?.();
    socket.handlers.get('disconnect')?.('io server disconnect');
    await flush();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.io.opts.query?.token).toBe(newToken);
  });

  it('does not reconnect after a server disconnect when the token was still valid', async () => {
    const { client, refreshSession } = createClient();
    await client.connect();
    const socket = fakeSocketIo.current!;

    socket.handlers.get('disconnect')?.('io server disconnect');
    await flush();

    expect(refreshSession).not.toHaveBeenCalled();
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('sends the newest token with each reconnect attempt', async () => {
    const { client } = createClient();
    await client.connect();
    const socket = fakeSocketIo.current!;

    now += 2 * HOUR_MS;
    socket.managerHandlers.get('reconnect_attempt')?.();
    await flush();
    socket.managerHandlers.get('reconnect_attempt')?.();

    expect(socket.io.opts.query?.token).toBe(newToken);
  });

  it('keeps trying to get a token when the refresh fails after a server disconnect', async () => {
    const { client, refreshSession } = createClient();
    const refreshesThenRecovers = refreshSession.getMockImplementation()!;
    refreshSession.mockImplementationOnce(async () => false);
    await client.connect();
    const socket = fakeSocketIo.current!;

    now += 2 * HOUR_MS;
    socket.handlers.get('disconnect')?.('io server disconnect');
    await flush();
    expect(socket.connect).not.toHaveBeenCalled();

    refreshSession.mockImplementation(refreshesThenRecovers);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.io.opts.query?.token).toBe(newToken);
  });

  it('stops trying after the socket is disconnected', async () => {
    const { client, refreshSession } = createClient();
    refreshSession.mockImplementation(async () => false);
    await client.connect();
    const socket = fakeSocketIo.current!;

    now += 2 * HOUR_MS;
    socket.handlers.get('disconnect')?.('io server disconnect');
    await flush();
    await client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(socket.connect).not.toHaveBeenCalled();
  });
});
