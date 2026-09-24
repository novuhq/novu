import { batch, createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MotionMode } from '../core/motion/mode';
import { installAnimateSpy } from '../testing/fakes';
import {
  BULK_REMOVAL_THRESHOLD,
  createListPresence,
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
    overrides: Partial<{ leaving: ReadonlySet<string>; ready: boolean; wasReady: boolean; motion: MotionMode }> = {}
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

  it('treats more removals than the threshold as a bulk change', () => {
    const rendered = Array.from({ length: BULK_REMOVAL_THRESHOLD + 2 }, (_, index) => `n${index}`);

    expect(plan(rendered, rendered.slice(0, 1))).toMatchObject({ kind: 'bulk', rendered: ['n0'] });
    // Keys that already leave don't count again.
    expect(plan(rendered, rendered.slice(0, 1), { leaving: new Set(rendered.slice(1, 3)) }).kind).not.toBe('bulk');
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
      onSettle: vi.fn(),
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

  it('removes items at once while loading, in bulk, off screen and with motion off', () => {
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

    const keys = Array.from({ length: BULK_REMOVAL_THRESHOLD + 1 }, (_, index) => `n${index}`);
    const bulk = setup(keys);
    bulk.setKeys([]);
    expect(bulk.renderedKeys()).toEqual([]);
    bulk.dispose();
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
    expect(options.onSettle).toHaveBeenLastCalledWith('load');
    expect(options.enter).toHaveBeenCalledTimes(1);
    dispose();
  });
});
