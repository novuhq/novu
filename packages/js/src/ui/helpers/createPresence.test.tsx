import { createEffect, createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubRunningExitAnimation } from '../testing/fakes';
import { createPresence } from './createPresence';

/** Effects created inside a root only run once it has finished, so every change happens outside of it. */
const setup = (initiallyPresent: boolean, appear?: boolean) => {
  const [present, setPresent] = createSignal(initiallyPresent);
  const element = document.createElement('div');
  document.body.appendChild(element);
  const { presence, dispose } = createRoot((dispose) => ({
    presence: createPresence({ present, element: () => element, appear }),
    dispose,
  }));

  return { presence, setPresent, element, dispose };
};

describe('createPresence', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('unmounts at once when nothing animates, as in jsdom', () => {
    const { presence, setPresent, dispose } = setup(false);
    expect(presence.isMounted()).toBe(false);

    setPresent(true);
    expect(presence.isMounted()).toBe(true);
    expect(presence.state()).toBe('open');

    setPresent(false);
    expect(presence.state()).toBe('closed');
    expect(presence.isMounted()).toBe(false);
    dispose();
  });

  it('mounts when `present` turns true before its effects first run', () => {
    const [present, setPresent] = createSignal(false);
    const { presence, dispose } = createRoot((dispose) => {
      const presence = createPresence({ present, element: () => undefined });
      // A parent that sets the initial value in an effect, such as tabs that pick up their `value`.
      createEffect(() => setPresent(true));

      return { presence, dispose };
    });

    expect(presence.isMounted()).toBe(true);
    dispose();
  });

  it('stays mounted until the exit animation ends', async () => {
    const { presence, setPresent, element, dispose } = setup(true);
    const exit = stubRunningExitAnimation(element);

    setPresent(false);
    expect(presence.state()).toBe('closed');
    expect(presence.isMounted()).toBe(true);

    exit.finish();
    await vi.waitFor(() => expect(presence.isMounted()).toBe(false));
    dispose();
  });

  it('keeps the element when it reopens during the exit', async () => {
    const { presence, setPresent, element, dispose } = setup(true);
    const exit = stubRunningExitAnimation(element);

    setPresent(false);
    setPresent(true);
    // Reopening cancels the exit animation in a browser; its settled promise must not unmount the element.
    exit.cancel();
    await Promise.resolve();
    await Promise.resolve();

    expect(presence.isMounted()).toBe(true);
    expect(presence.state()).toBe('open');
    dispose();
  });

  it('with appear off, renders no state for an element present from the start', () => {
    const { presence, setPresent, dispose } = setup(true, false);
    expect(presence.isMounted()).toBe(true);
    expect(presence.state()).toBeUndefined();

    setPresent(false);
    expect(presence.state()).toBe('closed');

    setPresent(true);
    expect(presence.state()).toBe('open');
    dispose();
  });
});
