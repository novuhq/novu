import pino from 'pino';

const logger = pino<'verbose'>({
  level: process.env.LOG_LEVEL ?? 'info',
  customLevels: { verbose: 25 },
  base: { service: '@novu/inbound-mail' },
});

export default logger;
