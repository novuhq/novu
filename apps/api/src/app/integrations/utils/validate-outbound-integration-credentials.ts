import { BadRequestException } from '@nestjs/common';
import { resolveSafeInfobipBaseUrl, resolveSafeProviderUrl } from '@novu/providers';
import {
  assertAllowedSinchSmsRegion,
  EmailProviderIdEnum,
  ICredentials,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

type ValidateSmtpOutboundTargetModule = typeof import('@novu/shared/dist/cjs/utils/validate-smtp-outbound-target');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { assertSafeSmtpOutboundTargetSync } =
  require('@novu/shared/utils/validate-smtp-outbound-target') as ValidateSmtpOutboundTargetModule;

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
