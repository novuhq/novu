import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useSegment } from '../components/providers/SegmentProvider';
import { PUBLIC_ROUTES_PREFIXES, ROUTES } from '../constants/routes';
import { configureScope, setUser } from '@sentry/react';

type CommonAuthProps = {
  user?: IUserEntity;
  organization?: IOrganizationEntity;
  logoutCallback?: () => void;
};

export const useCommonAuth = ({ user, organization, logoutCallback }: CommonAuthProps) => {
  const segment = useSegment();
  const queryClient = useQueryClient();
  const ldClient = useLDClient();
  const navigate = useNavigate();
  const location = useLocation();

  const inPublicRoute = Array.from(PUBLIC_ROUTES_PREFIXES).some((prefix) => location.pathname.startsWith(prefix));
  const inPrivateRoute = !inPublicRoute;

  const logout = useCallback(() => {
    queryClient.clear();
    segment.reset();
    navigate(ROUTES.AUTH_LOGIN);
    logoutCallback?.();
  }, [logoutCallback, navigate, queryClient, segment]);

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

      window.location.replace(finalURL.href);
    },
    []
  );

  const redirectToLogin = useCallback(
    ({ redirectURL }: { redirectURL?: string } = {}) => redirectTo({ url: ROUTES.AUTH_LOGIN, redirectURL }),
    [redirectTo]
  );

  const redirectToSignUp = useCallback(
    ({ redirectURL, origin, anonymousId }: { redirectURL?: string; origin?: string; anonymousId?: string } = {}) =>
      redirectTo({ url: ROUTES.AUTH_SIGNUP, redirectURL, origin, anonymousId }),
    [redirectTo]
  );

  useEffect(() => {
    if (user && organization) {
      segment.identify(user);

      setUser({
        email: user.email ?? '',
        username: `${user.firstName} ${user.lastName}`,
        id: user._id,
        organizationId: organization._id,
        organizationName: organization.name,
      });
    } else {
      configureScope((scope) => scope.setUser(null));
    }
  }, [user, organization, segment]);

  useEffect(() => {
    if (!ldClient) return;

    if (organization) {
      ldClient.identify({
        kind: 'organization',
        key: organization._id,
        name: organization.name,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, organization]);

  return {
    inPublicRoute,
    inPrivateRoute,
    logout,
    redirectToLogin,
    redirectToSignUp,
  };
};
