import { useLocation, useMatch } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';

export const useWorkflowEditorPage = () => {
  const testMatch = useMatch(ROUTES.TEST_WORKFLOW);
  const location = useLocation();

  // Check if we're on any edit workflow subpage by matching the pattern
  // /env/:environmentSlug/workflows/:workflowSlug/*
  const editWorkflowPattern = /^\/env\/[^/]+\/workflows\/[^/]+(?:\/|$)/;
  const isOnEditWorkflowPage = editWorkflowPattern.test(location.pathname);

  return {
    isWorkflowEditorPage: testMatch !== null || isOnEditWorkflowPage,
  };
};
