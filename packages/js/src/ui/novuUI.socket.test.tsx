import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Novu } from '../novu';
import { NovuUI } from './novuUI';
import { createFakeNovu, createFakeSocket } from './testing/fakes';

const created: Novu[] = [];

vi.mock('../novu', async () => {
  const fakes = await import('./testing/fakes');

  return {
    Novu: vi.fn(function FakeNovu() {
      const novu = fakes.createFakeNovu({ socket: fakes.createFakeSocket() });
      created.push(novu);

      return novu;
    }),
  };
});

const options = { applicationIdentifier: 'app', subscriberId: 'subscriber' };

describe('NovuUI socket ownership', () => {
  afterEach(() => {
    created.length = 0;
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('disconnects the instance it built when options replace it, and the current one on unmount', () => {
    const novuUI = new NovuUI({ options });
    expect(created).toHaveLength(1);

    novuUI.updateOptions({ ...options, subscriberId: 'other' });
    expect(created).toHaveLength(2);
    expect(created[0].socket.disconnect).toHaveBeenCalledTimes(1);
    expect(created[1].socket.disconnect).not.toHaveBeenCalled();

    novuUI.unmount();
    expect(created[1].socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('leaves a caller-provided instance connected', () => {
    const socket = createFakeSocket();
    const provided = createFakeNovu({ socket });
    const novuUI = new NovuUI({ options, novu: provided });

    novuUI.updateNovu(createFakeNovu());
    novuUI.unmount();

    expect(socket.disconnect).not.toHaveBeenCalled();
  });
});
