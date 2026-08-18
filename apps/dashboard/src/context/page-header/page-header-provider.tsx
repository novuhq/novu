import { ReactNode, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePageHeader } from './hooks';
import { PageHeaderContext } from './page-header-context';

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ container, setContainer }), [container]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function PageHeaderSlot() {
  const { setContainer } = usePageHeader();

  return <div ref={setContainer} className="flex min-w-0 items-center" />;
}

export function PageHeader({ children }: { children: ReactNode }) {
  const { container } = usePageHeader();

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}
