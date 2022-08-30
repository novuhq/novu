import React, { useState } from 'react';
import { ScreenContext } from './screens.context';

export enum ScreensEnum {
  NOTIFICATIONS = 'notifications',
  SETTINGS = 'settings',
}

export function ScreenProvider({ children }) {
  const [screen, setScreen] = useState<ScreensEnum>(ScreensEnum.NOTIFICATIONS);

  return <ScreenContext.Provider value={{ screen, setScreen }}>{children}</ScreenContext.Provider>;
}
