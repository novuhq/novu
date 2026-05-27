import React from 'react';
import { SnitcherService } from '@/utils/snitcher';

type Props = {
  children: React.ReactNode;
};

export const SnitcherContext = React.createContext<SnitcherService>({} as SnitcherService);

export const SnitcherProvider = ({ children }: Props) => {
  const snitcher = React.useMemo(() => new SnitcherService(), []);

  return <SnitcherContext.Provider value={snitcher}>{children}</SnitcherContext.Provider>;
};
