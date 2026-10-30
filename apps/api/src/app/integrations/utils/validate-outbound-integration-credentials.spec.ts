import { BadRequestException } from '@nestjs/common';
import { EmailProviderIdEnum, PushProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { validateOutboundIntegrationCredentials } from './validate-outbound-integration-credentials';

const ORIGINAL_CI_EE_TEST = process.env.CI_EE_TEST;
const ORIGINAL_SELF_HOSTED = process.env.IS_SELF_HOSTED;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}

describe('validateOutboundIntegrationCredentials', () => {
  beforeEach(() => {
    process.env.CI_EE_TEST = 'true';
    process.env.IS_SELF_HOSTED = 'false';
  });

  afterEach(() => {
    restoreEnv('CI_EE_TEST', ORIGINAL_CI_EE_TEST);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
  });

  const privateTargetCases = [
    [EmailProviderIdEnum.Infobip, { baseUrl: 'http://127.0.0.1:3000' }],
    [EmailProviderIdEnum.Braze, { apiURL: 'http://127.0.0.1:3000' }],
    [EmailProviderIdEnum.Mailgun, { baseUrl: 'http://127.0.0.1:3000' }],
    [SmsProviderIdEnum.SmsCentral, { baseUrl: 'http://127.0.0.1:3000' }],
    [SmsProviderIdEnum.Mobishastra, { baseUrl: 'http://127.0.0.1:3000' }],
    [SmsProviderIdEnum.Kannel, { host: '127.0.0.1', port: '3000' }],
    [PushProviderIdEnum.AppIO, { AppIOBaseUrl: 'http://127.0.0.1:3000' }],
  ] as const;

  for (const [providerId, credentials] of privateTargetCases) {
    it(`blocks a private ${providerId} target on Cloud`, async () => {
      let error: Error | undefined;

      try {
        await validateOutboundIntegrationCredentials(providerId, credentials);
      } catch (caughtError) {
        error = caughtError as Error;
      }

      expect(error?.message).to.match(/blocked|not allowed/i);
    });
  }

  it('blocks a private custom SMTP target on Cloud', async () => {
    let error: Error | undefined;

    try {
      await validateOutboundIntegrationCredentials(EmailProviderIdEnum.CustomSMTP, {
        host: '127.0.0.1',
        port: '587',
      });
    } catch (caughtError) {
      error = caughtError as Error;
    }

    expect(error).to.be.instanceOf(BadRequestException);
    expect(error?.message).to.match(/not allowed/i);
  });

  it('blocks a private custom SMTP target for self-hosted deployments', async () => {
    process.env.IS_SELF_HOSTED = 'true';

    let error: Error | undefined;

    try {
      await validateOutboundIntegrationCredentials(EmailProviderIdEnum.CustomSMTP, {
        host: '10.0.0.1',
        port: '587',
      });
    } catch (caughtError) {
      error = caughtError as Error;
    }

    expect(error).to.be.instanceOf(BadRequestException);
    expect(error?.message).to.match(/not allowed/i);
  });

  it('allows a public custom SMTP host', async () => {
    await validateOutboundIntegrationCredentials(EmailProviderIdEnum.CustomSMTP, {
      host: 'smtp.example.com',
      port: '587',
    });
  });

  it('preserves private Kannel targets for self-hosted deployments', async () => {
    process.env.IS_SELF_HOSTED = 'true';

    await validateOutboundIntegrationCredentials(SmsProviderIdEnum.Kannel, {
      host: '10.0.0.1',
      port: '13013',
    });
  });
});
