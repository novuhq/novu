import React from 'react';
import { createContextHook } from '../context';
import { DecodedJwt } from '.';
import { createUserFromJwt, SelfHostedUser } from './user.types';

export const UserContext = React.createContext<{
  user: SelfHostedUser;
  isLoaded: boolean;
}>({
  user: createUserFromJwt(null),
  isLoaded: false,
});

export function UserContextProvider({ children }: any) {
  const jwt = localStorage.getItem('self-hosted-jwt');
  const decodedJwt: DecodedJwt | null = jwt ? JSON.parse(atob(jwt.split('.')[1])) : null;
  const value = {
    user: createUserFromJwt(decodedJwt),
    isLoaded: true,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = createContextHook(UserContext);
