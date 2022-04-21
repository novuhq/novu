import { isBrowser } from '@novu/shared';

export const API_URL = isBrowser() && (window as any).Cypress ? 'http://localhost:1336' : 'http://localhost:3000';
export const WS_URL = isBrowser() && (window as any).Cypress ? 'http://localhost:1340' : 'http://localhost:3002';
