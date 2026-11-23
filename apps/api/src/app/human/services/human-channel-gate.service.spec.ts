import { UnprocessableEntityException } from '@nestjs/common';
import { ChatProviderIdEnum, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanChannelGate } from './human-channel-gate.service';
import { viaForProviderId } from './human-channel-via';

function gate(whatsAppEnabled: boolean) {
  const getFlag = sinon.stub().resolves(whatsAppEnabled);

  return { gate: new HumanChannelGate({ getFlag } as never), getFlag };
}

const scope = { organizationId: 'org1', environmentId: 'env1' };

describe('viaForProviderId', () => {
  it('resolves a WhatsApp Business integration to the whatsapp via', () => {
    expect(viaForProviderId(ChatProviderIdEnum.WhatsAppBusiness)).to.equal(HumanChannelViaEnum.WHATSAPP);
  });
});

describe('HumanChannelGate', () => {
  it('rejects whatsapp as an unknown channel while the flag is off', async () => {
    try {
      await gate(false).gate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, scope);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).message).to.equal(
        'Unknown channel "whatsapp". Use one of: telegram, slack, email.'
      );
    }
  });

  it('accepts whatsapp while the flag is on', async () => {
    await gate(true).gate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, scope);
  });

  it('never reads the flag for other vias or no via', async () => {
    const { gate: subject, getFlag } = gate(false);

    await subject.assertViaEnabled(HumanChannelViaEnum.TELEGRAM, scope);
    await subject.assertViaEnabled(undefined, scope);

    expect(getFlag.called).to.equal(false);
  });

  it('lists whatsapp among the enabled vias only while the flag is on', async () => {
    expect(await gate(false).gate.enabledVias(scope)).to.not.include(HumanChannelViaEnum.WHATSAPP);
    expect(await gate(true).gate.enabledVias(scope)).to.include(HumanChannelViaEnum.WHATSAPP);
  });
});
