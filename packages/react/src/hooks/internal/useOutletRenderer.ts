import type { OutletHandle } from '@novu/js/ui';
import { type ReactNode, useMemo, useRef } from 'react';
import { useOutlets } from '../../context/NovuUIContext';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

export type OutletRenderer<TArgs extends unknown[]> = (el: HTMLDivElement, ...args: TArgs) => OutletHandle<TArgs>;

/**
 * Turns a React render prop into the renderer the engine expects.
 *
 * The engine only ever sees one function per outlet kind, so a new inline arrow on the host side never remounts
 * anything: the latest render prop is kept in a ref and called during the outlet's own render. A change of the
 * render prop invalidates the outlet store after commit, so outlets that rendered earlier in the same pass catch up.
 */
export function useOutletRenderer<TArgs extends unknown[]>(
  renderProp: ((...args: TArgs) => ReactNode) | undefined
): OutletRenderer<TArgs> | undefined {
  const outlets = useOutlets();
  const latest = useRef(renderProp);
  latest.current = renderProp;
  const hasRenderer = !!renderProp;

  useIsomorphicLayoutEffect(() => {
    if (hasRenderer) {
      outlets.invalidate();
    }
  }, [outlets, hasRenderer, renderProp]);

  return useMemo(() => {
    if (!hasRenderer) {
      return undefined;
    }

    return (el: HTMLDivElement, ...args: TArgs) =>
      outlets.mount<TArgs>(el, (...renderArgs: TArgs) => latest.current?.(...renderArgs), args);
  }, [outlets, hasRenderer]);
}
