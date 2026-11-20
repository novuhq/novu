import { BadRequestException } from '@nestjs/common';
import { resolveSafeInfobipBaseUrl, resolveSafeProviderUrl } from '@novu/providers';
import {
  assertAllowedSinchSmsRegion,
  EmailProviderIdEnum,
  ICredentials,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  ToolProviderIdEnum,
} from '@novu/shared';
import {
  assertSafeOutboundUrl,
  normalizeOutboundHttpUrl,
  resolvePublicAddresses,
  SsrfBlockedError,
} from '@novu/shared/utils/ssrf-url-validation';
import { assertSafeSmtpOutboundTargetSync } from '@novu/shared/utils/validate-smtp-outbound-target';

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

async function assertSafeWebhookDestinations(providerId: string, credentials: ICredentials): Promise<void> {
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

    await assertSafeWebhookDestinations(providerId, credentials);

    if (
      providerId === SmsProviderIdEnum.Twilio &&
      credentials.authMethod === 'apiKey' &&
      (!credentials.apiKey || !credentials.secretKey)
    ) {
      throw new Error('Twilio API key authentication requires apiKey (API Key SID) and secretKey (API Key Secret).');
    }

    if (providerId === EmailProviderIdEnum.Infobip) {
      resolveSafeInfobipBaseUrl(credentials.baseUrl);
    }

    if (providerId === EmailProviderIdEnum.Braze) {
      resolveSafeProviderUrl(credentials.apiURL, {
        blockedPrefix: 'Braze API URL blocked',
        isHostnameAllowed: (hostname) => /^rest\.[a-z0-9-]+\.braze\.(com|eu)$/.test(hostname),
        requireHttps: true,
      });
    }

    if (providerId === EmailProviderIdEnum.Mailgun) {
      resolveSafeProviderUrl(credentials.baseUrl || 'https://api.mailgun.net', {
        allowedHostnames: ['api.mailgun.net', 'api.eu.mailgun.net'],
        blockedPrefix: 'Mailgun base URL blocked',
        requireHttps: true,
      });
    }

    if (providerId === SmsProviderIdEnum.SmsCentral) {
      resolveSafeProviderUrl(credentials.baseUrl || 'https://my.smscentral.com.au/api/v3.2', {
        blockedPrefix: 'SMS Central base URL blocked',
      });
    }

    if (providerId === SmsProviderIdEnum.Mobishastra) {
      resolveSafeProviderUrl(credentials.baseUrl, {
        blockedPrefix: 'Mobishastra base URL blocked',
      });
    }

    if (providerId === SmsProviderIdEnum.Kannel) {
      resolveSafeProviderUrl(`http://${credentials.host}:${credentials.port}/cgi-bin`, {
        blockedPrefix: 'Kannel host blocked',
      });
    }

    if (providerId === PushProviderIdEnum.AppIO) {
      resolveSafeProviderUrl(credentials.AppIOBaseUrl || 'https://api.io.italia.it/api/v1', {
        allowedHostnames: ['api.io.italia.it'],
        blockedPrefix: 'AppIO base URL blocked',
        requireHttps: true,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
