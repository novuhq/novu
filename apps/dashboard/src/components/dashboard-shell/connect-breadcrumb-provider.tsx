import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ConnectBreadcrumbContext, type ConnectBreadcrumbLeaf } from './use-connect-breadcrumb';

type ConnectBreadcrumbProviderProps = {
  children: ReactNode;
};

export function ConnectBreadcrumbProvider({ children }: ConnectBreadcrumbProviderProps) {
  const [leaf, setLeafState] = useState<ConnectBreadcrumbLeaf | null>(null);

  const setLeaf = useCallback((next: ConnectBreadcrumbLeaf | null) => {
    setLeafState(next);
  }, []);

  const value = useMemo(() => ({ leaf, setLeaf }), [leaf, setLeaf]);

  return <ConnectBreadcrumbContext.Provider value={value}>{children}</ConnectBreadcrumbContext.Provider>;
}
