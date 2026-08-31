import * as dns from 'node:dns';
import { BadRequestException } from '@nestjs/common';
import { EmailProviderIdEnum, PushProviderIdEnum, SmsProviderIdEnum, ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { validateOutboundIntegrationCredentials } from './validate-outbound-integration-credentials';

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
    stub(dns.promises, 'lookup').callsFake(((hostname: string) => {
      const address = hostname === 'private.example.test' ? '10.0.0.5' : '93.184.216.34';

      return Promise.resolve([{ address, family: 4 }]);
    }) as never);
  });

  afterEach(() => {
    restore();
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
});
