import type { BellRenderer } from '@novu/js/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NovuUIProvider } from '../context/NovuUIContext';
import { useOutletRenderer } from '../hooks/internal/useOutletRenderer';
import { Bell } from './Bell';

type BellMountParams = { element: HTMLElement; props?: { renderBell?: BellRenderer } };

const unreadCount: Parameters<BellRenderer>[1] = { total: 1, severity: {} };

/** Mounts the bell the way the engine does: an outlet inside the mount point, rendered through the host's renderer. */
const createFakeEngine = () => {
  const mountComponent = vi.fn(({ element, props }: BellMountParams) => {
    const outlet = document.createElement('div');
    outlet.dataset.novuOutlet = 'bell';
    element.appendChild(outlet);
    const cleanup = props?.renderBell?.(outlet, unreadCount);

    return {
      update: vi.fn(),
      unmount: () => (typeof cleanup === 'function' ? cleanup() : cleanup?.unmount()),
    };
  });

  return { mountComponent, novuUI: { mountComponent } as never };
};

describe('OutletScope', () => {
  afterEach(cleanup);

  it('lets React events from custom bell content reach the handlers of the host element around Bell', () => {
    const engine = createFakeEngine();
    const onClick = vi.fn();

    render(
      <NovuUIProvider value={{ novuUI: engine.novuUI, icons: {} }}>
        <button type="button" onClick={onClick}>
          <Bell renderBell={(count) => <span>bell {count.total}</span>} />
        </button>
      </NovuUIProvider>
    );

    const content = screen.getByText('bell 1');
    expect(content.closest('button')).not.toBeNull();

    fireEvent.click(content);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('refuses to adapt a render prop outside a scope, so no portal can lose its owner', () => {
    const engine = createFakeEngine();
    const Unscoped = () => {
      useOutletRenderer(() => <span>orphan</span>);

      return null;
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() =>
      render(
        <NovuUIProvider value={{ novuUI: engine.novuUI, icons: {} }}>
          <Unscoped />
        </NovuUIProvider>
      )
    ).toThrow(/OutletScope/);

    consoleError.mockRestore();
  });
});
