import { BadRequestException } from '@nestjs/common';
import {
  assertAllowedSinchSmsRegion,
  assertSafeSmtpOutboundTarget,
  EmailProviderIdEnum,
  ICredentials,
  SmsProviderIdEnum,
  SsrfBlockedError,
} from '@novu/shared';

export async function validateOutboundIntegrationCredentials(
  providerId: string,
  credentials?: ICredentials
): Promise<void> {
  if (!credentials) {
    return;
  }

  try {
    if (providerId === EmailProviderIdEnum.CustomSMTP) {
      await assertSafeSmtpOutboundTarget(credentials.host, credentials.port, {
        secure: credentials.secure,
        requireTls: credentials.requireTls,
        ignoreTls: credentials.ignoreTls,
      });
    }

    if (providerId === SmsProviderIdEnum.Sinch) {
      assertAllowedSinchSmsRegion(credentials.region);
    }
  } catch (error) {
    if (error instanceof SsrfBlockedError) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
