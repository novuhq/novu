import { createContext, PropsWithChildren } from 'react';
import { useUserProfileSetPassword } from './useUserProfileSetPassword';

export type IUserProfileSidebarContext = ReturnType<typeof useUserProfileSetPassword>;

const DEFAULT_CONTEXT: IUserProfileSidebarContext = {
  countdownTimerSeconds: 0,
  stopTimer: () => {},
  sendVerificationEmail: async () => {},
};

export const UserProfileSidebarContext = createContext<IUserProfileSidebarContext>(DEFAULT_CONTEXT);

export const UserProfileSidebarContextProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const value = useUserProfileSetPassword();

  return <UserProfileSidebarContext.Provider value={value}>{children}</UserProfileSidebarContext.Provider>;
};
