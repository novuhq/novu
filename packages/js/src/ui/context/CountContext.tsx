import { createContext, createMemo, onCleanup, ParentProps, useContext } from 'solid-js';
import { NotificationFilter } from '../../types';
import { type CountsStore, createCountsKey, selectNewMessagesCount } from '../core/stores/counts';

const CountContext = createContext<CountsStore | undefined>(undefined);

/**
 * Adapter over the core counts store. Counting only runs while at least one provider is alive, so an instance
 * that mounts no inbox component never fetches counts or opens the websocket for them.
 */
export const CountProvider = (props: ParentProps<{ store: CountsStore }>) => {
  const release = props.store.activate();
  onCleanup(release);

  return <CountContext.Provider value={props.store}>{props.children}</CountContext.Provider>;
};

const useCountsStore = (hook: string) => {
  const context = useContext(CountContext);
  if (!context) {
    throw new Error(`${hook} must be used within a CountProvider`);
  }

  return context;
};

export const useUnreadCount = () => {
  const context = useCountsStore('useUnreadCount');

  return { unreadCount: context.unreadCount };
};

type UseNewMessagesCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;
};

export const useNewMessagesCount = (props: UseNewMessagesCountProps) => {
  const context = useCountsStore('useNewMessagesCount');

  return selectNewMessagesCount(context, () => props.filter);
};

type UseFilteredUnreadCountProps = {
  filter: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>;
};
export const useFilteredUnreadCount = (props: UseFilteredUnreadCountProps) => {
  const context = useCountsStore('useFilteredUnreadCount');

  const count = createMemo(() => context.unreadCounts().get(createCountsKey(props.filter)) || 0);

  return count;
};

type UseUnreadCountsProps = {
  filters: Pick<NotificationFilter, 'tags' | 'data' | 'severity'>[];
};
export const useUnreadCounts = (props: UseUnreadCountsProps) => {
  const context = useCountsStore('useUnreadCounts');

  const counts = createMemo(() =>
    props.filters.map((filter) => {
      return context.unreadCounts().get(createCountsKey(filter)) || 0;
    })
  );

  return counts;
};
