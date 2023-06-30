import { IntegrationRepository, IntegrationEntity } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';

describe('Create Integration - /integration (POST)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should create the email integration successfully', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const emailIntegrations = integrations.filter(
      (searchIntegration) => searchIntegration.channel === ChannelTypeEnum.EMAIL
    );

    expect(emailIntegrations.length).to.eql(2);

    for (const emailIntegration of emailIntegrations) {
      expect(emailIntegration.providerId).to.equal(EmailProviderIdEnum.SendGrid);
      expect(emailIntegration.channel).to.equal(ChannelTypeEnum.EMAIL);
      expect(emailIntegration.credentials.apiKey).to.equal('SG.123');
      expect(emailIntegration.credentials.secretKey).to.equal('abc');
      expect(emailIntegration.active).to.equal(true);
    }
  });

  it('should create the sms integration successfully', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const smsIntegrations = integrations.filter(
      (searchIntegration) => searchIntegration.channel === ChannelTypeEnum.SMS
    );

    expect(smsIntegrations.length).to.eql(2);

    for (const smsIntegration of smsIntegrations) {
      expect(smsIntegration.providerId).to.equal(SmsProviderIdEnum.Twilio);
      expect(smsIntegration.channel).to.equal(ChannelTypeEnum.SMS);
      expect(smsIntegration.credentials.accountSid).to.equal('AC123');
      expect(smsIntegration.credentials.token).to.equal('123');
      expect(smsIntegration.active).to.equal(true);
    }
  });

  it('should return error on creation of same provider on same environment twice', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'email',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const secondInsertResponse = await insertIntegrationTwice(session, payload, false);

    expect(secondInsertResponse.body.message).to.contain('Duplicate key');
  });

  it('should fail due missing param', async function () {
    const payload = {
      providerId: 'sendgrid',
      channel: 'email',
      active: true,
      check: false,
    };

    const body = (await session.testAgent.post('/v1/integrations').send(payload)).body.data as IntegrationEntity;

    expect(body).to.equal(undefined);
  });

  it('should deactivated old providers', async function () {
    const payload = {
      providerId: 'mailgun',
      channel: 'email',
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    const environmentId = (await session.testAgent.get(`/v1/integrations`)).body.data[0]._environmentId;

    await session.testAgent.post('/v1/integrations').send(payload);

    const integrations = await integrationRepository.findByEnvironmentId(environmentId);

    const firstIntegration = integrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.SendGrid && i._environmentId === session.environment._id
    );
    const secondIntegration = integrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.Mailgun && i._environmentId === session.environment._id
    );

    expect(firstIntegration?.active).to.equal(false);
    expect(secondIntegration?.active).to.equal(true);
  });

  it('should create custom SMTP integration with TLS options successfully', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.CustomSMTP,
      channel: ChannelTypeEnum.EMAIL,
      credentials: {
        host: 'smtp.example.com',
        port: '587',
        secure: true,
        requireTls: true,
        tlsOptions: { rejectUnauthorized: false },
      },
      active: true,
      check: false,
    };

    const environmentId = (await session.testAgent.get(`/v1/integrations`)).body.data[0]._environmentId;

    await session.testAgent.post('/v1/integrations').send(payload);

    const integrations = await integrationRepository.findByEnvironmentId(environmentId);

    const sendGridIntegration = integrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.SendGrid && i._environmentId === session.environment._id
    );
    const nodeMailerIntegration = integrations.find(
      (i) => i.providerId.toString() === EmailProviderIdEnum.CustomSMTP && i._environmentId === session.environment._id
    );

    expect(sendGridIntegration?.active).to.equal(false);
    expect(nodeMailerIntegration?.credentials?.host).to.equal(payload.credentials.host);
    expect(nodeMailerIntegration?.credentials?.port).to.equal(payload.credentials.port);
    expect(nodeMailerIntegration?.credentials?.secure).to.equal(payload.credentials.secure);
    expect(nodeMailerIntegration?.credentials?.requireTls).to.equal(payload.credentials.requireTls);
    expect(nodeMailerIntegration?.credentials?.tlsOptions).to.instanceOf(Object);
    expect(nodeMailerIntegration?.credentials?.tlsOptions).to.eql(payload.credentials.tlsOptions);
    expect(nodeMailerIntegration?.active).to.equal(true);
  });
});

async function insertIntegrationTwice(
  session: UserSession,
  payload: { credentials: { apiKey: string; secretKey: string }; providerId: string; channel: string; active: boolean },
  createDiffChannels: boolean
) {
  await session.testAgent.post('/v1/integrations').send(payload);

  if (createDiffChannels) {
    // eslint-disable-next-line no-param-reassign
    payload.channel = ChannelTypeEnum.SMS;
  }

  return await session.testAgent.post('/v1/integrations').send(payload);
}
