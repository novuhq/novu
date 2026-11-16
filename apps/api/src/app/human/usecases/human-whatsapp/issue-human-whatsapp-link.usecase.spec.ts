import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { encryptCredentials } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { IssueHumanWhatsAppLink } from './issue-human-whatsapp-link.usecase';

const PARAMS = {
  environmentId: 'env1',
  organizationId: 'org1',
  agentIdentifier: 'human-relay',
  subscriberId: 'ada',
};
const SENDING = {
  apiToken: 'EAAG-secret-token',
  phoneNumberIdentification: '1234',
  businessAccountId: 'waba-1',
  from: '+1 555-010-0199',
};

describe('IssueHumanWhatsAppLink', () => {
  function setup({
    whatsAppEnabled = true,
    credentials = SENDING as Record<string, unknown> | null,
    relay = { _id: 'relay1', identifier: 'human-relay', runtime: 'human_relay' } as Record<string, unknown> | null,
  } = {}) {
    const codes = { issue: sinon.stub().resolves({ code: 'BCDF-GHJK', expiresAt: '2026-11-10T15:00:00.000Z' }) };
    const integrationRepository = {
      find: sinon.stub().resolves(
        credentials
          ? [
              {
                _id: 'int-wa',
                identifier: 'whatsapp-main',
                providerId: ChatProviderIdEnum.WhatsAppBusiness,
                credentials: encryptCredentials(credentials as never),
              },
            ]
          : []
      ),
    };
    const usecase = new IssueHumanWhatsAppLink(
      new HumanChannelGate({ getFlag: sinon.stub().resolves(whatsAppEnabled) } as never),
      codes as never,
      { findOne: sinon.stub().resolves(relay) } as never,
      { find: sinon.stub().resolves([{ _integrationId: 'int-wa' }]) } as never,
      integrationRepository as never
    );

    return { usecase, codes };
  }

  it('opens WhatsApp at the business number with the code ready to send', async () => {
    const { usecase, codes } = setup();

    expect(await usecase.execute(PARAMS)).to.deep.equal({
      url: 'https://wa.me/15550100199?text=Connect%20my%20WhatsApp%3A%20BCDF-GHJK',
      code: 'BCDF-GHJK',
      expiresAt: '2026-11-10T15:00:00.000Z',
    });
    expect(codes.issue.firstCall.args[0]).to.deep.equal({
      environmentId: 'env1',
      organizationId: 'org1',
      integrationId: 'int-wa',
      agentIdentifier: 'human-relay',
      subscriberId: 'ada',
    });
  });

  it('refuses while WhatsApp is turned off, like an unknown channel', async () => {
    const { usecase, codes } = setup({ whatsAppEnabled: false });

    const error = await usecase.execute(PARAMS).catch((err: unknown) => err);

    expect(error).to.be.instanceOf(UnprocessableEntityException);
    expect(codes.issue.called).to.equal(false);
  });

  it('needs the relay and its WhatsApp Business number', async () => {
    const noRelay = await setup({ relay: null })
      .usecase.execute(PARAMS)
      .catch((err: unknown) => err);
    const noChannel = await setup({ credentials: null })
      .usecase.execute(PARAMS)
      .catch((err: unknown) => err);

    expect(noRelay).to.be.instanceOf(NotFoundException);
    expect((noRelay as NotFoundException).getResponse()).to.include({ code: 'agent_not_found' });
    expect(noChannel).to.be.instanceOf(NotFoundException);
    expect((noChannel as NotFoundException).getResponse()).to.include({ code: 'channel_not_found' });
  });

  it('asks to connect again when WhatsApp never said which number it is', async () => {
    const { usecase, codes } = setup({ credentials: { ...SENDING, from: undefined } });

    const error = await usecase.execute(PARAMS).catch((err: unknown) => err);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.include({ code: 'whatsapp_number_unknown' });
    expect(codes.issue.called).to.equal(false);
  });
});
