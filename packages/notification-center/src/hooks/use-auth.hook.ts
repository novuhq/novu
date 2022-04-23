import { useContext } from 'react';
import { AuthContext } from '../store/auth.context';
import { IAuthContext } from '../index';

export function useAuth() {
  const { token, user, isLoggedIn } = useContext<IAuthContext>(AuthContext);

  return {
    token,
    user,
    isLoggedIn,
  };
}
