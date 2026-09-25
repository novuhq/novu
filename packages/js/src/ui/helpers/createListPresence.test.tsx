import { batch, createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MotionMode } from '../core/motion/mode';
import { installAnimateSpy } from '../testing/fakes';
import {
  createListPresence,
  EXIT_STAGGER_MS,
  type ListPresenceOptions,
  mergeListKeys,
  planListChange,
} from './createListPresence';

describe('mergeListKeys', () => {
  it.each([
    ['a removal in the middle stays in place', ['a', 'b', 'c'], ['a', 'c'], ['a', 'b', 'c']],
    ['a removal at the top stays above a prepended key', ['a', 'b'], ['x', 'b'], ['x', 'a', 'b']],
    ['a removal at the end stays above an appended page', ['a', 'b'], ['a', 'c', 'd'], ['a', 'b', 'c', 'd']],
    ['consecutive removals keep their order', ['a', 'b', 'c', 'd'], ['a', 'd'], ['a', 'b', 'c', 'd']],
    ['removing everything keeps everything', ['a', 'b'], [], ['a', 'b']],
    ['a reorder follows the new order', ['a', 'b', 'c'], ['c', 'a'], ['b', 'c', 'a']],
  ])('%s', (_, rendered, next, merged) => {
    expect(mergeListKeys(rendered, next)).toEqual(merged);
  });
});

describe('planListChange', () => {
  const plan = (
    rendered: string[],
    next: string[],
    overrides: Partial<{
      leaving: ReadonlySet<string>;
      ready: boolean;
      wasReady: boolean;
      motion: MotionMode;
      canSwap: boolean;
      swapping: boolean;
    }> = {}
  ) =>
    planListChange<string>({
      rendered,
      next,
      leaving: new Set(),
      ready: true,
      wasReady: true,
      motion: 'full',
      ...overrides,
    });

  it('settles without motion while loading, on the first data and with motion off', () => {
    expect(plan(['a'], [], { ready: false })).toMatchObject({ kind: 'reset', rendered: [], leaving: new Set() });
    expect(plan([], ['a', 'b'], { wasReady: false })).toMatchObject({ kind: 'load', rendered: ['a', 'b'] });
    expect(plan(['a', 'b'], ['b'], { motion: 'off' })).toMatchObject({ kind: 'update', rendered: ['b'] });
  });

  it('keeps removed keys rendered as leaving', () => {
    expect(plan(['a', 'b', 'c'], ['a', 'c'])).toMatchObject({
      kind: 'update',
      rendered: ['a', 'b', 'c'],
      leaving: new Set(['b']),
      entering: [],
    });
  });

  it('keeps every removed key leaving, however many go at once', () => {
    const rendered = Array.from({ length: 12 }, (_, index) => `n${index}`);

    expect(plan(rendered, rendered.slice(0, 1))).toMatchObject({
      kind: 'update',
      rendered,
      leaving: new Set(rendered.slice(1)),
    });
  });

  it('animates in only a few keys inserted at the top', () => {
    expect(plan(['a', 'b'], ['x', 'a', 'b']).entering).toEqual(['x']);
    expect(plan([], ['x']).entering).toEqual(['x']);
    expect(plan(['a', 'b'], ['w', 'x', 'y', 'z', 'a', 'b']).entering).toEqual([]);
    // A new page lands after the kept keys.
    expect(plan(['a', 'b'], ['a', 'b', 'c']).entering).toEqual([]);
  });

  it('replaces the list when nothing is kept', () => {
    expect(plan(['a', 'b'], ['c', 'd']).kind).toBe('replace');
    expect(plan([], ['a', 'b', 'c', 'd']).kind).toBe('replace');
  });

  it('holds the shown items while the list fades out to load other content', () => {
    expect(plan(['a', 'b'], [], { ready: false, canSwap: true })).toMatchObject({
      kind: 'swap',
      rendered: ['a', 'b'],
      leaving: new Set(['a', 'b']),
    });
    // Until the fade ends, whatever arrives meanwhile.
    expect(plan(['a', 'b'], ['c'], { swapping: true })).toMatchObject({ kind: 'swap', rendered: ['a', 'b'] });

    expect(plan(['a', 'b'], [], { ready: false }).kind).toBe('reset');
    expect(plan(['a', 'b'], [], { ready: false, canSwap: true, motion: 'off' }).kind).toBe('reset');
    expect(plan([], [], { ready: false, canSwap: true }).kind).toBe('reset');
    // Only items that are already leaving: nothing to fade.
    expect(plan(['a'], [], { ready: false, canSwap: true, leaving: new Set(['a']) }).kind).toBe('reset');
    // Still loading from before: the placeholder shows.
    expect(plan(['a'], [], { ready: false, canSwap: true, wasReady: false }).kind).toBe('reset');
  });
});

