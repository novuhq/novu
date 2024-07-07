import { Accessor, createContext, ParentComponent, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { FetchFeedArgs, Notification } from '../../feeds';
import { NotificationStatus } from '../../types';
import { useFeeds } from '../api';

type FeedsContextType = {
  feeds: Accessor<Notification[]>;
  setFeedOptions: (options: FetchFeedArgs) => void;
  feedOptions: FetchFeedArgs;
};

const FeedsContext = createContext<FeedsContextType | undefined>(undefined);

// TODO: update this after Filter is implemented
export const FeedsProvider: ParentComponent = (props) => {
  const [options, setOptions] = createStore<FetchFeedArgs>({
    status: NotificationStatus.UNREAD,
  });

  const { feeds } = useFeeds({ options });

  const setFeedOptions = (options: FetchFeedArgs) => {
    setOptions(options);
  };

  return (
    <FeedsContext.Provider value={{ feeds, setFeedOptions, feedOptions: options }}>
      {props.children}
    </FeedsContext.Provider>
  );
};

export const useFeedsContext = () => {
  const context = useContext(FeedsContext);

  if (!context) {
    throw new Error('useFeedsContext must be used within a FeedsProvider');
  }

  return context;
};
