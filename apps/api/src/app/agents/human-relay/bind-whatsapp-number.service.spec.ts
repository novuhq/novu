import { NotFoundException } from '@nestjs/common';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { BindWhatsAppNumber } from './bind-whatsapp-number.service';

const PAYLOAD = {
  environmentId: 'env1',
  organizationId: 'org1',
  integrationId: 'integration1',
  agentIdentifier: 'human-relay',
  subscriberId: 'ada',
};
const NUMBER = '+15550100199';

describe('BindWhatsAppNumber', () => {
  function setup({
    integration = {
      _id: 'integration1',
      identifier: 'whatsapp-main',
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
      active: true,
    } as Record<string, unknown> | null,
    linked = true,
    existing = null as Record<string, unknown> | null,
  } = {}) {
    const integrationRepository = { findOne: sinon.stub().resolves(integration) };
    const agentRepository = { findOne: sinon.stub().resolves({ _id: 'agent1' }) };
    const agentIntegrationRepository = { findOne: sinon.stub().resolves(linked ? { _id: 'link1' } : null) };
    const subscriberRepository = { findBySubscriberId: sinon.stub().resolves({ subscriberId: 'ada' }) };
    const channelEndpointRepository = {
      findByPlatformIdentity: sinon.stub().resolves(existing),
      delete: sinon.stub().resolves(),
      update: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const createChannelEndpoint = { execute: sinon.stub().resolves({ _id: 'endpoint1' }) };
    const usecase = new BindWhatsAppNumber(
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      subscriberRepository as never,
      channelEndpointRepository as never,
      createChannelEndpoint as never
    );

    return {
      usecase,
      integrationRepository,
      agentIntegrationRepository,
      channelEndpointRepository,
      createChannelEndpoint,
    };
  }

  it('binds the number as a verified phone endpoint on the relay’s WhatsApp integration, with its proof', async () => {
    const { usecase, createChannelEndpoint, integrationRepository, channelEndpointRepository } = setup();

    expect(await usecase.execute(PAYLOAD, NUMBER)).to.deep.equal({ created: true, subscriberId: 'ada' });

    expect(integrationRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'env1',
      _organizationId: 'org1',
      _id: 'integration1',
    });
    const command = createChannelEndpoint.execute.firstCall.args[0];
    expect(command).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      integrationIdentifier: 'whatsapp-main',
      subscriberId: 'ada',
      type: ENDPOINT_TYPES.PHONE,
      platformIdentityVerified: true,
    });
    expect(command.endpoint).to.deep.equal({ phoneNumber: NUMBER });
    const [where, change] = channelEndpointRepository.update.firstCall.args;
    expect(where).to.deep.equal({ _environmentId: 'env1', _organizationId: 'org1', _id: 'endpoint1' });
    expect(change.$set['endpoint.provedAt']).to.be.a('string');
  });

  const PROVED = {
    type: ENDPOINT_TYPES.PHONE,
    providerId: ChatProviderIdEnum.WhatsAppBusiness,
    endpoint: { phoneNumber: NUMBER, provedAt: '2026-11-01T10:00:00.000Z' },
  };

  it('changes nothing when the number is already theirs and proved', async () => {
    const { usecase, createChannelEndpoint, channelEndpointRepository } = setup({
      existing: { _id: 'endpoint0', subscriberId: 'ada', ...PROVED },
    });

    expect(await usecase.execute(PAYLOAD, NUMBER)).to.deep.equal({ created: false, subscriberId: 'ada' });
    expect(channelEndpointRepository.update.called).to.equal(false);
    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('proves a number of theirs written without a code, rather than reading it as already connected', async () => {
    const { usecase, createChannelEndpoint, channelEndpointRepository } = setup({
      existing: {
        _id: 'endpoint0',
        subscriberId: 'ada',
        type: ENDPOINT_TYPES.PHONE,
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        endpoint: { phoneNumber: NUMBER },
      },
    });

    expect(await usecase.execute(PAYLOAD, NUMBER)).to.deep.equal({ created: true, subscriberId: 'ada' });
    const change = channelEndpointRepository.update.firstCall.args[1];
    expect(change.$set.subscriberId).to.equal('ada');
    expect(change.$set['endpoint.provedAt']).to.be.a('string');
    expect(change.$unset).to.equal(undefined);
    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  it('moves a number to whoever proved it last in one write, without the old owner’s name', async () => {
    const { usecase, createChannelEndpoint, channelEndpointRepository } = setup({
      existing: { _id: 'endpoint0', subscriberId: 'grace', ...PROVED },
    });

    expect(await usecase.execute(PAYLOAD, NUMBER)).to.deep.equal({ created: true, subscriberId: 'ada' });

    const [where, change] = channelEndpointRepository.update.firstCall.args;
    expect(where).to.deep.equal({ _environmentId: 'env1', _organizationId: 'org1', _id: 'endpoint0' });
    expect(change.$set.subscriberId).to.equal('ada');
    expect(change.$unset).to.deep.equal({
      'endpoint.username': '',
      'endpoint.displayName': '',
      'endpoint.workspaceDomain': '',
    });
    expect(channelEndpointRepository.delete.called).to.equal(false);
    expect(createChannelEndpoint.execute.called).to.equal(false);
  });

  for (const [name, options] of [
    ['the integration is gone', { integration: null }],
    [
      'the integration is not WhatsApp',
      { integration: { _id: 'i', identifier: 'sms', providerId: 'twilio', active: true } },
    ],
    [
      'the integration is turned off',
      { integration: { _id: 'i', identifier: 'wa', providerId: 'whatsapp-business', active: false } },
    ],
    ['the integration is no longer on the relay', { linked: false }],
  ] as const) {
    it(`binds nothing when ${name}`, async () => {
      const { usecase, createChannelEndpoint } = setup(options as never);

      const error = await usecase.execute(PAYLOAD, NUMBER).catch((err: unknown) => err);

      expect(error).to.be.instanceOf(NotFoundException);
      expect(createChannelEndpoint.execute.called).to.equal(false);
    });
  }
});
