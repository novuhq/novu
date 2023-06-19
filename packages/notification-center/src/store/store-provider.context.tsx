import React, { useState, useCallback, useMemo } from 'react';
import type { IStoreQuery } from '@novu/client';

import type { IStore } from '../shared/interfaces';
import { StoreContext } from './store.context';

export const StoreProvider = ({ children, stores }: { children: React.ReactNode; stores: IStore[] }) => {
  const firstStore = stores[0];
  const [storeQuery, setStoreQuery] = useState<IStoreQuery>(() => firstStore.query ?? {});
  const [storeId, setStoreId] = useState(firstStore.storeId ?? 'default_store');
  const setStore = useCallback(
    (newStoreId: string) => {
      const foundQuery = stores?.find((store) => store.storeId === newStoreId)?.query || {};
      setStoreId(newStoreId);
      setStoreQuery(foundQuery);
    },
    [stores, setStoreId, setStoreQuery]
  );

  const contextValue = useMemo(
    () => ({
      storeQuery,
      storeId,
      stores,
      setStore,
    }),
    [storeQuery, storeId, stores, setStore]
  );

  return <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>;
};
