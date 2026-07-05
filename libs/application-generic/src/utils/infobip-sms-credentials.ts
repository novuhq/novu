import { BadRequestException } from '@nestjs/common';
import { resolveSafeInfobipBaseUrl } from '@novu/providers';
import { ChannelTypeEnum, ICredentials, SmsProviderIdEnum } from '@novu/shared';

const MISCONFIGURED_PREFIX = 'Infobip SMS integration is misconfigured';

export function isInfobipSmsBaseUrlValid(baseUrl?: string): boolean {
  try {
    resolveSafeInfobipBaseUrl(baseUrl);

    return true;
  } catch {
    return false;
  }
}

export function resolveInfobipSmsBaseUrl(baseUrl?: string): string {
  try {
    return resolveSafeInfobipBaseUrl(baseUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    throw new Error(`${MISCONFIGURED_PREFIX}: ${message} Update the integration Base URL in the dashboard.`);
  }
}

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
