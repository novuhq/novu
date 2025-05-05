import { ROUTES } from '../constants/routes';
import { CONTEXT_PATH } from '../config';

const basePath = CONTEXT_PATH.slice(0, -1);

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the dashboard.
 */
export const navigateToWorkflows = () => {
  window.location.replace(window.location.origin + basePath + ROUTES.WORKFLOWS);
};
