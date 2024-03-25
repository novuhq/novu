import { library } from '@fortawesome/fontawesome-svg-core';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { applyToken, getToken } from '@novu/shared-web';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { ENV, SENTRY_DSN } from './config';

/**
 * Handles all initialization steps of the app.
 *
 * This should be called only once in index.tsx as most things must be loaded when setting up the providers.
 */
export const initializeApp = () => {
  library.add(far, fas);

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        new Integrations.BrowserTracing(),
        new Sentry.Replay({
          // Additional SDK configuration goes in here, for example:
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      environment: ENV,
      ignoreErrors: [
        'Network Error',
        'network error (Error)',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error exception captured',
        'Non-Error promise rejection captured',
      ],
      /*
       * This sets the sample rate to be 10%. You may want this to be 100% while
       * in development and sample at a lower rate in production
       */
      replaysSessionSampleRate: 0.5,

      /*
       * If the entire session is not sampled, use the below sample rate to sample
       * sessions when an error occurs.
       */
      replaysOnErrorSampleRate: 1.0,

      /*
       * Set tracesSampleRate to 1.0 to capture 100%
       * of transactions for performance monitoring.
       * We recommend adjusting this value in production
       */
      tracesSampleRate: 1.0,
      beforeSend(event: Sentry.Event) {
        return event;
      },
    });
  }

  const tokenStoredToken: string = getToken();

  applyToken(tokenStoredToken);
};
