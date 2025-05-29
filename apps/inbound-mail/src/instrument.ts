import { init } from '@sentry/nestjs';
import { version } from '../package.json';

if (process.env.SENTRY_DSN) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
    ignoreErrors: ['Non-Error exception captured'],
  });
}
