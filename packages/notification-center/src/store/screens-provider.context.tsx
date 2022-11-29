import React, { useState } from 'react';
import { ScreenContext } from './screens.context';
import { ScreensEnum } from '../shared/enums/screens.enum';

export function ScreenProvider({ children }) {
  const [screen, setScreen] = useState<ScreensEnum>(ScreensEnum.NOTIFICATIONS);

  return <ScreenContext.Provider value={{ screen, setScreen }}>{children}</ScreenContext.Provider>;
}
