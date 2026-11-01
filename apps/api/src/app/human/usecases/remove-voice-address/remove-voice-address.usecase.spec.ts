import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { RemoveVoiceAddressCommand } from './remove-voice-address.command';
import { RemoveVoiceAddress } from './remove-voice-address.usecase';

describe('RemoveVoiceAddress', () => {
  it('clears the verified number, the pending number, and the code', async () => {
    const humanContactRepository = { clearVerifiedAddress: sinon.stub().resolves() };
    const codes = { clear: sinon.stub().resolves() };
    const usecase = new RemoveVoiceAddress(
      humanContactRepository as never,
      codes as never,
      { requireActive: sinon.stub() } as never,
      { findOne: sinon.stub() } as never
    );

    const result = await usecase.execute(
      RemoveVoiceAddressCommand.create({
        environmentId: 'env1',
        organizationId: 'org1',
        agentId: 'agent1',
        subscriberId: 'alice',
      })
    );

    expect(result).to.deep.equal({ removed: true });
    expect(humanContactRepository.clearVerifiedAddress.firstCall.args[0]).to.include({
      via: HumanChannelViaEnum.VOICE,
      subscriberId: 'alice',
    });
    expect(codes.clear.calledOnce).to.equal(true);
  });
});
