import { BadRequestException, ConflictException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConfirmVoiceVerificationCommand } from './confirm-voice-verification.command';
import { ConfirmVoiceVerification } from './confirm-voice-verification.usecase';

describe('ConfirmVoiceVerification', () => {
  function setup(check: unknown) {
    const codes = {
      check: sinon.stub().resolves(check),
      clearIfCurrent: sinon.stub().resolves(),
    };
    const humanContactRepository = {
      promotePendingAddress: sinon.stub().resolves({
        address: '+14155550123',
        requestedAt: 't1',
        verifiedAt: 't2',
      }),
      findVerifiedAddress: sinon.stub().resolves(null),
    };
    const usecase = new ConfirmVoiceVerification(
      codes as never,
      humanContactRepository as never,
      { requireActive: sinon.stub() } as never,
      { findOne: sinon.stub() } as never
    );

    return { usecase, codes, humanContactRepository };
  }

  const command = () =>
    ConfirmVoiceVerificationCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      agentId: 'agent1',
      subscriberId: 'alice',
      code: '4219',
    });

  it('promotes the pending number and forgets the code', async () => {
    const { usecase, codes, humanContactRepository } = setup({
      ok: true,
      address: '+14155550123',
      requestedAt: 't1',
    });

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({
      verified: true,
      via: HumanChannelViaEnum.VOICE,
      address: '+***0123',
    });
    expect(humanContactRepository.promotePendingAddress.firstCall.args[0]).to.include({
      via: HumanChannelViaEnum.VOICE,
      address: '+14155550123',
      requestedAt: 't1',
    });
    expect(codes.clearIfCurrent.calledOnceWith(sinon.match({ subscriberId: 'alice' }), 't1')).to.equal(true);
  });

  it('rejects a wrong code and keeps it for another try', async () => {
    const { usecase, codes } = setup({ ok: false, reason: 'mismatch', attemptsRemaining: 4 });

    try {
      await usecase.execute(command());
      expect.fail('expected verification_code_invalid');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).to.include({
        code: 'verification_code_invalid',
        attemptsRemaining: 4,
      });
    }

    expect(codes.clearIfCurrent.called).to.equal(false);
  });

  it('reports a burned code', async () => {
    const { usecase } = setup({ ok: false, reason: 'locked' });

    try {
      await usecase.execute(command());
      expect.fail('expected verification_code_locked');
    } catch (err) {
      expect((err as BadRequestException).getResponse()).to.include({ code: 'verification_code_locked' });
    }
  });

  it('does not promote a code whose pending number was replaced', async () => {
    const { usecase, humanContactRepository, codes } = setup({
      ok: true,
      address: '+14155550123',
      requestedAt: 't1',
    });
    humanContactRepository.promotePendingAddress.resolves(null);
    humanContactRepository.findVerifiedAddress.resolves({ address: '+15559999', requestedAt: 't9' });

    try {
      await usecase.execute(command());
      expect.fail('expected verification_superseded');
    } catch (err) {
      expect(err).to.be.instanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).to.include({ code: 'verification_superseded' });
    }

    expect(codes.clearIfCurrent.calledOnceWith(sinon.match({ subscriberId: 'alice' }), 't1')).to.equal(true);
  });
});
