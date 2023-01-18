// Source is taken from the un-maintained https://github.com/Flolagale/mailin and refactored

import * as dotenv from 'dotenv';
dotenv.config();

import mailin from './server/index';
import * as process from 'process';
import logger from './server/logger';

const env = process.env;

mailin.start(
  {
    port: env.PORT || 25,
    host: env.HOST || '0.0.0.0',
    webhook: env.WEBHOOK || 'http://localhost:3000/webhook',
    logFile: env.logFile || '/var/log/mailin.log',
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

    logger.info('Webhook url: ' + mailin.configuration.webhook);

    if (mailin.configuration.logFile) logger.info('Log file: ' + mailin.configuration.logFile);

    if (mailin.configuration.disableDkim) logger.info('Dkim checking is disabled');
    if (mailin.configuration.disableSpf) logger.info('Spf checking is disabled');
    if (mailin.configuration.disableSpamScore) logger.info('Spam score computation is disabled');
  }
);
