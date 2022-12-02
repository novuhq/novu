import React, { useState } from 'react';
import { ScreensEnum } from '../shared/enums/screens.enum';
import { ScreenContext } from './screens.context';

export function ScreenProvider({ children }) {
  const [screen, setScreen] = useState<ScreensEnum>(ScreensEnum.NOTIFICATIONS);

  return <ScreenContext.Provider value={{ screen, setScreen }}>{children}</ScreenContext.Provider>;
}
