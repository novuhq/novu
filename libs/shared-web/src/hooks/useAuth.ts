import { useEffect, useCallback, useState, useMemo } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import jwtDecode from 'jwt-decode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import type { IJwtClaims, IOrganizationEntity, IUserEntity } from '@novu/shared';

import { useSegment } from '../providers';
import { api } from '../api';
import { ROUTES, PUBLIC_ROUTES } from '../constants';

// TODO: Add a novu prefix to the local storage key
const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'auth_token';
const UNAUTHENTICATED_STATUS_CODE = 401;

export interface IUserWithContext extends IUserEntity {
  organizationId?: string;
  environmentId?: string;
}

function getUser() {
  return api.get('/v1/users/me');
}

function getOrganizations() {
  return api.get(`/v1/organizations`);
}

function setTokenInStorage(token: string | null) {
  if (token) {
    localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  }
}

function getTokenFromStorage(): string {
  return localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY) || '';
}

export function useAuth() {
  const ldClient = useLDClient();
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(getTokenFromStorage());

  const inPublicRoute = PUBLIC_ROUTES.has(location.pathname as any);
  const inPrivateRoute = !inPublicRoute;

  const login = useCallback((newToken: string) => {
    if (newToken) {
      setTokenInStorage(newToken);
      setToken(newToken);
      refetchOrganizations();
    } else {
      logout();
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenInStorage(null);
    queryClient.clear();
    navigate(ROUTES.AUTH_LOGIN);
    segment.reset();
  }, []);

  const redirectToLogin = useCallback(() => navigate(ROUTES.AUTH_LOGIN), [navigate]);

  useEffect(() => {
    if (!token && inPrivateRoute) {
      redirectToLogin();
    }
  }, [redirectToLogin, token, inPublicRoute]);

  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
    enabled: !!token && inPrivateRoute,
    retry: false,
    onError: (error: any) => {
      if (error?.statusCode === UNAUTHENTICATED_STATUS_CODE) {
        logout();
      }
    },
  });

  const {
    data: organizations,
    isLoading: isOrganizationLoading,
    refetch: refetchOrganizations,
  } = useQuery<IOrganizationEntity[]>(['/v1/organizations'], getOrganizations, {
    enabled: inPrivateRoute,
    retry: false,
    onError: (error: any) => {
      if (error?.statusCode === UNAUTHENTICATED_STATUS_CODE) {
        logout();
      }
    },
  });

  const claims = useMemo(() => (token ? jwtDecode<IJwtClaims>(token) : null), [token]);

  const currentOrganization = useMemo(() => {
    const { organizationId } = claims || {};
    if (organizationId && organizations?.length > 0) {
      return organizations.find((org) => org._id === organizationId);
    }

    return null;
  }, [claims, organizations]);

  useEffect(() => {
    if (user && currentOrganization) {
      segment.identify(user);

      Sentry.setUser({
        email: user.email ?? '',
        username: `${user.firstName} ${user.lastName}`,
        id: user._id,
        organizationId: currentOrganization._id,
        organizationName: currentOrganization.name,
      });
    } else {
      Sentry.configureScope((scope) => scope.setUser(null));
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
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, currentOrganization]);

  return {
    inPublicRoute,
    inPrivateRoute,
    isLoading: inPrivateRoute && (isUserLoading || isOrganizationLoading),
    // TODO: Remove orgId and envId from currentUser and add them to the useAuth hook returned object
    currentUser: {
      ...user,
      organizationId: claims?.organizationId,
      environmentId: claims?.environmentId,
    } satisfies IUserWithContext,
    organizations,
    currentOrganization,
    token,
    login,
    logout,
    claims,
  };
}
