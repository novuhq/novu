import { createContext } from 'react';

export type PageHeaderContextValue = {
  container: HTMLElement | null;
  setContainer: (node: HTMLElement | null) => void;
};

export const PageHeaderContext = createContext<PageHeaderContextValue>({} as PageHeaderContextValue);
PageHeaderContext.displayName = 'PageHeaderContext';

export const PersistentLayoutContext = createContext(false);
PersistentLayoutContext.displayName = 'PersistentLayoutContext';
