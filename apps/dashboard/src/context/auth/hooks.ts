import { createContextHook } from '@/utils/context';
import { AuthContext } from './auth-context';

export const useAuth = createContextHook(AuthContext);
