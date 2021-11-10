import { useContext } from 'react';
import { AuthContext, IAuthContext } from '../store/auth.context';

export function useAuth() {
  const { token, user, isLoggedIn } = useContext<IAuthContext>(AuthContext);

  return {
    token,
    user,
    isLoggedIn,
  };
}
