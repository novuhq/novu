import { createContext, type ReactNode, useContext, useEffect } from 'react';

export type ConnectBreadcrumbLeaf = {
  label: string;
  icon?: ReactNode;
};

export type ConnectBreadcrumbContextValue = {
  leaf: ConnectBreadcrumbLeaf | null;
  setLeaf: (leaf: ConnectBreadcrumbLeaf | null) => void;
};

export const ConnectBreadcrumbContext = createContext<ConnectBreadcrumbContextValue | null>(null);

export function useConnectBreadcrumbLeaf(): ConnectBreadcrumbLeaf | null {
  return useContext(ConnectBreadcrumbContext)?.leaf ?? null;
}

/**
 * Register the trailing breadcrumb item for the current Connect page. Pass `null`
 * to clear the leaf when not on a resource sub-route. The caller is responsible
 * for memoizing the `leaf` reference so the effect only re-runs when it changes.
 */
export function useSetConnectBreadcrumbLeaf(leaf: ConnectBreadcrumbLeaf | null): void {
  const ctx = useContext(ConnectBreadcrumbContext);

  useEffect(() => {
    if (!ctx) return;

    ctx.setLeaf(leaf);

    return () => {
      ctx.setLeaf(null);
    };
  }, [ctx, leaf]);
}
