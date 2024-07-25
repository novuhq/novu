import { matchPath } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { parseUrl } from '../../utils/routeUtils';

export const STUDIO_WORKFLOWS_HOME_ROUTE: ROUTES = ROUTES.STUDIO_FLOWS_VIEW;

export function isStudioHome(pathname: string) {
  return matchPath(STUDIO_WORKFLOWS_HOME_ROUTE, pathname);
}

export function isStudioOnboardingRoute(path: string) {
  return path.includes(ROUTES.STUDIO_ONBOARDING);
}

/**
 * Centralized logic for generating the links for different Studio pages
 */

export function getStudioHomeLink(workflowId: string) {
  return parseUrl(STUDIO_WORKFLOWS_HOME_ROUTE, { templateId: workflowId });
}

export function getStudioWorkflowLink(workflowId: string) {
  return parseUrl(ROUTES.STUDIO_FLOWS_VIEW, { templateId: workflowId });
}

export function getStudioWorkflowTestLink(workflowId: string) {
  return parseUrl(ROUTES.STUDIO_FLOWS_TEST, { templateId: workflowId });
}

export function getStudioWorkflowStepLink(workflowId: string, stepId: string) {
  return parseUrl(ROUTES.STUDIO_FLOWS_STEP_EDITOR, {
    templateId: workflowId,
    stepId,
  });
}
