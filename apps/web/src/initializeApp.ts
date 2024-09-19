import { library } from '@fortawesome/fontawesome-svg-core';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { init, Replay, type Event } from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { ENV, NOVU_GTM_ID, SENTRY_DSN } from './config';
import TagManager from 'react-gtm-module';

/**
 * Handles all initialization steps of the app.
 *
 * This should be called only once in index.tsx as most things must be loaded when setting up the providers.
 */
export const initializeApp = () => {
  library.add(far, fas);

  if (NOVU_GTM_ID) {
    TagManager.initialize({ gtmId: NOVU_GTM_ID });
  }

  if (SENTRY_DSN) {
    init({
      dsn: SENTRY_DSN,
      integrations: [
        new Integrations.BrowserTracing(),
        new Replay({
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
      beforeSend(event: Event) {
        return event;
      },
    });
  }
};
