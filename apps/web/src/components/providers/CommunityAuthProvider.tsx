import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { HttpStatusCode } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { ROUTES } from '../../constants/routes';
import { clearEnvironmentId } from './EnvironmentProvider';
import { getToken } from '../../auth/getToken';
import { getTokenClaims } from '../../auth/getTokenClaims';
import { getUser } from '../../api/user';
import { switchOrganization as apiSwitchOrganization, getOrganizations } from '../../api/organization';
import { type AuthContextValue } from './AuthProvider';
import { useCommonAuth } from '../../hooks/useCommonAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { createContextAndHook } from './createContextAndHook';

// TODO: Add a novu prefix to the local storage key
export const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'auth_token';

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

function selectOrganization(organizations: IOrganizationEntity[] | undefined, selectedOrganizationId?: string) {
  let org: IOrganizationEntity | undefined = undefined;

  if (!organizations) {
    return;
  }

  if (selectedOrganizationId) {
    org = organizations.find((currOrg) => currOrg._id === selectedOrganizationId);
  }

  // Or pick the development environment
  if (!org) {
    org = organizations[0];
  }

  return org;
}

export const [CommunityAuthCtx] = createContextAndHook<AuthContextValue>('Community Auth Context');

export const CommunityAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentOrganization, setCurrentOrganization] = useState<IOrganizationEntity | undefined>(undefined);
  const hasToken = !!getToken();

  const {
    data: organizations,
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

  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
    onError: (error: any) => {
      if (error?.statusCode === HttpStatusCode.Unauthorized) {
        logout();
      }
    },
  });

  const { inPublicRoute, inPrivateRoute, logout, redirectToLogin, redirectToSignUp } = useCommonAuth({
    user,
    organization: currentOrganization,
    logoutCallback: async () => {
      saveToken(null);
      clearEnvironmentId();
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
      await refetchOrganizations();
      /*
       * TODO: Revise if this is needed as the following useEffect will switch to the latest org
       * setCurrentOrganization(selectOrganization(organizations, getTokenClaims()?.organizationId));
       */
      redirectUrl ? navigate(redirectUrl) : void 0;
    },
    [navigate, refetchOrganizations]
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

  const reloadOrganization = async () => {
    const { data } = await getOrganizations();
    // we need to update all organizations so current org (data) and 'organizations' are not ouf of sync
    await refetchOrganizations();
    setCurrentOrganization(selectOrganization(data, currentOrganization?._id));
  };

  useEffect(() => {
    if (organizations) {
      setCurrentOrganization(selectOrganization(organizations, getTokenClaims()?.organizationId));
    }
  }, [organizations, currentOrganization, switchOrganization]);

  useEffect(() => {
    if (!getToken() && inPrivateRoute && !inIframe()) {
      navigate(ROUTES.AUTH_LOGIN, { state: { redirectTo: location } });
    }
  }, [navigate, inPrivateRoute, location]);

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

  return <CommunityAuthCtx.Provider value={{ value }}>{children}</CommunityAuthCtx.Provider>;
};
