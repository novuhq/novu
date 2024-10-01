import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { init } from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // Add our Profiling integration
      nodeProfilingIntegration(),
    ],

    /*
     * Add Tracing by setting tracesSampleRate
     * We recommend adjusting this value in production
     */
    tracesSampleRate: 1.0,

    /*
     * Set sampling rate for profiling
     * This is relative to tracesSampleRate
     */
    profilesSampleRate: 1.0,
  });
}
