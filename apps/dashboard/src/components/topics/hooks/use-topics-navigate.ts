import { buildRoute, ROUTES } from '@/utils/routes';
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEnvironment } from '../../../context/environment/hooks';

export const useTopicsNavigate = () => {
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navigateToCreateTopicPage = useCallback(() => {
    navigate(ROUTES.TOPICS_CREATE);
  }, [navigate]);

  const navigateToEditTopicPage = useCallback(
    (topicKey: string) => {
      const currentSearchParams = searchParams.toString();

      navigate(
        buildRoute(ROUTES.TOPICS_EDIT, { topicKey, environmentSlug: currentEnvironment?.slug! }) +
          '?' +
          currentSearchParams
      );
    },
    [navigate, searchParams]
  );

  const navigateToTopicsPage = useCallback(() => {
    const currentSearchParams = searchParams.toString();

    navigate(buildRoute(ROUTES.TOPICS, { environmentSlug: currentEnvironment?.slug! }) + '?' + currentSearchParams);
  }, [navigate, searchParams]);

  return {
    navigateToCreateTopicPage,
    navigateToEditTopicPage,
    navigateToTopicsPage,
  };
};
