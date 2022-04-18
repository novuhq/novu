import axios from 'axios';

export function applyToken(token: string | null) {
  if (token) {
    localStorage.setItem('widget_user_auth_token', token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('widget_user_auth_token');
    delete axios.defaults.headers.common.Authorization;
  }
}
