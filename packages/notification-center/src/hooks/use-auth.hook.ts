import { useContext } from 'react';
import { AuthContext } from '../store/auth.context';
import { IAuthContext } from '../shared/interfaces';

export function useAuth() {
  const { token, applyToken, user, setUser, isLoggedIn } = useContext<IAuthContext>(AuthContext);

  return {
    token,
    applyToken,
    user,
    setUser,
    isLoggedIn,
  };
}
