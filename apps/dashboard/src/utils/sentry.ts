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

        /Load failed/i,
        /NetworkError when attempting to fetch/i,
        /Failed to fetch/i,
        /Fetch error: Failed to fetch/i,
        /AbortError/i,
        /signal is aborted without reason/i,
        /The user aborted a request/i,
        /Promise was rejected because the browsing context is going away/i,
        /Failed to load Clerk/i,
        /Blocked by AdGuard/i,
        /Chat API Error/i,
        /Plain - Failed to parse chat init configuration/i,
        /Failed to get chat app configuration/i,
        /Content flagged as inappropriate/i,
        /The string did not match the expected pattern/i,
        /Failed to fetch dynamically imported module/i,
        /Decorations that replace line breaks may not be specified via plugins/i,
        /Maximum update depth exceeded/i,
        /Failed to execute 'removeChild' on 'Node'/i,
        /Failed to execute 'insertBefore' on 'Node'/i,
        /Failed to execute 'replaceChild' on 'Node'/i,
        /The object can not be found here/i,
        /CAPTCHA failed to load/i,
        /InvalidCharacterError.*atob/i,
        /URI malformed/i,
        /NotReadableError.*I\/O read operation failed/i,
        /QuotaExceededError/i,
        /SecurityError.*localStorage/i,
        /Workflow limit exceeded/i,
        /Integration with identifier already exists/i,
        /Subscriber with id .* already exists/i,
      ],
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
        /^safari-extension:\/\//i,
        /chat\.plain\.com/i,
        /cdn\.segment\.com/i,
        /cdn\.mxpnl\.com/i,
        /mixpanel\.com/i,
        /clerk\.dashboard\.novu\.co/i,
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
