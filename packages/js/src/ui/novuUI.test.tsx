import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Novu } from '../novu';
import { NovuUI } from './novuUI';

const createFakeNovu = () =>
  ({
    applicationIdentifier: 'app',
    subscriberId: 'subscriber',
    contextKey: undefined,
    on: vi.fn(() => () => {}),
    notifications: {
      count: vi.fn(async () => ({ data: { counts: [] } })),
      cache: { has: () => false, getAll: () => undefined, update: () => {} },
    },
  }) as unknown as Novu;

const createEngine = () =>
  new NovuUI({ options: { applicationIdentifier: 'app', subscriberId: 'subscriber' }, novu: createFakeNovu() });

const createMountPoint = () => {
  const element = document.createElement('div');
  document.body.appendChild(element);

  return element;
};

describe('NovuUI.mountComponent (mount point)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('returns a handle that updates props in place and unmounts the component', () => {
    const novuUI = createEngine();
    const mountPoint = createMountPoint();
    const customBellUnmount = vi.fn();
    const renderBell = vi.fn((el: HTMLDivElement) => {
      el.textContent = 'custom bell';

      return { update: vi.fn(), unmount: customBellUnmount };
    });

    const handle = novuUI.mountComponent({ name: 'Bell', element: mountPoint, props: { renderBell } });

    expect(mountPoint.querySelector(`#novu-root-${novuUI.id}`)).not.toBeNull();
    expect(mountPoint.textContent).toContain('custom bell');
    expect(renderBell).toHaveBeenCalledTimes(1);

    handle.update({ renderBell: undefined });

    expect(customBellUnmount).toHaveBeenCalledTimes(1);
    expect(mountPoint.textContent).not.toContain('custom bell');
    expect(mountPoint.querySelector('.nv-bellContainer')).not.toBeNull();

    handle.unmount();

    expect(mountPoint.childElementCount).toBe(0);

    novuUI.unmount();
  });

  it('mounts islands bare: no Root wrapper, an island marker, and no layout box', () => {
    const novuUI = createEngine();
    const mountPoint = createMountPoint();

    novuUI.mountComponent({ name: 'Bell', element: mountPoint, bare: true });

    expect(mountPoint.querySelector(`#novu-root-${novuUI.id}`)).toBeNull();
    expect(mountPoint.querySelector('.nv-bellContainer')).not.toBeNull();
    expect(mountPoint.hasAttribute('data-novu-island')).toBe(true);
    expect(mountPoint.style.display).toBe('contents');
    expect((mountPoint.firstElementChild as HTMLElement).style.display).toBe('contents');

    novuUI.unmount();
  });
});
