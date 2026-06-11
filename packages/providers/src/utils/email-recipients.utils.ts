import type { IEmailOptions } from '@novu/stateless';

type EmailRecipientOptions = Pick<IEmailOptions, 'to' | 'cc' | 'bcc' | 'from' | 'headers'>;

export function resolveProviderToRecipients(options: EmailRecipientOptions): {
  to: string[];
  headers: Record<string, string>;
} {
  const headers = { ...(options.headers ?? {}) };

  if (options.to.length > 0) {
    return { to: options.to, headers };
  }

  const hasCcOrBcc = Boolean(options.cc?.length) || Boolean(options.bcc?.length);

  if (!hasCcOrBcc || !options.from) {
    return { to: options.to, headers };
  }

  return {
    to: [options.from],
    headers,
  };
}
