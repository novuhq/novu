import { isBrowser } from '../utils/utils';

declare global {
  interface Window {
    _env_: any;
  }
}

export const API_ROOT =
  window._env_.REACT_APP_API_URL || (isBrowser() && (window as any).Cypress)
    ? window._env_.REACT_APP_API_URL || 'http://localhost:1336'
    : window._env_.REACT_APP_API_URL || 'http://localhost:3000';

export const SENTRY_DSN = window._env_.REACT_APP_SENTRY_DSN;

export const ENV = process.env.REACT_APP_ENVIRONMENT;

export const APP_ID = process.env.REACT_APP_NOVU_APP_ID;

export const WIDGET_EMEBED_PATH = process.env.REACT_APP_WIDGET_EMBED_PATH;
