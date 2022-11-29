import { isBrowser } from '../utils/utils';
import { getContextPath, NovuComponentEnum } from '@novu/shared';

declare global {
  interface Window {
    _env_: any;
  }
}

export const API_ROOT =
  window._env_.REACT_APP_API_URL || (isBrowser() && (window as any).Cypress)
    ? window._env_.REACT_APP_API_URL || 'http://localhost:1336'
    : window._env_.REACT_APP_API_URL || 'http://localhost:3000';

export const WS_URL =
  isBrowser() && (window as any).Cypress
    ? window._env_.REACT_APP_WS_URL || process.env.REACT_APP_WS_URL || 'http://localhost:1340'
    : window._env_.REACT_APP_WS_URL || process.env.REACT_APP_WS_URL || 'http://localhost:3002';

export const SENTRY_DSN = window._env_.REACT_APP_SENTRY_DSN;

export const ENV = process.env.REACT_APP_ENVIRONMENT;

export const APP_ID = process.env.REACT_APP_NOVU_APP_ID;

export const WIDGET_EMBED_PATH = process.env.REACT_APP_WIDGET_EMBED_PATH || 'http://localhost:4701/embed.umd.min.js';

export const IS_DOCKER_HOSTED = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';

export const INTERCOM_APP_ID = process.env.REACT_APP_INTERCOM_APP_ID;

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.WEB);