describe('createListPresence', () => {
  let animations: ReturnType<typeof installAnimateSpy>;

  afterEach(() => {
    animations?.restore();
    document.body.innerHTML = '';
  });

  const setup = (initialKeys: string[], overrides: Partial<ListPresenceOptions<string>> = {}) => {
    animations = installAnimateSpy();
    const [keys, setKeys] = createSignal<readonly string[]>(initialKeys);
    const [ready, setReady] = createSignal(true);
    const [motion, setMotion] = createSignal<MotionMode>('full');
    const options = {
      keys,
      ready,
      motion,
      isOnScreen: () => true,
      exit: (item: HTMLElement) => item.animate([{ opacity: 1 }, { opacity: 0 }], 120),
      enter: vi.fn(),
      onLeave: vi.fn(),
      onRestore: vi.fn(),
      enterList: vi.fn(),
      ...overrides,
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const dispose = render(() => {
      const presence = createListPresence<string>(options);

      return (
        <For each={presence.rendered()}>{(key) => <div data-key={key} ref={(el) => presence.register(key, el)} />}</For>
      );
    }, container);
    const renderedKeys = () => [...container.children].map((child) => (child as HTMLElement).dataset.key);
    const item = (key: string) => container.querySelector<HTMLElement>(`[data-key="${key}"]`);

    return { options, setKeys, setReady, setMotion, renderedKeys, item, dispose };
  };

  it('keeps a removed item, inert, until its exit ends', async () => {
    const { options, setKeys, renderedKeys, item, dispose } = setup(['a', 'b', 'c']);

    setKeys(['a', 'c']);
    expect(renderedKeys()).toEqual(['a', 'b', 'c']);
    expect(item('b')?.hasAttribute('inert')).toBe(true);
    expect(options.onLeave).toHaveBeenCalledWith('b', item('b'));

    animations.calls[0].animation.finish();
    await vi.waitFor(() => expect(renderedKeys()).toEqual(['a', 'c']));
    dispose();
  });

  it('lets two items leave independently', async () => {
    const { setKeys, renderedKeys, dispose } = setup(['a', 'b', 'c']);

    setKeys(['a', 'c']);
    setKeys(['c']);
    expect(renderedKeys()).toEqual(['a', 'b', 'c']);
    expect(animations.calls).toHaveLength(2);

    animations.calls[1].animation.finish();
    await vi.waitFor(() => expect(renderedKeys()).toEqual(['b', 'c']));

    animations.calls[0].animation.finish();
    await vi.waitFor(() => expect(renderedKeys()).toEqual(['c']));
    dispose();
  });

  it('restores an item whose key comes back during its exit', async () => {
    const { options, setKeys, renderedKeys, item, dispose } = setup(['a', 'b']);

    setKeys(['a']);
    setKeys(['a', 'b']);
    await Promise.resolve();
    await Promise.resolve();

    expect(renderedKeys()).toEqual(['a', 'b']);
    expect(item('b')?.hasAttribute('inert')).toBe(false);
    expect(options.onRestore).toHaveBeenCalledWith('b', item('b'));
    dispose();
  });

  it('removes items at once while loading, off screen and with motion off', () => {
    const offScreen = setup(['a', 'b'], { isOnScreen: () => false });
    offScreen.setKeys(['a']);
    expect(offScreen.renderedKeys()).toEqual(['a']);
    offScreen.dispose();
    animations.restore();

    const loading = setup(['a', 'b']);
    loading.setReady(false);
    loading.setKeys([]);
    expect(loading.renderedKeys()).toEqual([]);
    loading.dispose();
    animations.restore();

    const off = setup(['a', 'b']);
    off.setMotion('off');
    off.setKeys(['a']);
    expect(off.renderedKeys()).toEqual(['a']);
    expect(animations.calls).toHaveLength(0);
    off.dispose();
  });

  it('animates in live inserts at the top and fades the list for a fresh load', () => {
    const { options, setKeys, setReady, item, dispose } = setup(['a']);

    setKeys(['x', 'a']);
    expect(options.enter).toHaveBeenCalledWith(item('x'), 'full');

    setKeys(['x', 'a', 'b']);
    expect(options.enter).toHaveBeenCalledTimes(1);

    // A refetch: the list empties and loads, then the response lands together with the end of loading.
    batch(() => {
      setReady(false);
      setKeys([]);
    });
    batch(() => {
      setReady(true);
      setKeys(['c', 'd']);
    });
    expect(options.enterList).toHaveBeenLastCalledWith('load');
    expect(options.enter).toHaveBeenCalledTimes(1);
    dispose();
  });

  it('lets items that leave together go one after another, from the top', () => {
    const keys = Array.from({ length: 8 }, (_, index) => `n${index}`);
    const exit = vi.fn((item: HTMLElement, _motion: MotionMode, delay: number) =>
      item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, delay })
    );
    const { setKeys, renderedKeys, dispose } = setup(keys, {
      exit,
      // The last one is scrolled out of view: it goes at once and takes no turn.
      isOnScreen: (item) => item.dataset.key !== 'n7',
    });

    // Archive read: every other item goes.
    setKeys(keys.filter((_, index) => index % 2 === 0));
    expect(exit.mock.calls.map(([item, , delay]) => [item.dataset.key, delay])).toEqual([
      ['n1', 0],
      ['n3', EXIT_STAGGER_MS],
      ['n5', 2 * EXIT_STAGGER_MS],
    ]);
    expect(renderedKeys()).toEqual(keys.slice(0, 7));
    dispose();
  });

  it('fades the empty state in once the last item has left', async () => {
    const { options, setKeys, renderedKeys, dispose } = setup(['a']);
    options.enterList.mockClear();

    setKeys([]);
    expect(options.enterList).not.toHaveBeenCalled();

    animations.calls[0].animation.finish();
    await vi.waitFor(() => expect(renderedKeys()).toEqual([]));
    expect(options.enterList).toHaveBeenCalledWith('update');
    dispose();
  });

  it('fades the items out together, inert, before the list shows other content', async () => {
    const list = document.createElement('div');
    const { options, setKeys, setReady, renderedKeys, item, dispose } = setup(['a', 'b'], {
      exitList: () => list.animate([{ opacity: 1 }, { opacity: 0 }], 120),
    });
    const kept = item('b');
    // Mounting with data was a load of its own.
    options.enterList.mockClear();

    // A filter change: the list empties and loads again.
    batch(() => {
      setReady(false);
      setKeys([]);
    });
    expect(renderedKeys()).toEqual(['a', 'b']);
    expect(item('a')?.hasAttribute('inert')).toBe(true);
    expect(options.onLeave).toHaveBeenCalledTimes(2);
    expect(animations.calls.map((call) => call.element)).toEqual([list]);

    // The new content lands before the fade ends, and waits for it.
    batch(() => {
      setReady(true);
      setKeys(['b', 'c']);
    });
    expect(renderedKeys()).toEqual(['a', 'b']);
    expect(options.enterList).not.toHaveBeenCalled();

    animations.calls[0].animation.finish();
    await vi.waitFor(() => expect(renderedKeys()).toEqual(['b', 'c']));
    // An item the new content has too keeps its element, live again.
    expect(item('b')).toBe(kept);
    expect(kept?.hasAttribute('inert')).toBe(false);
    expect(options.onRestore).toHaveBeenCalledWith('b', kept);
    expect(options.enterList).toHaveBeenCalledWith('load');
    dispose();
  });

  it('shows the placeholder at once when the list cannot fade out', () => {
    const { options, setKeys, setReady, renderedKeys, dispose } = setup(['a'], { exitList: () => undefined });

    batch(() => {
      setReady(false);
      setKeys([]);
    });
    expect(renderedKeys()).toEqual([]);
    // The placeholder fades in instead.
    expect(options.enterList).toHaveBeenCalledWith('reset');
    dispose();
  });
});
