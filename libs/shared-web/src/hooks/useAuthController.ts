import { useEffect, useCallback, useState } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import type { IJwtPayload, IOrganizationEntity, IUserEntity } from '@novu/shared';

import { useSegment } from '../providers';
import { api } from '../api';

function getUser() {
  return api.get('/v1/users/me');
}

function getOrganizations() {
  return api.get(`/v1/organizations`);
}

export function applyToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('auth_token');
    delete axios.defaults.headers.common.Authorization;
  }
}

export function getTokenPayload() {
  const token = getToken();
  if (!token) return null;

  return jwtDecode<IJwtPayload>(token);
}

export function getToken(): string {
  return localStorage.getItem('auth_token') as string;
}

export function useAuthController() {
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() => {
    const initialToken = getToken();
    applyToken(initialToken);

    return initialToken;
  });
  const [jwtPayload, setJwtPayload] = useState<IJwtPayload | undefined>(() => {
    const initialToken = getToken();
    if (initialToken) {
      return jwtDecode<IJwtPayload>(initialToken);
    }
  });
  const [organization, setOrganization] = useState<IOrganizationEntity>();
  const isLoggedIn = !!token;

  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>(['/v1/users/me'], getUser, {
    enabled: Boolean(isLoggedIn && axios.defaults.headers.common.Authorization),
  });

  const authorization = axios.defaults.headers.common.Authorization as string;
  const { data: organizations } = useQuery<IOrganizationEntity[]>(['/v1/organizations'], getOrganizations, {
    enabled: Boolean(
      isLoggedIn &&
        axios.defaults.headers.common.Authorization &&
        jwtDecode<IJwtPayload>(authorization?.split(' ')[1])?.organizationId
    ),
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
              // !query.isFetching &&
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
    navigate('/auth/login');
    segment.reset();
  };

  return {
    isLoggedIn,
    user,
    isUserLoading,
    organizations,
    organization,
    token,
    logout,
    jwtPayload,
    setToken: setTokenCallback,
  };
}
