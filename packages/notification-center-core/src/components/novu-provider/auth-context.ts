import { ISubscriberJwt } from '@novu/shared';
import { createContext } from '../context/createContext';

export interface IAuthContext {
  token: string | null;
  user: ISubscriberJwt | null;
  isLoggedIn: boolean;
}

export const initialAuthContext: IAuthContext = {
  token: '',
  user: null,
  isLoggedIn: false,
};

export const AuthContext = createContext<IAuthContext>(initialAuthContext, 'auth-context');
