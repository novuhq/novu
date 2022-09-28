import React from 'react';
import { ScreensEnum } from './screens-provider.context';

export interface IScreenContext {
  screen: ScreensEnum;
  setScreen: (screen: ScreensEnum) => void;
}

export const ScreenContext = React.createContext<IScreenContext>({
  screen: null,
  setScreen: (screen: ScreensEnum) => {},
});
