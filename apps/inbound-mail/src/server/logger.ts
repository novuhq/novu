import { env } from '@novu/application-generic';
import pino from 'pino';

const logger = pino<'verbose'>({
  level: env.LOG_LEVEL,
  customLevels: { verbose: 25 },
  base: { service: '@novu/inbound-mail' },
});

export default logger;
