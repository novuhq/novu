import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export const useNavigateCreateSubscriberPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  return useCallback(() => {
    navigate(
      `${buildRoute(ROUTES.CREATE_SUBSCRIBER, { environmentSlug: currentEnvironment?.slug || '' })}${location.search}`
    );
  }, [location.search, navigate, currentEnvironment?.slug]);
};
