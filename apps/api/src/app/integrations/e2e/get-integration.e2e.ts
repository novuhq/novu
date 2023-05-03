import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { ChannelTypeEnum } from '@novu/shared';

describe('Get Integrations - /integrations (GET)', function () {
  let session: UserSession;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get newly created integration', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    expect(integrations.length).to.equal(5);

    const integration = integrations.find((integrationItem) => integrationItem.channel === 'email');

    expect(integration.providerId).to.equal('sendgrid');
    expect(integration.channel).to.equal(ChannelTypeEnum.EMAIL);
    expect(integration.credentials.apiKey).to.equal('SG.123');
    expect(integration.credentials.secretKey).to.equal('abc');
    expect(integration.active).to.equal(true);
  });

  it('should get custom SMTP integration details with TLS options', async function () {
    const nodeMailerProviderPayload = {
      providerId: 'nodemailer',
      channel: 'email',
      credentials: {
        host: 'smtp.example.com',
        port: '587',
        secure: 'true',
        requireTls: true,
        tlsOptions: { rejectUnauthorized: false },
      },
      active: true,
      check: false,
    };

    // create nodemailer integration
    await session.testAgent.post('/v1/integrations').send(nodeMailerProviderPayload);

    const activeIntegrations = (await session.testAgent.get(`/v1/integrations/active`)).body.data;

    const activeEmailIntegration = activeIntegrations.find(
      (integration) => integration.channel == ChannelTypeEnum.EMAIL
    );

    expect(activeEmailIntegration?.credentials?.host).to.equal(nodeMailerProviderPayload.credentials.host);
    expect(activeEmailIntegration?.credentials?.port).to.equal(nodeMailerProviderPayload.credentials.port);
    expect(activeEmailIntegration?.credentials?.secure).to.equal(nodeMailerProviderPayload.credentials.secure);
    expect(activeEmailIntegration?.credentials?.requireTls).to.equal(nodeMailerProviderPayload.credentials.requireTls);
    expect(activeEmailIntegration?.credentials?.tlsOptions).to.instanceOf(Object);
    expect(activeEmailIntegration?.credentials?.tlsOptions).to.eql(nodeMailerProviderPayload.credentials.tlsOptions);
    expect(activeEmailIntegration?.active).to.equal(true);
  });
});
