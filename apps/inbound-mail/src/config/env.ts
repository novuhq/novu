import { createAppEnv } from '@novu/application-generic';

/**
 * Variables only inbound-mail reads, added to the shared ones in
 * libs/application-generic/src/config/env.schema.ts. Read both with `env.X` from this file.
 */
export const { env, warnDeprecatedEnv } = createAppEnv({
  HOST: {
    default: '0.0.0.0',
    description: 'Interface the SMTP server binds to.',
  },
  INBOUND_ATTACHMENT_URL_TTL_SECONDS: {
    type: 'number',
    description:
      'Lifetime of presigned inbound attachment URLs, capped at the S3 maximum. Unset uses the built-in TTL.',
  },
  INBOUND_FAIL_ON_ATTACHMENT_UPLOAD_ERROR: {
    type: 'boolean',
    description:
      'Answers SMTP 451 when an attachment fails to upload to S3, so the sender retries, instead of embedding it inline.',
  },
  PATH: {
    description: 'System PATH. Only logged, to debug a missing Python binary for DKIM and SPF checks.',
  },

  // Legacy mailin options, passed through as strings.
  debug: { description: 'mailin debug option.' },
  disableDkim: { description: 'mailin option that turns DKIM checks off.' },
  disableSpamScore: { description: 'mailin option that turns spam scoring off.' },
  disableSpf: { description: 'mailin option that turns SPF checks off.' },
  enableDnsValidation: { description: 'mailin option. DNS validation of senders is off unless this is set.' },
  profile: { description: 'mailin profile option.' },
  smtpOptions: { description: 'mailin SMTP server options.' },
  verbose: { description: 'mailin verbose option.' },
});
