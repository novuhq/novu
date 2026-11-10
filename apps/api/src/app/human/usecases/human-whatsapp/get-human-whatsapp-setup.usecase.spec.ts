import { encryptCredentials } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { GetHumanWhatsAppSetupCommand } from './get-human-whatsapp-setup.command';
import { GetHumanWhatsAppSetup } from './get-human-whatsapp-setup.usecase';

const PLATFORM_ENV = ['NOVU_WHATSAPP_APP_ID', 'NOVU_WHATSAPP_APP_SECRET', 'NOVU_WHATSAPP_CONFIG_ID'] as const;

describe('GetHumanWhatsAppSetup', () => {
  const saved: Partial<Record<(typeof PLATFORM_ENV)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of PLATFORM_ENV) {
      saved[key] = process.env[key];
    }
    process.env.NOVU_WHATSAPP_APP_ID = 'app-1';
    process.env.NOVU_WHATSAPP_APP_SECRET = 'app-secret';
    process.env.NOVU_WHATSAPP_CONFIG_ID = 'config-1';
  });

  afterEach(() => {
    for (const key of PLATFORM_ENV) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  const command = GetHumanWhatsAppSetupCommand.create({
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    agentIdentifier: 'human-relay',
  });

  function setup(options: {
    whatsAppEnabled: boolean;
    available?: { available: boolean; reason?: 'feature_disabled' | 'missing_platform_config' };
    credentials?: Record<string, unknown>;
    operatorEndpoint?: Record<string, unknown> | null;
  }) {
    const availability = { execute: sinon.stub().resolves(options.available ?? { available: true }) };
    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' }),
    };
    const agentIntegrationRepository = { find: sinon.stub().resolves([{ _integrationId: 'int-wa' }]) };
    const integrationRepository = {
      find: sinon.stub().resolves(
        options.credentials
          ? [
              {
                _id: 'int-wa',
                identifier: 'whatsapp-main',
                providerId: ChatProviderIdEnum.WhatsAppBusiness,
                credentials: encryptCredentials(options.credentials as never),
              },
            ]
          : []
      ),
    };
    const channelEndpointRepository = { findOne: sinon.stub().resolves(options.operatorEndpoint ?? null) };
    const humanOperator = { find: sinon.stub().resolves('ada') };
    const usecase = new GetHumanWhatsAppSetup(
      new HumanChannelGate({ getFlag: sinon.stub().resolves(options.whatsAppEnabled) } as never),
      availability as never,
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      channelEndpointRepository as never,
      humanOperator as never
    );

    return { usecase, availability, integrationRepository, channelEndpointRepository };
  }

  it('hides WhatsApp entirely while the flag is off, without asking anything else', async () => {
    const { usecase, availability, integrationRepository } = setup({ whatsAppEnabled: false });

    expect(await usecase.execute(command)).to.deep.equal({ enabled: false, available: false, connected: false });
    expect(availability.execute.called).to.equal(false);
    expect(integrationRepository.find.called).to.equal(false);
  });

  it('says why Embedded Signup cannot run, without the Meta ids', async () => {
    const { usecase } = setup({
      whatsAppEnabled: true,
      available: { available: false, reason: 'missing_platform_config' },
    });

    expect(await usecase.execute(command)).to.deep.equal({
      enabled: true,
      available: false,
      reason: 'missing_platform_config',
      connected: false,
      businessConnected: false,
      operatorNumberBound: false,
    });
  });

  it('hands the public Meta ids to the Facebook button before anything is linked', async () => {
    const { usecase } = setup({ whatsAppEnabled: true });

    expect(await usecase.execute(command)).to.deep.equal({
      enabled: true,
      available: true,
      appId: 'app-1',
      configId: 'config-1',
      connected: false,
      businessConnected: false,
      operatorNumberBound: false,
    });
  });

  const CREDENTIALS = {
    apiToken: 'EAAG-secret-token',
    phoneNumberIdentification: '1234',
    businessAccountId: 'waba-1',
    from: '+1 555-123-4567',
    isNovuManaged: true,
  };

  it('reads a linked business number as one step short until the operator proves their own number', async () => {
    const { usecase } = setup({ whatsAppEnabled: true, credentials: CREDENTIALS });

    const result = await usecase.execute(command);

    expect(result).to.include({
      connected: false,
      businessConnected: true,
      operatorNumberBound: false,
      displayPhoneNumber: '+1 555-123-4567',
    });
    expect(JSON.stringify(result)).to.not.contain('EAAG-secret-token');
    expect(JSON.stringify(result)).to.not.contain('app-secret');
  });

  it('reads WhatsApp as connected once the operator’s own number is bound on the business number', async () => {
    const { usecase, channelEndpointRepository } = setup({
      whatsAppEnabled: true,
      credentials: CREDENTIALS,
      operatorEndpoint: { endpoint: { phoneNumber: '+15550100199' } },
    });

    expect(await usecase.execute(command)).to.include({
      connected: true,
      businessConnected: true,
      operatorNumberBound: true,
      operatorPhoneNumber: '+15550100199',
    });
    expect(channelEndpointRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      integrationIdentifier: 'whatsapp-main',
      subscriberId: 'ada',
      type: 'phone',
    });
  });

  it('does not read a WhatsApp integration without a token as connected', async () => {
    const { usecase } = setup({ whatsAppEnabled: true, credentials: { token: 'verify-token' } });

    expect(await usecase.execute(command)).to.include({ connected: false });
  });
});
