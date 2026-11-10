import { describe, expect, it, vi } from 'vitest';
import { anySignal } from './any-signal.utils';

describe('anySignal', () => {
  it('returns no signal when none is given', () => {
    expect(anySignal([undefined, undefined]).signal).toBeUndefined();
  });

  it('returns the only signal given as is', () => {
    const only = new AbortController().signal;

    expect(anySignal([undefined, only]).signal).toBe(only);
  });

  it('aborts with the reason of the first source that aborts', () => {
    const first = new AbortController();
    const second = new AbortController();
    const { signal } = anySignal([first.signal, second.signal]);

    expect(signal?.aborted).toBe(false);
    second.abort('stopped');
    first.abort('later');

    expect(signal?.aborted).toBe(true);
    expect(signal?.reason).toBe('stopped');
  });

  it('starts aborted when a source already is, without listening to the others', () => {
    const live = new AbortController();
    const addListener = vi.spyOn(live.signal, 'addEventListener');
    const done = new AbortController();
    done.abort('already');

    const { signal } = anySignal([live.signal, done.signal]);

    expect(signal?.aborted).toBe(true);
    expect(signal?.reason).toBe('already');
    expect(addListener).not.toHaveBeenCalled();
  });

  it('detaches from every source once one aborts', () => {
    const first = new AbortController();
    const second = new AbortController();
    const removeFromSecond = vi.spyOn(second.signal, 'removeEventListener');
    anySignal([first.signal, second.signal]);

    first.abort();

    expect(removeFromSecond).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('stops following the sources after dispose, so a long-lived source keeps no listener', () => {
    const longLived = new AbortController();
    const addListener = vi.spyOn(longLived.signal, 'addEventListener');
    const removeListener = vi.spyOn(longLived.signal, 'removeEventListener');

    const { signal, dispose } = anySignal([new AbortController().signal, longLived.signal]);
    dispose();
    longLived.abort();

    expect(signal?.aborted).toBe(false);
    expect(removeListener).toHaveBeenCalledWith('abort', addListener.mock.calls[0][1]);
  });
});
