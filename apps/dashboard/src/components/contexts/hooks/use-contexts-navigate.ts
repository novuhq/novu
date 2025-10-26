import { ContextId, ContextType } from '@novu/shared';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '../../../context/environment/hooks';

export const useContextsNavigate = () => {
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const environmentSlug = currentEnvironment?.slug ?? '';

  const navigateToCreateContextPage = useCallback(() => {
    navigate(buildRoute(ROUTES.CONTEXTS_CREATE, { environmentSlug }));
  }, [navigate, environmentSlug]);

  const navigateToEditContextPage = useCallback(
    (type: ContextType, id: ContextId) => {
      navigate(buildRoute(ROUTES.CONTEXTS_EDIT, { environmentSlug, type, id }));
    },
    [navigate, environmentSlug]
  );

  const navigateToContextsPage = useCallback(() => {
    const currentSearchParams = searchParams.toString();

    navigate(buildRoute(ROUTES.CONTEXTS, { environmentSlug }) + '?' + currentSearchParams);
  }, [navigate, searchParams, environmentSlug]);

  return {
    navigateToCreateContextPage,
    navigateToEditContextPage,
    navigateToContextsPage,
  };
};
