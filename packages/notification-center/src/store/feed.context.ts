import React from 'react';
import { IStore } from '../shared/interfaces';

export interface IFeedContext {
  activeTabStoreId: string;
  stores: IStore[];
  setActiveTabStoreId: (storeId: string) => void;
}

export const FeedContext = React.createContext<IFeedContext>(null);
