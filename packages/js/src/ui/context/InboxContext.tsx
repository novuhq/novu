import { Accessor, createContext, createEffect, createSignal, ParentProps, Setter, useContext } from 'solid-js';
import { NotificationFilter, Redirect } from '../../types';
import { DEFAULT_REFERRER, DEFAULT_TARGET, getTagsFromTab } from '../helpers';
import { useNovuEvent } from '../helpers/useNovuEvent';
import { NotificationStatus, PreferencesFilter, RouterPush, Tab } from '../types';

type InboxContextType = {
  setStatus: (status: NotificationStatus) => void;
  status: Accessor<NotificationStatus>;
  filter: Accessor<NotificationFilter>;
  limit: Accessor<number>;
  setLimit: (tab: number) => void;
  tabs: Accessor<Array<Tab>>;
  preferencesFilter: Accessor<PreferencesFilter | undefined>;
  activeTab: Accessor<string>;
  setActiveTab: (tab: string) => void;
  isOpened: Accessor<boolean>;
  setIsOpened: Setter<boolean>;
  navigate: (url?: string, target?: Redirect['target']) => void;
  hideBranding: Accessor<boolean>;
};

const InboxContext = createContext<InboxContextType | undefined>(undefined);

const STATUS_TO_FILTER: Record<NotificationStatus, NotificationFilter> = {
  [NotificationStatus.UNREAD_READ]: { archived: false },
  [NotificationStatus.UNREAD]: { read: false },
  [NotificationStatus.ARCHIVED]: { archived: true },
};

export const DEFAULT_LIMIT = 10;

type InboxProviderProps = ParentProps<{
  tabs: Array<Tab>;
  preferencesFilter?: PreferencesFilter;
  routerPush?: RouterPush;
}>;

export const InboxProvider = (props: InboxProviderProps) => {
  const [isOpened, setIsOpened] = createSignal<boolean>(false);
  const [tabs, setTabs] = createSignal<Array<Tab>>(props.tabs);
  const [activeTab, setActiveTab] = createSignal<string>((props.tabs[0] && props.tabs[0].label) ?? '');
  const [status, setStatus] = createSignal<NotificationStatus>(NotificationStatus.UNREAD_READ);
  const [limit, setLimit] = createSignal<number>(DEFAULT_LIMIT);
  const [filter, setFilter] = createSignal<NotificationFilter>({
    ...STATUS_TO_FILTER[NotificationStatus.UNREAD_READ],
    tags: props.tabs.length > 0 ? getTagsFromTab(props.tabs[0]) : [],
  });
  const [hideBranding, setHideBranding] = createSignal(false);
  const [preferencesFilter, setPreferencesFilter] = createSignal<PreferencesFilter | undefined>(
    props.preferencesFilter
  );

  const setNewStatus = (newStatus: NotificationStatus) => {
    setStatus(newStatus);
    setFilter((old) => ({ ...STATUS_TO_FILTER[newStatus], tags: old.tags }));
  };

  const setNewActiveTab = (newActiveTab: string) => {
    const tab = tabs().find((tab) => tab.label === newActiveTab);
    const tags = getTagsFromTab(tab);
    if (!tags) {
      return;
    }

    setActiveTab(newActiveTab);
    setFilter((old) => ({ ...old, tags }));
  };

  const navigate = (url?: string, target?: Redirect['target']) => {
    if (!url) {
      return;
    }

    const isAbsoluteUrl = !url.startsWith('/');
    if (isAbsoluteUrl) {
      window.open(url, target ?? DEFAULT_TARGET, DEFAULT_REFERRER);

      return;
    }

    if (props.routerPush) {
      props.routerPush(url);

      return;
    }

    const fullUrl = new URL(url, window.location.href);
    const pushState = window.history.pushState.bind(window.history);
    pushState({}, '', fullUrl);
  };

  createEffect(() => {
    setTabs(props.tabs);
    const firstTab = props.tabs[0];
    const tags = getTagsFromTab(firstTab);
    setActiveTab(firstTab?.label ?? '');
    setFilter((old) => ({ ...old, tags }));
    setPreferencesFilter(props.preferencesFilter);
  });

  useNovuEvent({
    event: 'session.initialize.resolved',
    eventHandler: ({ data }) => {
      if (!data) {
        return;
      }

      setHideBranding(data.removeNovuBranding);
    },
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
        limit,
        setLimit,
        isOpened,
        setIsOpened,
        navigate,
        hideBranding,
        preferencesFilter,
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
