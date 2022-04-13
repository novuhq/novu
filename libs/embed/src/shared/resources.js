let ResourcesConstants;

if (process.env.ENVIRONMENT === 'production') {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'https://widget.novu.co',
    WWW_URL: process.env.WIDGET_URL || 'https://widget.novu.co',
    SENTRY_DSN: 'https://bcadda4b593d454797a1260e094f0c5d@o1161119.ingest.sentry.io/6252448',
  };
} else if (process.env.ENVIRONMENT === 'dev') {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'https://dev.widget.novu.co',
    WWW_URL: process.env.WIDGET_URL || 'http://localhost:3500',
    SENTRY_DSN: '',
  };
} else {
  ResourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'http://localhost:3500',
    WWW_URL: process.env.WIDGET_URL || 'http://localhost:3500',
    SENTRY_DSN: '',
  };
}

export const DEBUG = false;
export const { API_URL } = ResourcesConstants;
export const { IFRAME_URL } = ResourcesConstants;
export const { WWW_URL } = ResourcesConstants;
export const { SENTRY_DSN } = ResourcesConstants;
