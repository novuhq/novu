import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NovuUIProvider } from '../context/NovuUIContext';
import { OutletStore } from '../context/OutletStore';
import { Mounter, type MounterProps } from './Mounter';

type MountCall = { name: string; element: HTMLElement; props: unknown; bare?: boolean };

const createFakeEngine = () => {
  const handle = { update: vi.fn(), unmount: vi.fn() };
  const mountComponent = vi.fn((_params: MountCall) => handle);

  return { handle, mountComponent, novuUI: { mountComponent } as never };
};

const renderMounter = (engine: ReturnType<typeof createFakeEngine>, props: MounterProps) =>
  render(
    <NovuUIProvider value={{ novuUI: engine.novuUI, outlets: new OutletStore(), icons: {} }}>
      <Mounter {...props} />
    </NovuUIProvider>
  );

describe('Mounter', () => {
  it('mounts once, pushes prop changes through the handle, and unmounts on removal', () => {
    const engine = createFakeEngine();
    const first = { renderBell: undefined };
    const second = { renderBell: () => ({ unmount: () => {} }) };

    const view = renderMounter(engine, { name: 'Bell', props: first });

    expect(engine.mountComponent).toHaveBeenCalledTimes(1);
    const mountArgs = engine.mountComponent.mock.calls[0][0];
    expect(mountArgs.name).toBe('Bell');
    expect(mountArgs.props).toBe(first);
    expect(mountArgs.element.isConnected).toBe(true);

    view.rerender(
      <NovuUIProvider value={{ novuUI: engine.novuUI, outlets: new OutletStore(), icons: {} }}>
        <Mounter name="Bell" props={second} />
      </NovuUIProvider>
    );

    expect(engine.mountComponent).toHaveBeenCalledTimes(1);
    expect(engine.handle.update).toHaveBeenLastCalledWith(second);

    view.unmount();

    expect(engine.handle.unmount).toHaveBeenCalledTimes(1);
  });

  it('mounts islands bare and without a layout box', () => {
    const engine = createFakeEngine();
    const { container } = renderMounter(engine, { name: 'Bell', bare: true });

    const mountArgs = engine.mountComponent.mock.calls[0][0];
    expect(mountArgs.bare).toBe(true);
    expect((container.firstElementChild as HTMLElement).style.display).toBe('contents');
  });
});
