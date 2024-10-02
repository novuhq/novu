import { createContextAndHook } from '@/utils/context';
import { AuthContextValue } from './types';

const [AuthContext, useAuth] = createContextAndHook<AuthContextValue>('AuthContext');

export { AuthContext, useAuth };
