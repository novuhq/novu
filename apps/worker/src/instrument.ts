import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { init } from '@sentry/nestjs';
import packageJson from '../package.json';

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${packageJson.version}`,
    ignoreErrors: ['Non-Error exception captured'],
    integrations: [nodeProfilingIntegration()],
  });
}
