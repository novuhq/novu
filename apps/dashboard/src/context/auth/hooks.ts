import { AuthContext } from './auth-context';
import { createContextHook } from '@/utils/context';

export const useAuth = createContextHook(AuthContext);
