import { IntegrationRepository, EnvironmentRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  FieldOperatorEnum,
  InAppProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { expect } from 'chai';

describe('Create Integration - /integration (POST)', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const envRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('should get the email integration successfully', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const emailIntegrations: any[] = integrations.filter(
      (searchIntegration) =>
        searchIntegration.channel === ChannelTypeEnum.EMAIL && searchIntegration.providerId !== EmailProviderIdEnum.Novu
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

  it('should get the sms integration successfully', async function () {
    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const smsIntegrations: any[] = integrations.filter(
      (searchIntegration) =>
        searchIntegration.channel === ChannelTypeEnum.SMS && searchIntegration.providerId !== SmsProviderIdEnum.Novu
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

  it('should allow creating the same provider on same environment twice', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      name: EmailProviderIdEnum.SendGrid,
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      credentials: { apiKey: '123', secretKey: 'abc' },
      active: true,
      check: false,
    };

    await insertIntegrationTwice(session, payload, false);

    const integrations = (await session.testAgent.get(`/v1/integrations`)).body.data;

    const sendgridIntegrations = integrations.filter(
      (integration) =>
        integration.channel === payload.channel &&
        integration._environmentId === session.environment._id &&
        integration.providerId === EmailProviderIdEnum.SendGrid
    );

    expect(sendgridIntegrations.length).to.eql(2);

    for (const integration of sendgridIntegrations) {
      expect(integration.name).to.equal(payload.name);
      expect(integration.identifier).to.exist;
      expect(integration.providerId).to.equal(EmailProviderIdEnum.SendGrid);
      expect(integration.channel).to.equal(ChannelTypeEnum.EMAIL);
      expect(integration.credentials.apiKey).to.equal(payload.credentials.apiKey);
      expect(integration.credentials.secretKey).to.equal(payload.credentials.secretKey);
      expect(integration.active).to.equal(payload.active);
    }
  });

  it('should create integration with conditions', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      identifier: 'identifier-conditions',
      active: false,
      check: false,
      conditions: [
        {
          children: [{ field: 'identifier', value: 'test', operator: FieldOperatorEnum.EQUAL, on: 'tenant' }],
        },
      ],
    };

    const { body } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(body.data.conditions.length).to.equal(1);
    expect(body.data.conditions[0].children.length).to.equal(1);
    expect(body.data.conditions[0].children[0].on).to.equal('tenant');
    expect(body.data.conditions[0].children[0].field).to.equal('identifier');
    expect(body.data.conditions[0].children[0].value).to.equal('test');
    expect(body.data.conditions[0].children[0].operator).to.equal('EQUAL');
  });

  it('should return error with malformed conditions', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      identifier: 'identifier-conditions',
      active: false,
      check: false,
      conditions: [
        {
          children: 'test',
        },
      ],
    };

    const { body } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(body.statusCode).to.equal(400);
    expect(body.error).to.equal('Bad Request');
  });

  it('should not allow to create integration with same identifier', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      identifier: 'identifier',
      active: false,
      check: false,
    };
    await integrationRepository.create({
      name: 'Test',
      identifier: payload.identifier,
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const { body } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(body.statusCode).to.equal(409);
    expect(body.message).to.equal('Integration with identifier already exists');
  });

  it('should allow creating the integration with minimal data', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.name).to.equal('SendGrid');
    expect(data.identifier).to.exist;
    expect(data.providerId).to.equal(EmailProviderIdEnum.SendGrid);
    expect(data.channel).to.equal(ChannelTypeEnum.EMAIL);
    expect(data.active).to.equal(false);
  });

  it('should allow creating the integration in the chosen environment', async function () {
    const prodEnv = await envRepository.findOne({ name: 'Production', _organizationId: session.organization._id });
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      _environmentId: prodEnv?._id,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.name).to.equal('SendGrid');
    expect(data._environmentId).to.equal(prodEnv?._id);
    expect(data.identifier).to.exist;
    expect(data.providerId).to.equal(EmailProviderIdEnum.SendGrid);
    expect(data.channel).to.equal(ChannelTypeEnum.EMAIL);
    expect(data.active).to.equal(false);
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

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.credentials?.host).to.equal(payload.credentials.host);
    expect(data.credentials?.port).to.equal(payload.credentials.port);
    expect(data.credentials?.secure).to.equal(payload.credentials.secure);
    expect(data.credentials?.requireTls).to.equal(payload.credentials.requireTls);
    expect(data.credentials?.tlsOptions).to.instanceOf(Object);
    expect(data.credentials?.tlsOptions).to.eql(payload.credentials.tlsOptions);
    expect(data.active).to.equal(true);
  });

  it('should not calculate primary and priority fields when is not active', async function () {
    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: false,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(false);
  });

  it('should not calculate primary and priority fields for in-app channel', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not calculate primary and priority fields for push channel', async function () {
    const payload = {
      providerId: PushProviderIdEnum.FCM,
      channel: ChannelTypeEnum.PUSH,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not calculate primary and priority fields for chat channel', async function () {
    const payload = {
      providerId: ChatProviderIdEnum.Slack,
      channel: ChannelTypeEnum.CHAT,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(0);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it('should not set the integration as primary when its active and there are no other active integrations', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(1);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);
  });

  it(
    'should not set the integration as primary when its active ' +
      'and there are no other active integrations other than Novu',
    async function () {
      await integrationRepository.deleteMany({
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
      });

      const novuEmail = await integrationRepository.create({
        name: 'novuEmail',
        identifier: 'novuEmail',
        providerId: EmailProviderIdEnum.Novu,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
        primary: true,
        priority: 1,
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
      });

      const payload = {
        providerId: EmailProviderIdEnum.SendGrid,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
        check: false,
      };

      const {
        body: { data },
      } = await session.testAgent.post('/v1/integrations').send(payload);

      expect(data.priority).to.equal(1);
      expect(data.primary).to.equal(false);
      expect(data.active).to.equal(true);

      const [first, second] = await integrationRepository.find(
        {
          _organizationId: session.organization._id,
          _environmentId: session.environment._id,
          channel: ChannelTypeEnum.EMAIL,
        },
        undefined,
        { sort: { priority: -1 } }
      );

      expect(first._id).to.equal(novuEmail._id);
      expect(first.primary).to.equal(true);
      expect(first.active).to.equal(true);
      expect(first.priority).to.equal(2);

      expect(second._id).to.equal(data._id);
      expect(second.primary).to.equal(false);
      expect(second.active).to.equal(true);
      expect(second.priority).to.equal(1);
    }
  );

  it('should not set the integration as primary when there is primary integration', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const primaryIntegration = await integrationRepository.create({
      name: 'primaryIntegration',
      identifier: 'primaryIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(1);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(primaryIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(data._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should calculate the highest priority but not set primary if there is another active integration', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const activeIntegration = await integrationRepository.create({
      name: 'activeIntegration',
      identifier: 'activeIntegration',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: false,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    expect(data.priority).to.equal(2);
    expect(data.primary).to.equal(false);
    expect(data.active).to.equal(true);

    const [first, second] = await await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(data._id);
    expect(first.primary).to.equal(false);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(activeIntegration._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should not disable the novu integration and clear the primary flag if the new integration is created', async function () {
    await integrationRepository.deleteMany({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const novuIntegration = await integrationRepository.create({
      name: 'Novu Integration',
      identifier: 'novuIntegration',
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      primary: true,
      priority: 1,
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
    });

    const payload = {
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      check: false,
    };

    const {
      body: { data },
    } = await session.testAgent.post('/v1/integrations').send(payload);

    const [first, second] = await integrationRepository.find(
      {
        _organizationId: session.organization._id,
        _environmentId: session.environment._id,
        channel: ChannelTypeEnum.EMAIL,
      },
      undefined,
      { sort: { priority: -1 } }
    );

    expect(first._id).to.equal(novuIntegration._id);
    expect(first.primary).to.equal(true);
    expect(first.active).to.equal(true);
    expect(first.priority).to.equal(2);

    expect(second._id).to.equal(data._id);
    expect(second.primary).to.equal(false);
    expect(second.active).to.equal(true);
    expect(second.priority).to.equal(1);
  });

  it('should not allow creating the same novu provider on same environment twice', async function () {
    const inAppPayload = {
      name: InAppProviderIdEnum.Novu,
      providerId: InAppProviderIdEnum.Novu,
      channel: ChannelTypeEnum.IN_APP,
      credentials: {},
      active: true,
      check: false,
    };

    const inAppResult = await session.testAgent.post('/v1/integrations').send(inAppPayload);

    expect(inAppResult.body.statusCode).to.equal(400);
    expect(inAppResult.body.message).to.equal('One environment can only have one In app provider');

    const emailPayload = {
      name: EmailProviderIdEnum.Novu,
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      credentials: {},
      active: true,
      check: false,
    };

    const emailResult = await session.testAgent.post('/v1/integrations').send(emailPayload);

    expect(emailResult.body.statusCode).to.equal(409);
    expect(emailResult.body.message).to.equal('Integration with novu provider for email channel already exists');

    const smsPayload = {
      name: SmsProviderIdEnum.Novu,
      providerId: SmsProviderIdEnum.Novu,
      channel: ChannelTypeEnum.SMS,
      credentials: {},
      active: true,
      check: false,
    };

    const smsResult = await session.testAgent.post('/v1/integrations').send(smsPayload);

    expect(smsResult.body.statusCode).to.equal(409);
    expect(smsResult.body.message).to.equal('Integration with novu provider for sms channel already exists');
  });

  it('should not allow creating Novu Email integration when credentials are not set', async function () {
    const oldNovuEmailIntegrationApiKey = process.env.NOVU_EMAIL_INTEGRATION_API_KEY;
    process.env.NOVU_EMAIL_INTEGRATION_API_KEY = '';

    const novuEmailIntegrationPayload = {
      name: EmailProviderIdEnum.Novu,
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      credentials: {},
      active: true,
      check: false,
    };

    const { body } = await session.testAgent.post('/v1/integrations').send(novuEmailIntegrationPayload);

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(
      `Creating Novu integration for ${novuEmailIntegrationPayload.providerId} provider is not allowed`
    );
    process.env.NOVU_EMAIL_INTEGRATION_API_KEY = oldNovuEmailIntegrationApiKey;
  });

  it('should not allow creating Novu SMS integration when credentials are not set', async function () {
    const oldNovuSmsIntegrationAccountSid = process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID;
    process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID = '';

    const novuSmsIntegrationPayload = {
      name: SmsProviderIdEnum.Novu,
      providerId: SmsProviderIdEnum.Novu,
      channel: ChannelTypeEnum.SMS,
      credentials: {},
      active: true,
      check: false,
    };

    const { body } = await session.testAgent.post('/v1/integrations').send(novuSmsIntegrationPayload);

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.equal(
      `Creating Novu integration for ${novuSmsIntegrationPayload.providerId} provider is not allowed`
    );
    process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID = oldNovuSmsIntegrationAccountSid;
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
