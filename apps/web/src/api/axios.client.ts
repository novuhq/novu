import axios from 'axios';

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('widget_user_auth_token');
      window.location.href = '/auth/login';
    }

    return Promise.reject(error);
  }
);

export default axios;
