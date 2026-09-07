import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OutletCleanup } from '../types';
import { ExternalElementRenderer } from './ExternalElementRenderer';

type Item = { id: string; isRead: boolean };

const mountOutlet = (
  renderer: (el: HTMLDivElement, item: Item) => OutletCleanup<[Item]>,
  initial: Item = { id: '1', isRead: false }
) => {
  const [item, setItem] = createSignal<Item>(initial);
  const [renderFn, setRenderFn] = createSignal(renderer);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const dispose = render(() => <ExternalElementRenderer render={renderFn()} args={[item()]} />, container);

  return { container, setItem, setRenderFn, dispose };
};

describe('ExternalElementRenderer (outlet)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts a handle renderer once and pushes later data through update', () => {
    const mount = vi.fn();
    const update = vi.fn();
    const unmount = vi.fn();
    const { setItem, dispose } = mountOutlet((el, item) => {
      mount(el, item);

      return { update, unmount };
    });

    expect(mount).toHaveBeenCalledTimes(1);
    expect(mount.mock.calls[0][1]).toEqual({ id: '1', isRead: false });

    setItem({ id: '1', isRead: true });

    expect(mount).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ id: '1', isRead: true });
    expect(unmount).not.toHaveBeenCalled();

    dispose();

    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('keeps remounting on every change for a renderer that returns a bare cleanup function', () => {
    const mount = vi.fn();
    const cleanup = vi.fn();
    const { setItem, dispose } = mountOutlet((_el, item) => {
      mount(item);

      return cleanup;
    });

    setItem({ id: '1', isRead: true });

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(mount).toHaveBeenLastCalledWith({ id: '1', isRead: true });

    dispose();

    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it('unmounts and mounts again when the renderer itself changes, even with a handle', () => {
    const firstUnmount = vi.fn();
    const secondMount = vi.fn();
    const { setRenderFn, setItem } = mountOutlet(() => ({ update: vi.fn(), unmount: firstUnmount }));

    setRenderFn(() => (_el: HTMLDivElement, item: Item) => {
      secondMount(item);

      return { unmount: vi.fn() };
    });

    expect(firstUnmount).toHaveBeenCalledTimes(1);
    expect(secondMount).toHaveBeenCalledTimes(1);

    // the second renderer has no update, so a data change remounts it
    setItem({ id: '1', isRead: true });
    expect(secondMount).toHaveBeenCalledTimes(2);
  });

  it('hands the host a node with a stable outlet id that does not create a box', () => {
    let mountedEl: HTMLDivElement | undefined;
    const { container, setItem } = mountOutlet((el) => {
      mountedEl = el;

      return { update: vi.fn(), unmount: vi.fn() };
    });

    const outlet = container.querySelector('[data-novu-outlet]') as HTMLDivElement;
    expect(outlet).toBe(mountedEl);
    expect(outlet.style.display).toBe('contents');

    const id = outlet.dataset.novuOutlet;
    setItem({ id: '1', isRead: true });
    expect(outlet.dataset.novuOutlet).toBe(id);
  });
});
