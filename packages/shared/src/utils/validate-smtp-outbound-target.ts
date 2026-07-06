import { isIP } from 'node:net';
import {
  assertSafeOutboundUrl,
  isPrivateIp,
  normalizeHostnameForLookup,
  resolvePublicAddresses,
  SsrfBlockedError,
} from './ssrf-url-validation';

export { SsrfBlockedError };

const UNSAFE_SMTP_HOST_PATTERN = /[\s/\\#?@&=:;%]/;

export type SmtpOutboundTlsOptions = {
  secure?: boolean;
  requireTls?: boolean;
  ignoreTls?: boolean;
};

export function assertSmtpTlsRequired(options: SmtpOutboundTlsOptions): void {
  if (options.ignoreTls) {
    throw new SsrfBlockedError('UNSUPPORTED_SCHEME', 'SMTP connections with TLS disabled are not allowed.');
  }

  if (!options.secure && !options.requireTls) {
    throw new SsrfBlockedError('UNSUPPORTED_SCHEME', 'SMTP connections must use TLS (enable Secure or Require TLS).');
  }
}

export function assertSafeSmtpHostFormat(host: string | undefined): string {
  const trimmed = host?.trim();

  if (!trimmed) {
    throw new SsrfBlockedError('INVALID_URL', 'SMTP host is required.');
  }

  if (UNSAFE_SMTP_HOST_PATTERN.test(trimmed)) {
    throw new SsrfBlockedError('INVALID_URL', 'SMTP host contains invalid characters.');
  }

  const normalized = normalizeHostnameForLookup(trimmed);

  assertSafeOutboundUrl(`https://${normalized}`);

  const literalFamily = isIP(normalized);

  if (literalFamily !== 0 && isPrivateIp(normalized)) {
    throw new SsrfBlockedError(
      'PRIVATE_IP',
      `Requests to private or reserved IP addresses are not allowed (resolved: ${normalized}).`,
      { hostname: normalized, resolvedAddress: normalized }
    );
  }

  return normalized;
}

export function assertSafeSmtpPort(port: number | string | undefined): number {
  const parsed = Number(port);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new SsrfBlockedError('INVALID_URL', 'SMTP port must be an integer between 1 and 65535.');
  }

  return parsed;
}

export function assertSafeSmtpOutboundTargetSync(
  host: string | undefined,
  port: number | string | undefined,
  tlsOptions: SmtpOutboundTlsOptions
): void {
  assertSmtpTlsRequired(tlsOptions);
  assertSafeSmtpHostFormat(host);
  assertSafeSmtpPort(port);
}

export type SafeSmtpPinnedTarget = {
  hostname: string;
  address: string;
  port: number;
};

export async function resolveSafeSmtpPinnedTarget(
  host: string | undefined,
  port: number | string | undefined,
  tlsOptions: SmtpOutboundTlsOptions
): Promise<SafeSmtpPinnedTarget> {
  assertSmtpTlsRequired(tlsOptions);

  const hostname = assertSafeSmtpHostFormat(host);
  const parsedPort = assertSafeSmtpPort(port);
  const addresses = await resolvePublicAddresses(hostname);
  const chosen = addresses[0];

  if (!chosen) {
    throw new SsrfBlockedError('DNS_LOOKUP_FAILED', `Unable to resolve hostname "${hostname}".`, { hostname });
  }

  return {
    hostname,
    address: chosen.address,
    port: parsedPort,
  };
}

export async function assertSafeSmtpOutboundTarget(
  host: string | undefined,
  port: number | string | undefined,
  tlsOptions: SmtpOutboundTlsOptions
): Promise<void> {
  await resolveSafeSmtpPinnedTarget(host, port, tlsOptions);
}
