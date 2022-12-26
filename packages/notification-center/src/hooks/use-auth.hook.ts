import { useContext } from 'react';

import { AuthContext } from '../store/auth.context';
import { IAuthContext, ISubscriberJwt } from '../shared/interfaces';

export function useAuth(): {
  token: string;
  applyToken: (token: string) => void;
  user: ISubscriberJwt;
  setUser: (userr: ISubscriberJwt) => void;
  isLoggedIn: boolean;
} {
  const { token, applyToken, user, setUser, isLoggedIn } = useContext<IAuthContext>(AuthContext);

  return {
    token,
    applyToken,
    user,
    setUser,
    isLoggedIn,
  };
}
