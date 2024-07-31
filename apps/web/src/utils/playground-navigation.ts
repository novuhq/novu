import { ROUTES } from '../constants/routes';

export const navigateToAuthApplication = (params = '') => {
  // Note: Do not use client navigation(react-router-dom), we need to make sure to create new headers
  window.location.replace(window.location.origin + ROUTES.AUTH_APPLICATION + params);
};

export const navigateToWorkflows = () => {
  // Note: Do not use client navigation(react-router-dom), we need to make sure to create new headers
  window.location.replace(window.location.origin + ROUTES.WORKFLOWS);
};
