import './config/env.config';

// Import from the tracing subpath, NOT the main barrel. The barrel loads
// @novu/application-generic which transitively pulls in pino/mongoose/ioredis.
// TypeScript hoists all imports — if pino loads before startOtel() registers
// instrumentations, PinoInstrumentation cannot patch the already-bound references.
// Importing only otel-init keeps those modules out of require.cache until after
// the SDK's require()-hooks are in place.
import { startOtel } from '@novu/application-generic/build/main/tracing/otel-init';
import { name, version } from '../package.json';

startOtel(name, version);

// biome-ignore lint: must execute after startOtel() so New Relic layers on top
require('newrelic');

// biome-ignore lint: lazy require so @sentry/nestjs loads after OTEL instrumentations are installed
const { init } = require('@sentry/nestjs');

if (process.env.SENTRY_DSN) {
  init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `v${version}`,
    ignoreErrors: ['Non-Error exception captured', 'timeout reached while waiting for fetchSockets response'],
  });
}
