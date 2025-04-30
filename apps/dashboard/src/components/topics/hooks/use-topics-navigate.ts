import { ROUTES } from '@/utils/routes';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useTopicsNavigate = () => {
  const navigate = useNavigate();

  const navigateToCreateTopicPage = useCallback(() => {
    navigate(ROUTES.TOPICS_CREATE);
  }, [navigate]);

  const navigateToEditTopicPage = useCallback(
    (topicKey: string) => {
      navigate(`${ROUTES.TOPICS}/${encodeURIComponent(topicKey)}/edit`);
    },
    [navigate]
  );

  const navigateToTopicsPage = useCallback(() => {
    navigate(ROUTES.TOPICS);
  }, [navigate]);

  return {
    navigateToCreateTopicPage,
    navigateToEditTopicPage,
    navigateToTopicsPage,
  };
};
