import './config/env.config';
import 'newrelic';
import { init } from '@sentry/nestjs';
import { version } from '../package.json';

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
    ignoreErrors: ['Non-Error exception captured'],
  });
}
