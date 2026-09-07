import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import { MODE, SENTRY_DSN } from '@/config';

export const initializeSentry = () => {
  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        // See docs for support of different versions of variation of react router
        // https://docs.sentry.io/platforms/javascript/guides/react/configuration/integrations/react-router/
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        Sentry.captureConsoleIntegration({
          levels: ['error'],
        }),
        Sentry.browserTracingIntegration(),
        Sentry.browserProfilingIntegration(),
      ],
      environment: MODE,
      ignoreErrors: [
        'Network Error',
        'network error (Error)',
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error exception captured',
        'Non-Error promise rejection captured',
        /validation error/i,
        /bad request/i, // 400
        /unauthorized/i, // 401
        /forbidden/i, // 403
        /not found/i, // 404
        /unprocessable entity/i, // 422
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
      tracePropagationTargets: ['localhost', /^https:\/\/api\.novu\.co/, /^https:\/\/api\.novu-staging\.co/],
      // Set profilesSampleRate to 1.0 to profile every transaction.
      // Since profilesSampleRate is relative to tracesSampleRate,
      // the final profiling rate can be computed as tracesSampleRate * profilesSampleRate
      // For example, a tracesSampleRate of 0.5 and profilesSampleRate of 0.5 would
      // results in 25% of transactions being profiled (0.5*0.5=0.25)
      profilesSampleRate: 1.0,
    });
  }
};
