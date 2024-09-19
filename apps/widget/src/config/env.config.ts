import { isBrowser, getContextPath, NovuComponentEnum } from '@novu/shared';

export const API_URL =
  isBrowser() && (window as any).Cypress
    ? window._env_.VITE_API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:1336'
    : window._env_.VITE_API_URL || process.env.VITE_API_URL || 'http://127.0.0.1:3000';
export const WS_URL =
  isBrowser() && (window as any).Cypress
    ? window._env_.VITE_WS_URL || process.env.VITE_WS_URL || 'http://127.0.0.1:1340'
    : window._env_.VITE_WS_URL || process.env.VITE_WS_URL || 'http://127.0.0.1:3002';

export const CONTEXT_PATH = getContextPath(NovuComponentEnum.WIDGET);
