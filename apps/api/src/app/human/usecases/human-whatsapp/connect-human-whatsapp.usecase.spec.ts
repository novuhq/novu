import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { ConnectHumanWhatsAppCommand } from './connect-human-whatsapp.command';
import { ConnectHumanWhatsApp } from './connect-human-whatsapp.usecase';

describe('ConnectHumanWhatsApp', () => {
  const command = ConnectHumanWhatsAppCommand.create({
    environmentId: 'env1',
    organizationId: 'org1',
    userId: 'user1',
    agentIdentifier: 'human-relay',
    code: 'meta-code',
    wabaId: 'waba-1',
    phoneNumberId: 'phone-1',
  });

  function setup(options: { whatsAppEnabled?: boolean; relay?: boolean; linked?: boolean } = {}) {
    const { whatsAppEnabled = true, relay = true, linked = true } = options;
    const embeddedSignup = {
      execute: sinon.stub().resolves({
        success: true,
        integrationId: 'int-wa',
        callbackUrl: 'https://api.example.com/v1/agents/relay1/webhook/whatsapp-main',
        wabaId: 'waba-1',
        displayPhoneNumber: '+1 555-123-4567',
      }),
    };
    const usecase = new ConnectHumanWhatsApp(
      new HumanChannelGate({ getFlag: sinon.stub().resolves(whatsAppEnabled) } as never),
      embeddedSignup as never,
      {
        findOne: sinon
          .stub()
          .resolves(relay ? { _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' } : null),
      } as never,
      { find: sinon.stub().resolves(linked ? [{ _integrationId: 'int-wa' }] : []) } as never,
      {
        find: sinon
          .stub()
          .resolves(
            linked
              ? [{ _id: 'int-wa', identifier: 'whatsapp-main', providerId: ChatProviderIdEnum.WhatsAppBusiness }]
              : []
          ),
      } as never
    );

    return { usecase, embeddedSignup };
  }

  it('refuses while WhatsApp is turned off, before touching Meta', async () => {
    const { usecase, embeddedSignup } = setup({ whatsAppEnabled: false });

    try {
      await usecase.execute(command);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(UnprocessableEntityException);
    }
    expect(embeddedSignup.execute.called).to.equal(false);
  });

  it('needs the relay agent', async () => {
    const { usecase } = setup({ relay: false });

    try {
      await usecase.execute(command);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).to.include({ code: 'agent_not_found' });
    }
  });

  it('needs a WhatsApp channel linked to the relay first', async () => {
    const { usecase, embeddedSignup } = setup({ linked: false });

    try {
      await usecase.execute(command);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).to.include({ code: 'channel_not_found' });
    }
    expect(embeddedSignup.execute.called).to.equal(false);
  });

  it('runs Embedded Signup on the relay’s WhatsApp channel and returns only what the dashboard shows', async () => {
    const { usecase, embeddedSignup } = setup();

    const result = await usecase.execute(command);

    expect(embeddedSignup.execute.firstCall.args[0]).to.include({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      code: 'meta-code',
      wabaId: 'waba-1',
      phoneNumberId: 'phone-1',
      agentIdentifier: 'human-relay',
      integrationIdentifier: 'whatsapp-main',
    });
    expect(result).to.deep.equal({ success: true, displayPhoneNumber: '+1 555-123-4567' });
  });

  it('passes a Meta failure through with its code', async () => {
    const { usecase, embeddedSignup } = setup();
    embeddedSignup.execute.resolves({
      success: false,
      error: { code: 'token_exchange_failed', message: 'Meta said no' },
    });

    expect(await usecase.execute(command)).to.deep.equal({
      success: false,
      error: { code: 'token_exchange_failed', message: 'Meta said no' },
    });
  });
});
