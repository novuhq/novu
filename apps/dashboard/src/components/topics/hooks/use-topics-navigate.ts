import { ROUTES } from '@/utils/routes';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useTopicsNavigate = () => {
  const navigate = useNavigate();

  const navigateToCreateTopicPage = useCallback(() => {
    navigate(ROUTES.TOPICS_CREATE);
  }, [navigate]);

  const navigateToEditTopicPage = useCallback(
    (topicId: string) => {
      navigate(`${ROUTES.TOPICS}/${topicId}/edit`);
    },
    [navigate]
  );

  return {
    navigateToCreateTopicPage,
    navigateToEditTopicPage,
  };
};
