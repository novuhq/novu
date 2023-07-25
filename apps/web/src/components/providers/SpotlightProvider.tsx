import { SpotlightAction } from '@mantine/spotlight';
import React, { useContext, useState } from 'react';

interface SpotlightItem extends SpotlightAction {
  order?: number;
}

interface ISpotlightContext {
  items: SpotlightItem[];
  removeItem: (id: string) => void;
  addItem: (item: SpotlightItem | SpotlightItem[]) => void;
}

const SpotlightContext = React.createContext<ISpotlightContext>({
  items: [],
  removeItem: (id: string) => {},
  addItem: (item: SpotlightItem | SpotlightItem[]) => {},
});

export const useSpotlightContext = (): ISpotlightContext => useContext(SpotlightContext);

export const SpotLightProvider = ({ children }) => {
  const [items, setItems] = useState<SpotlightItem[]>([]);

  const addItem = (item: SpotlightItem | SpotlightItem[]) => {
    if (!Array.isArray(item)) {
      item = [item];
    }

    const newItems = [...items, ...item];
    newItems.sort((a, b) => (b.order || 0) - (a.order || 0));

    setItems(newItems);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return <SpotlightContext.Provider value={{ items, addItem, removeItem }}>{children}</SpotlightContext.Provider>;
};
