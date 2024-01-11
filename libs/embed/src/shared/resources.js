let resourcesConstants;

if (process.env.ENVIRONMENT === 'production') {
  resourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'https://widget.novu.co',
    WWW_URL: process.env.WIDGET_URL || 'https://widget.novu.co',
    SENTRY_DSN: 'https://bcadda4b593d454797a1260e094f0c5d@o1161119.ingest.sentry.io/6252448',
  };
} else if (process.env.ENVIRONMENT === 'dev') {
  resourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'https://dev.widget.novu.co',
    WWW_URL: process.env.WIDGET_URL || 'http://127.0.0.1:3500',
    SENTRY_DSN: '',
  };
} else {
  resourcesConstants = {
    API_URL: '',
    IFRAME_URL: process.env.WIDGET_URL || 'http://127.0.0.1:3500',
    WWW_URL: process.env.WIDGET_URL || 'http://127.0.0.1:3500',
    SENTRY_DSN: '',
  };
}

export const DEBUG = false;
export const { API_URL } = resourcesConstants;
export const { IFRAME_URL } = resourcesConstants;
export const { WWW_URL } = resourcesConstants;
export const { SENTRY_DSN } = resourcesConstants;
