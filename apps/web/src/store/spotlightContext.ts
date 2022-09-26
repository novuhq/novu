import { SpotlightAction } from '@mantine/spotlight';
import React from 'react';

export interface SpotlightItem extends SpotlightAction {
  order?: number;
}

export interface ISpotlightContext {
  items: SpotlightItem[];
  removeItem: (id: string) => void;
  addItem: (item: SpotlightItem | SpotlightItem[]) => void;
}

export const SpotlightContext = React.createContext<ISpotlightContext>({
  items: [],
  removeItem: (id: string) => {},
  addItem: (item: SpotlightItem | SpotlightItem[]) => {},
});
