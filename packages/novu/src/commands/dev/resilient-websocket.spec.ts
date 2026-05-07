import { describe, expect, it } from 'vitest';
import ws from 'ws';

class ResilientWebSocket extends ws {
  constructor(...args: ConstructorParameters<typeof ws>) {
    super(...args);
    this.on('error', () => {});
  }
}

describe('ResilientWebSocket', () => {
  it('should not crash when closed while still CONNECTING', async () => {
    const socket = new ResilientWebSocket('wss://127.0.0.1:1/nonexistent');

    expect(socket.readyState).toBe(ws.CONNECTING);

    socket.close();

    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('plain ws should throw when closed while CONNECTING (baseline)', async () => {
    const socket = new ws('wss://127.0.0.1:1/nonexistent');

    expect(socket.readyState).toBe(ws.CONNECTING);

    const errorPromise = new Promise<Error>((resolve) => {
      socket.on('error', resolve);
    });

    socket.close();

    const error = await errorPromise;
    expect(error.message).toBe('WebSocket was closed before the connection was established');
  });
});
