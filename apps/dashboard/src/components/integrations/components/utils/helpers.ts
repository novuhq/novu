import { EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

export function isDemoIntegration(providerId: string) {
  return providerId === EmailProviderIdEnum.Novu || providerId === SmsProviderIdEnum.Novu;
}
