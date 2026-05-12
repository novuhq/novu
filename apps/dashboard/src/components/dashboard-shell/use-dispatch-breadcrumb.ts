import { createContext, type ReactNode, useContext, useEffect } from 'react';

export type DispatchBreadcrumbLeaf = {
  label: string;
  icon?: ReactNode;
};

export type DispatchBreadcrumbContextValue = {
  leaf: DispatchBreadcrumbLeaf | null;
  setLeaf: (leaf: DispatchBreadcrumbLeaf | null) => void;
};

export const DispatchBreadcrumbContext = createContext<DispatchBreadcrumbContextValue | null>(null);

export function useDispatchBreadcrumbLeaf(): DispatchBreadcrumbLeaf | null {
  return useContext(DispatchBreadcrumbContext)?.leaf ?? null;
}

/**
 * Register the trailing breadcrumb item for the current Dispatch page. Pass `null`
 * to clear the leaf when not on a resource sub-route. The caller is responsible
 * for memoizing the `leaf` reference so the effect only re-runs when it changes.
 */
export function useSetDispatchBreadcrumbLeaf(leaf: DispatchBreadcrumbLeaf | null): void {
  const ctx = useContext(DispatchBreadcrumbContext);

  useEffect(() => {
    if (!ctx) return;

    ctx.setLeaf(leaf);

    return () => {
      ctx.setLeaf(null);
    };
  }, [ctx, leaf]);
}
