import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  exitOnError: false,
  level: 'debug',
  transports: [new transports.Console({ format: format.combine(format.prettyPrint()), handleExceptions: true })],
});

export default logger;
