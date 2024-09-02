import { createContext, useCallback, useEffect } from 'react';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { useSegment } from './SegmentProvider';
import { clearEnvironmentId } from './EnvironmentProvider';
import { getUser } from '../../api/user';
import { switchOrganization as apiSwitchOrganization, getOrganization } from '../../api/organization';
import { DEFAULT_AUTH_CONTEXT_VALUE } from './constants';
import { type AuthContextValue } from './AuthProvider';
import { useRouteScopes } from '../../hooks/useRouteScopes';
import { inIframe } from '../../utils/iframe';
import { navigateToAuthApplication } from '../../utils';

export const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'nv_auth_token';

function saveToken(token: string | null) {
  if (token) {
    localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  }
}

export function getToken() {
  return localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
}

export const CommunityAuthContext = createContext<AuthContextValue>(DEFAULT_AUTH_CONTEXT_VALUE);

CommunityAuthContext.displayName = 'CommunityAuthProvider';

export const CommunityAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { inPrivateRoute } = useRouteScopes();
  const hasToken = !!getToken();

  useEffect(() => {
    if (!getToken() && inPrivateRoute && !inIframe()) {
      navigate(ROUTES.AUTH_LOGIN, { state: { redirectTo: location } });
    }
  }, [navigate, inPrivateRoute, location]);

  const { data: currentUser, isInitialLoading: isUserInitialLoading } = useQuery<IUserEntity>(
    ['/v1/users/me'],
    getUser,
    {
      enabled: hasToken,
      retry: false,
      staleTime: Infinity,
      onError: (error: any) => {
        if (error?.statusCode === HttpStatusCode.Unauthorized) {
          logout();
        }
      },
    }
  );

  const {
    data: currentOrganization,
    isInitialLoading: isOrganizationInitialLoading,
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

      if (redirectUrl === ROUTES.AUTH_APPLICATION) {
        navigateToAuthApplication();
      } else if (redirectUrl) {
        navigate(redirectUrl);
      }
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

  const value = {
    isUserLoaded: isUserInitialLoading === false,
    isOrganizationLoaded: isOrganizationInitialLoading === false,
    currentUser,
    currentOrganization,
    login,
    logout,
    redirectToLogin,
    redirectToSignUp,
    switchOrganization,
    reloadOrganization,
  } as AuthContextValue;
  /*
   * The 'as AuthContextValue' is necessary as Boolean and true or false discriminating unions
   * don't work with inference. See here https://github.com/microsoft/TypeScript/issues/19360
   *
   * Alternatively, we will have to conditionally generate the value object based on the isLoaded values.
   */

  return <CommunityAuthContext.Provider value={value}>{children}</CommunityAuthContext.Provider>;
};
