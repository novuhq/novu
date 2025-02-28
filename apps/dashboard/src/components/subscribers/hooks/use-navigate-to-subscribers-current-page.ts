import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useEnvironment } from '@/context/environment/hooks';
import { ROUTES } from '@/utils/routes';
import { buildRoute } from '@/utils/routes';

export const useNavigateToSubscribersCurrentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  return useCallback(() => {
    navigate(
      `${buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}${location.search}`
    );
  }, [location.search, navigate, currentEnvironment?.slug]);
};
