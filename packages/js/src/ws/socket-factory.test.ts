import { NovuEventEmitter } from '../event-emitter';
import { PartySocketClient } from './party-socket';
import { Socket } from './socket';
import { createSocket } from './socket-factory';

function createDeps() {
  return {
    inboxServiceInstance: {} as never,
    eventEmitterInstance: new NovuEventEmitter(),
  };
}

describe('createSocket', () => {
  it('uses PartySocket for the worktree wrangler port', () => {
    const socket = createSocket({
      socketUrl: 'ws://127.0.0.1:8887',
      ...createDeps(),
    });

    expect(socket).toBeInstanceOf(PartySocketClient);
  });

  it('uses PartySocket for the default local wrangler port', () => {
    const socket = createSocket({
      socketUrl: 'ws://127.0.0.1:8787',
      ...createDeps(),
    });

    expect(socket).toBeInstanceOf(PartySocketClient);
  });

  it('uses socket.io for the self-hosted default port', () => {
    const socket = createSocket({
      socketUrl: 'http://localhost:3002',
      ...createDeps(),
    });

    expect(socket).toBeInstanceOf(Socket);
  });
});
