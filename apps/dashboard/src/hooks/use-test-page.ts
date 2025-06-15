import { ROUTES } from '@/utils/routes';
import { useMatch } from 'react-router-dom';

export const useTestPage = () => {
  const testMatch = useMatch(ROUTES.TEST_WORKFLOW);
  const editWorkflowMatch = useMatch(ROUTES.EDIT_WORKFLOW);
  const editStepMatch = useMatch(ROUTES.EDIT_STEP_TEMPLATE_V2);

  return {
    isTestPage: testMatch !== null || editWorkflowMatch !== null || editStepMatch !== null,
  };
};
