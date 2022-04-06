declare global {
  interface Window {
    _env_: any;
  }
}

export const API_URL = window._env_.REACT_APP_API_URL || 'http://localhost:3000';
export const WS_URL = window._env_.REACT_APP_WS_URL || 'http://localhost:3002';
