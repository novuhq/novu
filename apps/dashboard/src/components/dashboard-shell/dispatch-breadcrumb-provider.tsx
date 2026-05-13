import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { DispatchBreadcrumbContext, type DispatchBreadcrumbLeaf } from './use-dispatch-breadcrumb';

type DispatchBreadcrumbProviderProps = {
  children: ReactNode;
};

export function DispatchBreadcrumbProvider({ children }: DispatchBreadcrumbProviderProps) {
  const [leaf, setLeafState] = useState<DispatchBreadcrumbLeaf | null>(null);

  const setLeaf = useCallback((next: DispatchBreadcrumbLeaf | null) => {
    setLeafState(next);
  }, []);

  const value = useMemo(() => ({ leaf, setLeaf }), [leaf, setLeaf]);

  return <DispatchBreadcrumbContext.Provider value={value}>{children}</DispatchBreadcrumbContext.Provider>;
}
