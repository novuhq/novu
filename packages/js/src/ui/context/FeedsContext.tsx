import { Accessor, createContext, ParentComponent, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { FetchFeedArgs, Notification } from '../../feeds';
import { NotificationStatus } from '../../types';
import { useFeed } from '../api';

type FeedsContextType = {
  feed: Accessor<Notification[]>;
  setFeedOptions: (options: FetchFeedArgs) => void;
  feedOptions: FetchFeedArgs;
};

const FeedContext = createContext<FeedsContextType | undefined>(undefined);

// TODO: update this after Filter is implemented
export const FeedProvider: ParentComponent = (props) => {
  const [options, setOptions] = createStore<FetchFeedArgs>({
    status: NotificationStatus.UNREAD,
  });

  const { feed } = useFeed({ options });

  const setFeedOptions = (options: FetchFeedArgs) => {
    setOptions(options);
  };

  return (
    <FeedContext.Provider value={{ feed, setFeedOptions, feedOptions: options }}>{props.children}</FeedContext.Provider>
  );
};

export const useFeedContext = () => {
  const context = useContext(FeedContext);

  if (!context) {
    throw new Error('useFeedContext must be used within a FeedsProvider');
  }

  return context;
};
