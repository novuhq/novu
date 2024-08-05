import { ROUTES } from '../constants/routes';

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the onboarding playground.
 * @param params
 */
export const navigateToAuthApplication = (params = '') => {
  window.location.replace(window.location.origin + ROUTES.AUTH_APPLICATION + params);
};

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the dashboard.
 */
export const navigateToWorkflows = () => {
  window.location.replace(window.location.origin + ROUTES.WORKFLOWS);
};

/**
 * Note: Do not use client-side navigation (react-router-dom),
 * because we need to create new default headers for the onboarding playground.
 */
export const navigatePlayground = () => {
  window.location.replace(window.location.origin + ROUTES.DASHBOARD_PLAYGROUND);
};
