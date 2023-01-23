import * as _ from 'lodash';
import util from 'util';
import * as winston from 'winston';

const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      colorize: true,
      prettyPrint: true,
    }),
  ],
});

/*
 * Parameter level is one of 'silly', 'verbose', 'debug', 'info', 'warn',
 * 'error'.
 *
 */
logger.setLevel = function (level) {
  if (['silly', 'verbose', 'debug', 'info', 'warn', 'error'].indexOf(level) === -1) {
    logger.error('Unable to set logging level to unknown level "' + level + '".');
  } else {
    /*
     * Verbose and debug have not exactly the same semantic in Mailin and
     * Winston, so handle that.
     */
    if (logger.transports.console.level === 'verbose' && level === 'debug') {
      return;
    }

    logger.transports.console.level = level;

    if (logger.transports.file) logger.transports.file.level = level;
  }
};

logger._error = logger.error;
logger.error = function (err) {
  if (err.stack) {
    this._error(err.stack);
  } else if (!_.isString(err)) {
    this._error(
      util.inspect(err, {
        depth: 5,
      })
    );
  } else {
    // eslint-disable-next-line prefer-spread,prefer-rest-params
    this._error.apply(this, arguments);
  }
};

export default logger;
