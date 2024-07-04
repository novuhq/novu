import { useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  getStudioHomeLink,
  getStudioWorkflowLink,
  getStudioWorkflowStepLink,
  getStudioWorkflowTestLink,
  isStudioHome,
} from '../utils/routing';
import { useStudioNavigate } from './useStudioNavigate';

export function useStudioWorkflowsNavigation() {
  const navigate = useStudioNavigate();

  const { pathname } = useLocation();
  const { templateId = '' } = useParams<{ templateId: string }>();

  const shouldHideBackButton = useMemo(() => Boolean(isStudioHome(pathname) || !templateId), [pathname, templateId]);

  const goBack = useCallback(() => navigate(getStudioHomeLink(templateId), {}), [navigate, templateId]);

  const goToWorkflow = useCallback((workflowId: string) => navigate(getStudioWorkflowLink(workflowId), {}), [navigate]);

  const goToTest = useCallback((workflowId: string) => navigate(getStudioWorkflowTestLink(workflowId), {}), [navigate]);

  const goToStep = useCallback(
    (workflowId: string, stepId: string) => navigate(getStudioWorkflowStepLink(workflowId, stepId), {}),
    [navigate]
  );

  return {
    shouldHideBackButton,
    goBack,
    goToWorkflow,
    goToStep,
    goToTest,
    currentWorkflowId: templateId,
  };
}
