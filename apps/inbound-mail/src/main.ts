// Source is taken from the un-maintained https://github.com/Flolagale/mailin and refactored

// Deep-path import (not the package barrel) so hydrating secrets doesn't evaluate
// @novu/application-generic before config/env.config and OTEL instrumentation run.
import { runWithHydratedSecrets } from '@novu/application-generic/build/main/services/secrets-manager';

const LOG_CONTEXT = 'Main';

void runWithHydratedSecrets(async () => {
  await import('./config/env.config');
  await import('./instrument');
  const { default: mailin } = await import('./server/index');
  const { default: logger } = await import('./server/logger');

  const { env } = process;

  mailin.start(
    {
      port: env.PORT || 25,
      host: env.HOST || '0.0.0.0',
      disableDkim: env.disableDkim,
      disableSpf: env.disableSpf,
      disableSpamScore: env.disableSpamScore,
      verbose: env.verbose,
      debug: env.debug,
      profile: env.profile,
      disableDNSValidation: !env.enableDnsValidation,
      smtpOptions: env.smtpOptions,
    },
    (err) => {
      if (err) {
        logger.error({ err, context: LOG_CONTEXT }, 'Failed to start mailin');
        process.exit(1);
      }

      if (mailin.configuration.disableDkim) logger.info({ context: LOG_CONTEXT }, 'Dkim checking is disabled');
      if (mailin.configuration.disableSpf) logger.info({ context: LOG_CONTEXT }, 'Spf checking is disabled');
      if (mailin.configuration.disableSpamScore)
        logger.info({ context: LOG_CONTEXT }, 'Spam score computation is disabled');
    }
  );
});
