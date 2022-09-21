import { useContext } from 'react';
import { FeedContext, IFeedContext } from '../store/feed.context';

export function useFeed() {
  const { activeTabStoreId, stores, setActiveTabStoreId } = useContext<IFeedContext>(FeedContext);

  return {
    activeTabStoreId,
    stores,
    setActiveTabStoreId,
  };
}
