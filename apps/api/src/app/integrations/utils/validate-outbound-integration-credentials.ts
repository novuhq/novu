import { BadRequestException } from '@nestjs/common';
import { assertAllowedSinchSmsRegion, EmailProviderIdEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';

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
  } catch (error) {
    if (error instanceof Error) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
