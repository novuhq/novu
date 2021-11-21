let ResourcesConstants;

if (process.env.ENVIRONMENT === 'production') {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: 'https://widget.notifire.co',
    WWW_URL: 'https://widget.notifire.co',
    SENTRY_DSN: 'https://8f674449bb7646468c3f434826aed6b2@sentry.io/1828539',
  };
} else if (process.env.ENVIRONMENT === 'dev') {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: 'https://dev.widget.notifire.co',
    WWW_URL: 'http://localhost:3500',
    SENTRY_DSN: '',
  };
} else {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: 'http://localhost:3500',
    WWW_URL: 'http://localhost:3500',
    SENTRY_DSN: '',
  };
}

export const DEBUG = false;
export const { API_URL } = ResourcesConstants;
export const { IFRAME_URL } = ResourcesConstants;
export const { WWW_URL } = ResourcesConstants;
export const { SENTRY_DSN } = ResourcesConstants;
