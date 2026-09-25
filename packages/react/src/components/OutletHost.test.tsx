import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { NovuUIProvider } from '../context/NovuUIContext';
import { OutletStore } from '../context/OutletStore';
import { useOutletRenderer } from '../hooks/internal/useOutletRenderer';
import { OutletHost } from './OutletHost';

type Item = { id: string; label: string };

const Counter = ({ label }: { label: string }) => {
  const [count, setCount] = useState(0);

  return (
    <button type="button" onClick={() => setCount((c) => c + 1)}>
      {label}:{count}
    </button>
  );
};

const createOutletElement = (id: string) => {
  const el = document.createElement('div');
  el.dataset.novuOutlet = id;
  document.body.appendChild(el);

  return el;
};

describe('OutletHost', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps component state when the engine pushes new data through update', () => {
    const store = new OutletStore();
    render(<OutletHost store={store} />);
    const el = createOutletElement('a');

    let handle: ReturnType<OutletStore['mount']> | undefined;
    act(() => {
      handle = store.mount(el, (item: Item) => <Counter label={item.label} />, [{ id: '1', label: 'first' }]);
    });

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('first:1');

    act(() => {
      handle?.update?.({ id: '1', label: 'second' });
    });

    expect(screen.getByRole('button').textContent).toBe('second:1');
  });

  it('keeps the state of the other outlets when one in the middle unmounts', () => {
    const store = new OutletStore();
    render(<OutletHost store={store} />);
    const handles: Array<ReturnType<OutletStore['mount']>> = [];
    act(() => {
      for (const id of ['a', 'b', 'c']) {
        handles.push(
          store.mount(createOutletElement(id), (item: Item) => <Counter label={item.label} />, [{ id, label: id }])
        );
      }
    });

    fireEvent.click(screen.getByText('c:0'));
    expect(screen.getByText('c:1')).toBeTruthy();

    act(() => {
      handles[1].unmount();
    });

    expect(screen.queryByText(/^b:/)).toBeNull();
    expect(screen.getByText('c:1')).toBeTruthy();
  });

  it('renders with the latest render prop after a host re-render, without remounting', () => {
    const store = new OutletStore();
    let mountOutlet: ((el: HTMLDivElement, item: Item) => unknown) | undefined;

    const Host = ({ suffix }: { suffix: string }) => {
      const renderer = useOutletRenderer((item: Item) => <Counter label={`${item.label}${suffix}`} />);
      mountOutlet = renderer;

      return null;
    };

    const Tree = ({ suffix }: { suffix: string }) => (
      <NovuUIProvider value={{ novuUI: {} as never, outlets: store, icons: {} }}>
        <OutletHost store={store} />
        <Host suffix={suffix} />
      </NovuUIProvider>
    );

    const { rerender } = render(<Tree suffix="!" />);
    const el = createOutletElement('a') as HTMLDivElement;
    const firstRenderer = mountOutlet;
    act(() => {
      mountOutlet?.(el, { id: '1', label: 'hello' });
    });

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('hello!:1');

    rerender(<Tree suffix="?" />);

    expect(mountOutlet).toBe(firstRenderer);
    expect(screen.getByRole('button').textContent).toBe('hello?:1');
  });
});
