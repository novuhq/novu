import { createContext, ParentProps, useContext } from 'solid-js';
import { DEFAULT_LIMIT, type InboxStore } from '../core/stores/inbox';

export { DEFAULT_LIMIT };

const InboxContext = createContext<InboxStore | undefined>(undefined);

/** Adapter over the core inbox store; keeps the accessor API the components read. */
export const InboxProvider = (props: ParentProps<{ store: InboxStore }>) => {
  return <InboxContext.Provider value={props.store}>{props.children}</InboxContext.Provider>;
};

export const useInboxContext = () => {
  const context = useContext(InboxContext);

  if (!context) {
    throw new Error('useInboxContext must be used within a InboxProvider');
  }

  return context;
};
