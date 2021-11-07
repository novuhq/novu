import { isBrowser } from '../utils/utils';

export const API_ROOT =
  process.env.REACT_APP_API_URL || (isBrowser() && (window as any).Cypress)
    ? process.env.REACT_APP_API_URL || 'http://localhost:1336'
    : process.env.REACT_APP_API_URL || 'http://localhost:3000';
