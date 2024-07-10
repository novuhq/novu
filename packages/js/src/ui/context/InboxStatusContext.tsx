import { Accessor, createContext, ParentComponent, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { FetchFeedArgs, Notification } from '../../feeds';
import { NotificationStatus } from '../../types';
import { useFeed } from '../api';

type InboxstatusContextType = {
  feed: Accessor<Notification[]>;
  setFeedOptions: (options: FetchFeedArgs) => void;
  feedOptions: FetchFeedArgs;
};

const InboxStatusContext = createContext<InboxstatusContextType | undefined>(undefined);

// TODO: update this after Filter is implemented
export const InboxStatusProvider: ParentComponent = (props) => {
  const [options, setOptions] = createStore<FetchFeedArgs>({
    status: NotificationStatus.UNREAD,
  });

  const { feed } = useFeed({ options });

  const setFeedOptions = (options: FetchFeedArgs) => {
    setOptions(options);
  };

  return (
    <InboxStatusContext.Provider value={{ feed, setFeedOptions, feedOptions: options }}>
      {props.children}
    </InboxStatusContext.Provider>
  );
};

export const useInboxStatusContext = () => {
  const context = useContext(InboxStatusContext);

  if (!context) {
    throw new Error('useFeedContext must be used within a FeedsProvider');
  }

  return context;
};
