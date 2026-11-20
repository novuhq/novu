import pino from 'pino';
import { env } from '../config/env';

const logger = pino<'verbose'>({
  level: env.LOG_LEVEL,
  customLevels: { verbose: 25 },
  base: { service: '@novu/inbound-mail' },
});

export default logger;
