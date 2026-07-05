import { BadRequestException } from '@nestjs/common';
import { resolveSafeInfobipBaseUrl } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';

export function assertInfobipSmsCredentials({
  providerId,
  channel,
  credentials,
}: {
  providerId: string;
  channel?: ChannelTypeEnum;
  credentials?: ICredentials;
}): void {
  if (providerId !== SmsProviderIdEnum.Infobip || channel !== ChannelTypeEnum.SMS) {
    return;
  }

  try {
    resolveSafeInfobipBaseUrl(credentials?.baseUrl);
  } catch (err) {
    throw new BadRequestException(err instanceof Error ? err.message : String(err));
  }
}
