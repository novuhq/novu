import { BadRequestException } from '@nestjs/common';
import {
  assertAllowedSinchSmsRegion,
  EmailProviderIdEnum,
  ICredentials,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  ToolProviderIdEnum,
} from '@novu/shared';

type ValidateSmtpOutboundTargetModule = typeof import('@novu/shared/dist/cjs/utils/validate-smtp-outbound-target');
type SsrfUrlValidationModule = typeof import('@novu/shared/dist/cjs/utils/ssrf-url-validation');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertSafeSmtpOutboundTargetSync } =
  require('@novu/shared/utils/validate-smtp-outbound-target') as ValidateSmtpOutboundTargetModule;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertSafeOutboundUrl, normalizeOutboundHttpUrl, resolvePublicAddresses, SsrfBlockedError } =
  require('@novu/shared/utils/ssrf-url-validation') as SsrfUrlValidationModule;

/**
 * Rejects operator-supplied destinations that point at internal infrastructure, so a
 * blocked target fails at save time with a clear error instead of at send time. This
 * mirrors the send-time guard in the providers; internal targets that are legitimately
 * required must be allow-listed via NOVU_SAFE_OUTBOUND_ALLOW.
 */
async function assertSafeCredentialUrl(rawUrl: string | undefined, fieldLabel: string): Promise<void> {
  if (!rawUrl?.trim()) {
    return;
  }

  const url = normalizeOutboundHttpUrl(rawUrl);

  if (!url) {
    throw new Error(`${fieldLabel} is not a valid http(s) URL.`);
  }

  try {
    const parsedUrl = assertSafeOutboundUrl(url);
    await resolvePublicAddresses(parsedUrl.hostname);
  } catch (error) {
    if (error instanceof SsrfBlockedError) {
      throw new Error(`${fieldLabel} is not allowed: ${error.message}`);
    }

    throw error;
  }
}

export async function validateOutboundIntegrationCredentials(
  providerId: string,
  credentials?: ICredentials
): Promise<void> {
  if (!credentials) {
    return;
  }

  try {
    if (providerId === EmailProviderIdEnum.CustomSMTP) {
      assertSafeSmtpOutboundTargetSync(credentials.host, credentials.port, {
        secure: credentials.secure,
        requireTls: credentials.requireTls,
        ignoreTls: credentials.ignoreTls,
      });
    }

    if (providerId === SmsProviderIdEnum.Sinch) {
      assertAllowedSinchSmsRegion(credentials.region);
    }

    if (
      providerId === EmailProviderIdEnum.EmailWebhook ||
      providerId === PushProviderIdEnum.PushWebhook ||
      providerId === ToolProviderIdEnum.Webhook
    ) {
      await assertSafeCredentialUrl(credentials.webhookUrl, 'Webhook URL');
    }

    if (providerId === SmsProviderIdEnum.GenericSms) {
      await assertSafeCredentialUrl(credentials.baseUrl, 'Base URL');

      if (credentials.authenticateByToken) {
        await assertSafeCredentialUrl(credentials.domain, 'Auth URL');
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
