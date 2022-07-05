import React from 'react';
import { IFeedsContext } from '../index';
import { IFeedEntity } from '@novu/shared';

export const FeedsContext = React.createContext<IFeedsContext>({
  feeds: null,
  setFeeds: (feeds: IFeedEntity[]) => {},
});
