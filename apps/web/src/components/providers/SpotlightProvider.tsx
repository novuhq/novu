import { SpotlightAction } from '@mantine/spotlight';
import React, { useCallback, useContext, useMemo, useState } from 'react';

interface SpotlightItem extends SpotlightAction {
  order?: number;
}

interface ISpotlightContext {
  items: SpotlightItem[];
  removeItems: (id: string[]) => void;
  addItem: (item: SpotlightItem | SpotlightItem[]) => void;
}

const SpotlightContext = React.createContext<ISpotlightContext>({
  items: [],
  removeItems: (ids: string[]) => {},
  addItem: (item: SpotlightItem | SpotlightItem[]) => {},
});

export const useSpotlightContext = (): ISpotlightContext => useContext(SpotlightContext);

export const SpotLightProvider = ({ children }) => {
  const [items, setItems] = useState<SpotlightItem[]>([]);

  const addItem = useCallback(
    (item: SpotlightItem | SpotlightItem[]) => {
      const newItems = Array.isArray(item) ? item : [item];

      setItems((old) => [...old, ...newItems].sort((a, b) => (b.order || 0) - (a.order || 0)));
    },
    [setItems]
  );

  const removeItems = useCallback(
    (ids: string[]) => setItems((old) => old.filter((item) => !ids.includes(item.id ?? ''))),
    [setItems]
  );

  const contextValue = useMemo(() => ({ items, addItem, removeItems }), [items, addItem, removeItems]);

  return <SpotlightContext.Provider value={contextValue}>{children}</SpotlightContext.Provider>;
};
