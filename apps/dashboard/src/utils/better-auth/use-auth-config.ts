import { useQuery } from '@tanstack/react-query';
import { BETTER_AUTH_API_URL } from './client';

type AuthConfig = {
  emailPasswordAuthEnabled: boolean;
  ssoEnabled: boolean;
};

/**
 * Assume the pre-existing defaults when the probe fails, so a transient API hiccup never hides the
 * only sign-in form a deployment has. The API rejects password requests regardless of what we show.
 */
const FALLBACK_AUTH_CONFIG: AuthConfig = {
  emailPasswordAuthEnabled: true,
  ssoEnabled: false,
};

async function fetchAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${BETTER_AUTH_API_URL}/auth-config`, { credentials: 'include' });

  if (!response.ok) {
    throw new Error(`Failed to load auth config (${response.status})`);
  }

  const body = await response.json();
  const payload = body?.data ?? body;

  return {
    emailPasswordAuthEnabled: payload?.emailPasswordAuthEnabled !== false,
    ssoEnabled: payload?.ssoEnabled === true,
  };
}

/**
 * Which sign-in methods the backend accepts. Self-hosted deployments can turn off email and password
 * with `DISABLE_EMAIL_PASSWORD_AUTH` once SSO is configured.
 */
export function useAuthConfig(): AuthConfig & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ['betterAuthConfig'],
    queryFn: fetchAuthConfig,
    staleTime: Infinity,
    retry: 1,
  });

  return { ...(data ?? FALLBACK_AUTH_CONFIG), isLoading };
}
