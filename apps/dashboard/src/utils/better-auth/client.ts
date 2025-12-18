import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';
import { BETTER_AUTH_BASE_URL } from '@/config';

export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_BASE_URL + '/v1/better-auth',
  plugins: [organizationClient()],
  fetchOptions: {
    credentials: 'include',
    auth: {
      type: 'Bearer',
      token: () => localStorage.getItem('better-auth-session-token') || '',
    },
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        localStorage.setItem('better-auth-session-token', authToken);
      }
    },
  },
});

export type AuthClient = typeof authClient;
