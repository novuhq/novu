import { ROUTES } from '../constants/routes';
import { CONTEXT_PATH } from '../config';

const basePath = CONTEXT_PATH.slice(0, -1);

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the onboarding playground.
 * @param params
 */
export const navigateToAuthApplication = (params = '') => {
  window.location.replace(window.location.origin + basePath + ROUTES.AUTH_APPLICATION + params);
};

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the dashboard.
 */
export const navigateToWorkflows = () => {
  window.location.replace(window.location.origin + basePath + ROUTES.WORKFLOWS);
};

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the onboarding playground.
 */
export const navigatePlayground = () => {
  window.location.replace(window.location.origin + basePath + ROUTES.DASHBOARD_PLAYGROUND);
};
