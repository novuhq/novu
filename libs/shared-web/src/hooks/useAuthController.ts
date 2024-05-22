import { useEffect, useCallback, useState } from 'react';
import jwtDecode from 'jwt-decode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import type { IJwtPayload, IOrganizationEntity, IUserEntity } from '@novu/shared';

import { useSegment } from '../providers';
import { api } from '../api';
import { ROUTES } from '../constants';

const LOCAL_STORAGE_AUTH_TOKEN_KEY = 'auth_token';
const UNAUTHENTICATED_STATUS_CODE = 401;
const UNAUTHORIZED_ROUTES = [ROUTES.AUTH_LOGIN, ROUTES.AUTH_SIGNUP, ROUTES.AUTH_RESET_REQUEST, ROUTES.AUTH_RESET_TOKEN];

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

export function applyToken(token: string | null) {
  if (token !== null) {
    localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  }
}

function getToken(): string | null {
  const token = localStorage.getItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  if (!token) {
    return null;
  } else {
    return token;
  }
}

export function useAuthController() {
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [token, setToken] = useState<string | null>(getToken());

  const [organization, setOrganization] = useState<IOrganizationEntity>();
  const isLoginPage = UNAUTHORIZED_ROUTES.includes(location.pathname as any);
  const isLoggedIn = !!token && !isLoginPage;

  /*
   * TODO: Decoding a JWT token on a browser is a security risk.
   * We should modify the `/users/me` endpoint to return the organizationId and environmentId
   * and then we can remove the jwtPayload state and the setJwtPayload function.
   */
  const [jwtPayload, setJwtPayload] = useState<IJwtPayload | undefined>(token && jwtDecode<IJwtPayload>(token));

  useEffect(() => {
    if (!token && !isLoginPage) {
      navigate(ROUTES.AUTH_LOGIN);
    }
  }, [token, navigate, isLoginPage]);

  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
    retry: false,
    enabled: isLoggedIn,
    onError: (error: any) => {
      if (error?.statusCode === UNAUTHENTICATED_STATUS_CODE) {
        applyToken(null);
        logout();
      }
    },
  });

  const { data: organizations } = useQuery<IOrganizationEntity[]>(['/v1/organizations'], getOrganizations, {
    enabled: isLoggedIn,
    retry: 0,
  });

  useEffect(() => {
    const organizationId = jwtPayload?.organizationId;
    if (!organizationId || !organizations || organizations.length === 0) return;

    setOrganization(organizations.find((org) => org._id === organizationId));
  }, [jwtPayload, organizations]);

  useEffect(() => {
    if (user && organization) {
      segment.identify(user);

      Sentry.setUser({
        email: user.email ?? '',
        username: `${user.firstName} ${user.lastName}`,
        id: user._id,
        organizationId: organization._id,
        organizationName: organization.name,
      });
    } else {
      Sentry.configureScope((scope) => scope.setUser(null));
    }
  }, [user, organization, segment]);

  const setTokenCallback = useCallback(
    (newToken: string | null, refetch = true) => {
      /**
       * applyToken needs to be called first to avoid a race condition
       */
      applyToken(newToken);
      setToken(newToken);

      if (newToken) {
        if (refetch) {
          queryClient.refetchQueries({
            predicate: (query) =>
              !query.queryKey.includes('/v1/users/me') &&
              !query.queryKey.includes('/v1/environments') &&
              !query.queryKey.includes('/v1/organizations') &&
              !query.queryKey.includes('getInviteTokenData'),
          });
        }
        const payload = jwtDecode<IJwtPayload>(newToken);
        setJwtPayload(payload);
      }
    },
    [queryClient, setToken, setJwtPayload]
  );

  const logout = () => {
    setTokenCallback(null);
    queryClient.clear();
    navigate(ROUTES.AUTH_LOGIN);
    segment.reset();
  };

  return {
    isLoggedIn,
    user: {
      ...user,
      organizationId: jwtPayload?.organizationId,
      environmentId: jwtPayload?.environmentId,
    } satisfies IUserWithContext,
    isUserLoading: isUserLoading && isLoggedIn,
    organizations,
    organization,
    token,
    logout,
    setToken: setTokenCallback,
  };
}
