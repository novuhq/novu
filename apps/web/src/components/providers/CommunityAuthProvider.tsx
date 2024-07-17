import { createContext } from 'react';
import { flushSync } from 'react-dom';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { setUser as sentrySetUser, configureScope as sentryConfigureScope } from '@sentry/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, PUBLIC_ROUTES_PREFIXES } from '../../constants/routes';
import { useSegment } from './SegmentProvider';
import { clearEnvironmentId } from './EnvironmentProvider';
import { getToken } from '../../auth/getToken';
import { getTokenClaims } from '../../auth/getTokenClaims';
import { getUser } from '../../api/user';
import { switchOrganization as apiSwitchOrganization, getOrganization } from '../../api/organization';
import { type AuthContextValue } from './AuthProvider';

// TODO: Add a novu prefix to the local storage key
export const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'auth_token';

const noop = () => {};
const asyncNoop = async () => {};

export const CommunityAuthContext = createContext<AuthContextValue>({
  inPublicRoute: false,
  inPrivateRoute: false,
  isUserLoading: false,
  isOrganizationLoading: false,
  currentUser: null,
  currentOrganization: null,
  login: asyncNoop,
  logout: noop,
  redirectToLogin: noop,
  redirectToSignUp: noop,
  switchOrganization: asyncNoop,
  reloadOrganization: async () => ({}),
});

CommunityAuthContext.displayName = 'CommunityAuthProvider';

function saveToken(token: string | null) {
  if (token) {
    localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  }
}

function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

function selectOrganization(organizations: IOrganizationEntity[] | null, selectedOrganizationId?: string) {
  let org: IOrganizationEntity | null = null;

  if (!organizations) {
    return null;
  }

  if (selectedOrganizationId) {
    org = organizations.find((currOrg) => currOrg._id === selectedOrganizationId) || null;
  }

  // Or pick the development environment
  if (!org) {
    org = organizations[0];
  }

  return org;
}

export const CommunityAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const ldClient = useLDClient();
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const inPublicRoute = !!Array.from(PUBLIC_ROUTES_PREFIXES.values()).find((prefix) =>
    location.pathname.startsWith(prefix)
  );
  const inPrivateRoute = !inPublicRoute;
  const hasToken = !!getToken();

  useEffect(() => {
    if (!getToken() && inPrivateRoute && !inIframe()) {
      navigate(ROUTES.AUTH_LOGIN, { state: { redirectTo: location } });
    }
  }, [navigate, inPrivateRoute, location]);

  const { data: currentUser = null, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
    onError: (error: any) => {
      if (error?.statusCode === HttpStatusCode.Unauthorized) {
        logout();
      }
    },
  });

  const {
    data: currentOrganization = null,
    isLoading: isOrganizationLoading,
    refetch: reloadOrganization,
  } = useQuery<IOrganizationEntity>(['/v1/organizations/me'], getOrganization, {
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
    onError: (error: any) => {
      if (error?.statusCode === HttpStatusCode.Unauthorized) {
        logout();
      }
    },
  });

  const login = useCallback(
    async (newToken: string, redirectUrl?: string) => {
      if (!newToken) {
        return;
      }

      // TODO: Revise storing environment id in local storage to avoid having to clear it during org or env switching
      clearEnvironmentId();

      saveToken(newToken);
      await reloadOrganization();

      redirectUrl ? navigate(redirectUrl) : void 0;
    },
    [navigate, reloadOrganization]
  );

  const logout = useCallback(() => {
    saveToken(null);
    // TODO: Revise storing environment id in local storage to avoid having to clear it during org or env switching
    clearEnvironmentId();
    queryClient.clear();
    segment.reset();
    navigate(ROUTES.AUTH_LOGIN);
  }, [navigate, queryClient, segment]);

  const redirectTo = useCallback(
    ({
      url,
      redirectURL,
      origin,
      anonymousId,
    }: {
      url: string;
      redirectURL?: string;
      origin?: string;
      anonymousId?: string | null;
    }) => {
      const finalURL = new URL(url, window.location.origin);

      if (redirectURL) {
        finalURL.searchParams.append('redirect_url', redirectURL);
      }

      if (origin) {
        finalURL.searchParams.append('origin', origin);
      }

      if (anonymousId) {
        finalURL.searchParams.append('anonymous_id', anonymousId);
      }

      // Note: Do not use react-router-dom. The version we have doesn't do instant cross origin redirects.
      window.location.replace(finalURL.href);
    },
    []
  );

  const redirectToLogin = useCallback(
    ({ redirectURL }: { redirectURL?: string } = {}) => redirectTo({ url: ROUTES.AUTH_LOGIN, redirectURL }),
    [redirectTo]
  );

  const redirectToSignUp = useCallback(
    ({
      redirectURL,
      origin,
      anonymousId,
    }: { redirectURL?: string; origin?: string; anonymousId?: string | null } = {}) =>
      redirectTo({ url: ROUTES.AUTH_SIGNUP, redirectURL, origin, anonymousId }),
    [redirectTo]
  );

  const switchOrganization = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      if (orgId === currentOrganization?._id) {
        return;
      }

      // TODO: Revise storing environment id in local storage to avoid having to clear it during org or env switching
      clearEnvironmentId();

      const token = await apiSwitchOrganization(orgId);
      await login(token);
      await reloadOrganization();
    },
    [currentOrganization, reloadOrganization, login]
  );

  useEffect(() => {
    if (currentUser && currentOrganization) {
      segment.identify(currentUser);

      sentrySetUser({
        email: currentUser.email ?? '',
        username: `${currentUser.firstName} ${currentUser.lastName}`,
        id: currentUser._id,
        organizationId: currentOrganization._id,
        organizationName: currentOrganization.name,
      });
    } else {
      sentryConfigureScope((scope) => scope.setUser(null));
    }
  }, [currentUser, currentOrganization, segment]);

  useEffect(() => {
    if (!ldClient) {
      return;
    }

    if (currentOrganization) {
      ldClient.identify({
        kind: 'organization',
        key: currentOrganization._id,
        name: currentOrganization.name,
        createdAt: currentOrganization.createdAt,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, currentOrganization]);

  const value = {
    inPublicRoute,
    inPrivateRoute,
    isUserLoading,
    isOrganizationLoading,
    currentUser,
    currentOrganization,
    login,
    logout,
    redirectToLogin,
    redirectToSignUp,
    switchOrganization,
    reloadOrganization,
  };

  return <CommunityAuthContext.Provider value={value}>{children}</CommunityAuthContext.Provider>;
};
