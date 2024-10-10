// Source is taken from the un-maintained https://github.com/Flolagale/mailin and refactored

import './config/env.config';
import './instrument';
import mailin from './server/index';
import logger from './server/logger';

const LOG_CONTEXT = 'Main';

const { env } = process;

export default mailin.start(
  {
    port: env.PORT || 25,
    host: env.HOST || '127.0.0.1',
    disableDkim: env.disableDkim,
    disableSpf: env.disableSpf,
    disableSpamScore: env.disableSpamScore,
    verbose: env.verbose,
    debug: env.debug,
    profile: env.profile,
    disableDNSValidation: !env.enableDnsValidation,
    smtpOptions: env.smtpOptions,
  },
  function (err) {
    if (err) process.exit(1);

    if (mailin.configuration.disableDkim) logger.info('Dkim checking is disabled');
    if (mailin.configuration.disableSpf) logger.info('Spf checking is disabled');
    if (mailin.configuration.disableSpamScore) logger.info('Spam score computation is disabled');
  }
);
