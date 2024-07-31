import { ROUTES } from '../constants/routes';

/**
 * Note: Do not use client navigation(react-router-dom), we need to make sure to create new headers
 * This is because of the need to create new headers for the onboarding playground
 * @param params
 */
export const navigateToAuthApplication = (params = '') => {
  window.location.replace(window.location.origin + ROUTES.AUTH_APPLICATION + params);
};

/**
 * Note: Do not use client navigation(react-router-dom), we need to make sure to create new headers
 * This is because of the need to create default headers for the dashboard
 */
export const navigateToWorkflows = () => {
  window.location.replace(window.location.origin + ROUTES.WORKFLOWS);
};
