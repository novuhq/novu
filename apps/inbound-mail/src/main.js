// Source is taken from the un-maintained https://github.com/Flolagale/mailin and refactored

const mailin = require('./server/index');

mailin.start(
  {
    port: program.port || 25,
    host: program.host || '0.0.0.0',
    webhook: program.webhook || 'http://localhost:3000/webhook',
    logFile: program.logFile || '/var/log/mailin.log',
    disableDkim: program.disableDkim,
    disableSpf: program.disableSpf,
    disableSpamScore: program.disableSpamScore,
    verbose: program.verbose,
    debug: program.debug,
    profile: program.profile,
    disableDNSValidation: !program.enableDnsValidation,
    smtpOptions: smtpOptions,
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
