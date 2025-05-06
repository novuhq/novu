import { ROUTES } from '@/utils/routes';
import { useMatch } from 'react-router-dom';

export const useTestPage = () => {
  const match = useMatch(ROUTES.TEST_WORKFLOW);

  return {
    isTestPage: match !== null,
  };
};
