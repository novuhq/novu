import { BadRequestException } from '@nestjs/common';
import { ChannelTypeEnum, SmsProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { assertInfobipSmsCredentials } from '@novu/application-generic';

describe('assertInfobipSmsCredentials', () => {
  it('accepts valid Infobip SMS credentials', () => {
    expect(() =>
      assertInfobipSmsCredentials({
        providerId: SmsProviderIdEnum.Infobip,
        channel: ChannelTypeEnum.SMS,
        credentials: { baseUrl: 'https://abc123.api.infobip.com', apiKey: 'key' },
      })
    ).not.to.throw();
  });

  it('rejects missing baseUrl during configuration', () => {
    expect(() =>
      assertInfobipSmsCredentials({
        providerId: SmsProviderIdEnum.Infobip,
        channel: ChannelTypeEnum.SMS,
        credentials: { apiKey: 'key' },
      })
    ).to.throw(BadRequestException, /Base URL is required/);
  });

  it('ignores non-Infobip providers', () => {
    expect(() =>
      assertInfobipSmsCredentials({
        providerId: SmsProviderIdEnum.Twilio,
        channel: ChannelTypeEnum.SMS,
        credentials: { apiKey: 'key' },
      })
    ).not.to.throw();
  });
});
