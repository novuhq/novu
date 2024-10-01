import { init } from '@sentry/nestjs';
import { version } from '../package.json';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
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
