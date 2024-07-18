import { createContext } from 'react';
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
import { switchOrganization as apiSwitchOrganization, getOrganizations } from '../../api/organization';
import { type AuthContextValue } from './AuthProvider';

// TODO: Add a novu prefix to the local storage key
export const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'auth_token';

const noop = () => {};
const asyncNoop = async () => {};

export const CommunityAuthContext = createContext<AuthContextValue>({
  inPublicRoute: false,
  inPrivateRoute: false,
  isLoading: false,
  currentUser: null,
  currentOrganization: null,
  organizations: [],
  login: asyncNoop,
  logout: noop,
  redirectToLogin: noop,
  redirectToSignUp: noop,
  switchOrganization: asyncNoop,
  reloadOrganization: asyncNoop,
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

  const { data: user = null, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
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
    data: organizations = null,
    isLoading: isOrganizationLoading,
    refetch: refetchOrganizations,
  } = useQuery<IOrganizationEntity[]>(['/v1/organizations'], getOrganizations, {
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
    onError: (error: any) => {
      if (error?.statusCode === HttpStatusCode.Unauthorized) {
        logout();
      }
    },
  });

  const reloadOrganization = async () => {
    const { data } = await getOrganizations();
    // we need to update all organizations so current org (data) and 'organizations' are not ouf of sync
    await refetchOrganizations();
    setCurrentOrganization(selectOrganization(data, currentOrganization?._id));
  };

  const [currentOrganization, setCurrentOrganization] = useState<IOrganizationEntity | null>(
    selectOrganization(organizations)
  );

  const login = useCallback(
    async (newToken: string, redirectUrl?: string) => {
      if (!newToken) {
        return;
      }

      // TODO: Revise storing environment id in local storage to avoid having to clear it during org or env switching
      clearEnvironmentId();

      saveToken(newToken);
      await refetchOrganizations();
      /*
       * TODO: Revise if this is needed as the following useEffect will switch to the latest org
       * setCurrentOrganization(selectOrganization(organizations, getTokenClaims()?.organizationId));
       */
      redirectUrl ? navigate(redirectUrl) : void 0;
    },
    [navigate, refetchOrganizations]
  );

  const logout = useCallback(() => {
    saveToken(null);
    queryClient.clear();
    segment.reset();
    // TODO: Revise storing environment id in local storage to avoid having to clear it during org or env switching
    clearEnvironmentId();
    navigate(ROUTES.AUTH_LOGIN);
    setCurrentOrganization(null);
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
      setCurrentOrganization(selectOrganization(organizations, orgId));
    },
    [organizations, currentOrganization, setCurrentOrganization, login]
  );

  useEffect(() => {
    if (organizations) {
      setCurrentOrganization(selectOrganization(organizations, getTokenClaims()?.organizationId));
    }
  }, [organizations, currentOrganization, switchOrganization]);

  useEffect(() => {
    if (user && currentOrganization) {
      segment.identify(user);

      sentrySetUser({
        email: user.email ?? '',
        username: `${user.firstName} ${user.lastName}`,
        id: user._id,
        organizationId: currentOrganization._id,
        organizationName: currentOrganization.name,
      });
    } else {
      sentryConfigureScope((scope) => scope.setUser(null));
    }
  }, [user, currentOrganization, segment]);

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
    isLoading: hasToken && (isUserLoading || isOrganizationLoading),
    currentUser: user,
    organizations,
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
