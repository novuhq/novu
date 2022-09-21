import React, { useState } from 'react';
import { IStore } from '../shared/interfaces';
import { FeedContext } from './feed.context';

interface IFeedProviderProps {
  stores?: IStore[];
  children: React.ReactNode;
}

export function FeedProvider(props: IFeedProviderProps) {
  const [activeTabStoreId, setActiveTabStoreId] = useState<string>(props.stores[0].storeId ?? 'default_store');

  const stores = props.stores ?? [{ storeId: 'default_store' }];

  return (
    <FeedContext.Provider value={{ activeTabStoreId, setActiveTabStoreId, stores }}>
      {props.children}
    </FeedContext.Provider>
  );
}
