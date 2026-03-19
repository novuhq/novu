import { ssoClient } from '@better-auth/sso/client';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { API_HOSTNAME, BETTER_AUTH_BASE_URL } from '@/config';

const baseURL = BETTER_AUTH_BASE_URL || API_HOSTNAME || 'http://localhost:3000';
const fullBaseURL = `${baseURL}/v1/better-auth`;

export const authClient = createAuthClient({
  baseURL: fullBaseURL,
  plugins: [organizationClient(), ssoClient()],
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
