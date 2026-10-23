import { useQuery } from '@tanstack/react-query';
import { authClient, BETTER_AUTH_API_URL } from './client';

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

async function fetchAuthConfigPayload(headers?: HeadersInit) {
  const response = await fetch(`${BETTER_AUTH_API_URL}/auth-config`, { credentials: 'include', headers });

  if (!response.ok) {
    throw new Error(`Failed to load auth config (${response.status})`);
  }

  const body = await response.json();

  return body?.data ?? body;
}

async function fetchAuthConfig(): Promise<AuthConfig> {
  const payload = await fetchAuthConfigPayload();

  return {
    emailPasswordAuthEnabled: payload?.emailPasswordAuthEnabled !== false,
    ssoEnabled: payload?.ssoEnabled === true,
  };
}

async function fetchCanCreateOrganization(): Promise<boolean> {
  const token = localStorage.getItem('better-auth-session-token');
  const payload = await fetchAuthConfigPayload(token ? { Authorization: `Bearer ${token}` } : undefined);

  return payload?.canCreateOrganization !== false;
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

/**
 * Whether the signed-in user may create organizations (`ORGANIZATION_CREATION_POLICY`). Keyed by user
 * so it never reuses the anonymous answer. Defaults to allowed on failure; the API enforces the policy.
 */
export function useCanCreateOrganization(): { canCreateOrganization: boolean; isLoading: boolean } {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const { data, isLoading } = useQuery({
    queryKey: ['betterAuthConfig', 'canCreateOrganization', userId],
    queryFn: fetchCanCreateOrganization,
    enabled: Boolean(userId),
    staleTime: 60_000,
    retry: 1,
  });

  return { canCreateOrganization: data ?? true, isLoading: Boolean(userId) && isLoading };
}
