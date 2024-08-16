import { Accessor, createContext, createEffect, createSignal, ParentProps, useContext } from 'solid-js';
import { NotificationFilter } from '../../types';
import { NotificationStatus, Tab } from '../types';

type InboxContextType = {
  setStatus: (status: NotificationStatus) => void;
  status: Accessor<NotificationStatus>;
  filter: Accessor<NotificationFilter>;
  tabs: Accessor<Array<Tab>>;
  activeTab: Accessor<string>;
  setActiveTab: (tab: string) => void;
};

const InboxContext = createContext<InboxContextType | undefined>(undefined);

const STATUS_TO_FILTER: Record<NotificationStatus, NotificationFilter> = {
  [NotificationStatus.UNREAD_READ]: { archived: false },
  [NotificationStatus.UNREAD]: { read: false },
  [NotificationStatus.ARCHIVED]: { archived: true },
};

type InboxProviderProps = ParentProps<{
  tabs: Array<Tab>;
}>;

export const InboxProvider = (props: InboxProviderProps) => {
  const [tabs, setTabs] = createSignal<Array<Tab>>(props.tabs);
  const [activeTab, setActiveTab] = createSignal<string>((props.tabs[0] && props.tabs[0].label) ?? '');
  const [status, setStatus] = createSignal<NotificationStatus>(NotificationStatus.UNREAD_READ);
  const [filter, setFilter] = createSignal<NotificationFilter>({
    ...STATUS_TO_FILTER[NotificationStatus.UNREAD_READ],
    tags: props.tabs.length > 0 ? props.tabs[0].value : [],
  });

  const setNewStatus = (newStatus: NotificationStatus) => {
    setStatus(newStatus);
    setFilter((old) => ({ ...STATUS_TO_FILTER[newStatus], tags: old.tags }));
  };

  const setNewActiveTab = (newActiveTab: string) => {
    const tags = tabs().find((tab) => tab.label === newActiveTab)?.value;
    if (!tags) {
      return;
    }

    setActiveTab(newActiveTab);
    setFilter((old) => ({ ...old, tags }));
  };

  createEffect(() => {
    setTabs(props.tabs);
    const firstTab = props.tabs[0];
    setActiveTab(firstTab?.label ?? '');
    setFilter((old) => ({ ...old, tags: firstTab?.value ?? [] }));
  });

  return (
    <InboxContext.Provider
      value={{
        status,
        setStatus: setNewStatus,
        filter,
        tabs,
        activeTab,
        setActiveTab: setNewActiveTab,
      }}
    >
      {props.children}
    </InboxContext.Provider>
  );
};

export const useInboxContext = () => {
  const context = useContext(InboxContext);

  if (!context) {
    throw new Error('useInboxContext must be used within a InboxProvider');
  }

  return context;
};
