import React, { ReactNode, useState } from 'react';

type StatusContextProps = {
  status: 'all' | 'unread' | 'archived';
  setStatus: (status: 'all' | 'unread' | 'archived') => void;
};

const StatusContext = React.createContext<StatusContextProps | undefined>(undefined);

export const useStatus = () => {
  const context = React.useContext(StatusContext);
  if (context === undefined) {
    throw new Error('useStatus must be used within a StatusProvider');
  }

  return context;
};

export const StatusProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<StatusContextProps['status']>('all');

  return <StatusContext.Provider value={{ status, setStatus }}>{children}</StatusContext.Provider>;
};
