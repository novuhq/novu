import * as dns from 'node:dns';
import { BadRequestException } from '@nestjs/common';
import { EmailProviderIdEnum, PushProviderIdEnum, SmsProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { validateOutboundIntegrationCredentials } from './validate-outbound-integration-credentials';

const ORIGINAL_CI_EE_TEST = process.env.CI_EE_TEST;
const ORIGINAL_SELF_HOSTED = process.env.IS_SELF_HOSTED;
const ORIGINAL_TEST_ALLOW_IPS = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];

    return;
  }

  process.env[name] = value;
}

async function expectRejection(promise: Promise<void>, messagePart: string): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected validation to reject with "${messagePart}"`);
  } catch (error) {
    expect(error).to.be.instanceOf(BadRequestException);
    expect((error as BadRequestException).message).to.contain(messagePart);
  }
}

describe('validateOutboundIntegrationCredentials', () => {
  beforeEach(() => {
    process.env.CI_EE_TEST = 'true';
    process.env.IS_SELF_HOSTED = 'false';
    // .env.test allows loopback for e2e fixtures; Cloud never sets this.
    delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
    stub(dns.promises, 'lookup').callsFake(((hostname: string) => {
      const address = hostname === 'private.example.test' ? '10.0.0.5' : '93.184.216.34';

      return Promise.resolve([{ address, family: 4 }]);
    }) as never);
  });

  afterEach(() => {
    restore();
    restoreEnv('CI_EE_TEST', ORIGINAL_CI_EE_TEST);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
    restoreEnv('NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS', ORIGINAL_TEST_ALLOW_IPS);
  });

  it('should reject an email webhook URL pointing at the cloud metadata endpoint', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(EmailProviderIdEnum.EmailWebhook, {
        webhookUrl: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/novu',
      }),
      'Webhook URL is not allowed'
    );
  });

  it('should reject an email webhook URL pointing at loopback', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(EmailProviderIdEnum.EmailWebhook, {
        webhookUrl: 'http://127.0.0.1:6379/',
      }),
      'Webhook URL is not allowed'
    );
  });

  it('should reject a non-http scheme', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(EmailProviderIdEnum.EmailWebhook, {
        webhookUrl: 'file:///etc/passwd',
      }),
      'Webhook URL is not a valid http(s) URL.'
    );
  });

  it('should reject a generic SMS base URL pointing at a private network', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(SmsProviderIdEnum.GenericSms, {
        baseUrl: 'http://10.0.0.5/send',
        apiKeyRequestHeader: 'apiKey',
        apiKey: 'key',
      }),
      'Base URL is not allowed'
    );
  });

  it('should reject a generic SMS auth URL pointing at a private network', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(SmsProviderIdEnum.GenericSms, {
        baseUrl: 'https://sms.example.com/send',
        domain: 'http://192.168.1.10/auth',
        authenticateByToken: true,
      }),
      'Auth URL is not allowed'
    );
  });

  it('should ignore a generic SMS auth URL when token authentication is disabled', async () => {
    await validateOutboundIntegrationCredentials(SmsProviderIdEnum.GenericSms, {
      baseUrl: 'https://sms.example.com/send',
      domain: 'http://192.168.1.10/auth',
      authenticateByToken: false,
    });
  });

  it('should reject a hostname that resolves to a private network', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(EmailProviderIdEnum.EmailWebhook, {
        webhookUrl: 'https://private.example.test/novu',
      }),
      'Webhook URL is not allowed'
    );
  });

  it('should reject a push webhook URL pointing at loopback', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(PushProviderIdEnum.PushWebhook, {
        webhookUrl: 'http://localhost:8080/hook',
      }),
      'Webhook URL is not allowed'
    );
  });

  it('should reject a tool webhook URL pointing at loopback', async () => {
    await expectRejection(
      validateOutboundIntegrationCredentials(ToolProviderIdEnum.Webhook, {
        webhookUrl: 'http://127.0.0.1:8080/hook',
      }),
      'Webhook URL is not allowed'
    );
  });

  it('should accept public destinations', async () => {
    await validateOutboundIntegrationCredentials(EmailProviderIdEnum.EmailWebhook, {
      webhookUrl: 'https://hooks.example.com/novu',
    });

    await validateOutboundIntegrationCredentials(SmsProviderIdEnum.GenericSms, {
      baseUrl: 'https://sms.example.com/send',
      domain: 'https://sms.example.com/auth',
      authenticateByToken: true,
    });
  });

  it('should skip URL validation for providers without an operator-supplied destination', async () => {
    await validateOutboundIntegrationCredentials(EmailProviderIdEnum.SendGrid, {
      apiKey: 'key',
      from: 'sender@example.com',
    });
  });

  it('should skip validation when the destination is not set', async () => {
    await validateOutboundIntegrationCredentials(ToolProviderIdEnum.Webhook, {
      webhookUrl: '',
    });
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
