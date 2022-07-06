import React from 'react';
import { FeedInfo, IFeedsContext } from '../index';

export const FeedsContext = React.createContext<IFeedsContext>({
  feeds: null,
  setFeeds: (feeds: FeedInfo[]) => {},
});
