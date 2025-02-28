import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export const useNavigateEditSubscriberPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  return useCallback(
    (subscriberId: string) => {
      navigate(
        `${buildRoute(ROUTES.EDIT_SUBSCRIBER, {
          environmentSlug: currentEnvironment?.slug ?? '',
          subscriberId,
        })}${location.search}`
      );
    },
    [location.search, navigate, currentEnvironment?.slug]
  );
};
