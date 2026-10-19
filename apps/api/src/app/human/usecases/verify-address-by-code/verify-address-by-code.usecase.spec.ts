import { ConflictException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import type { HumanVerificationTokenPayload } from '../../services/human-verification-token.service';
import { ConfirmHumanAddress } from '../verify-address/confirm-human-address.service';
import { VerifyAddressByCodeCommand } from './verify-address-by-code.command';
import { VerifyAddressByCode } from './verify-address-by-code.usecase';

describe('VerifyAddressByCode', () => {
  const payload = (requestedAt = '2026-10-01T12:00:00.000Z'): HumanVerificationTokenPayload => ({
    env: 'env-1',
    org: 'org-1',
    agentId: 'agent-1',
    subscriberId: 'alice',
    via: HumanChannelViaEnum.EMAIL,
    address: 'alice@example.com',
    requestedAt,
  });

  function setup() {
    const verificationCodes = {
      redeem: sinon.stub(),
      release: sinon.stub().resolves(),
    };
    const inviteTokens = { requireActive: sinon.stub() };
    const humanContactRepository = {
      promotePendingAddress: sinon.stub(),
      findVerifiedAddress: sinon.stub().resolves(null),
      findPendingAddress: sinon.stub().resolves(null),
    };
    const agentRepository = { findOne: sinon.stub().resolves({ name: 'Acme Ops' }) };
    const subscriberRepository = {
      findOne: sinon.stub().resolves({ firstName: 'Nikita', lastName: 'Grossman' }),
      update: sinon.stub().resolves(),
    };
    const operatorService = { findForAgent: sinon.stub().resolves('nikita') };
    const usecase = new VerifyAddressByCode(
      verificationCodes as never,
      inviteTokens as never,
      humanContactRepository as never,
      new ConfirmHumanAddress(
        humanContactRepository as never,
        agentRepository as never,
        subscriberRepository as never,
        operatorService as never
      )
    );

    return { usecase, verificationCodes, humanContactRepository, subscriberRepository, inviteTokens };
  }

  it('promotes the slot the code was issued for', async () => {
    const { usecase, verificationCodes, humanContactRepository, subscriberRepository } = setup();
    verificationCodes.redeem.resolves({ payload: payload(), alreadyUsed: false });
    humanContactRepository.promotePendingAddress.resolves({
      address: 'alice@example.com',
      requestedAt: payload().requestedAt,
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    const result = await usecase.execute(
      VerifyAddressByCodeCommand.create({ address: 'Alice@Example.com', code: '481926', clientIp: '203.0.113.4' })
    );

    expect(result.verified).to.equal(true);
    expect(result.address).to.equal('a***@example.com');
    expect(verificationCodes.redeem.firstCall.args).to.deep.equal(['alice@example.com', '481926', '203.0.113.4']);
    expect(subscriberRepository.update.firstCall.args[1]).to.deep.equal({ $set: { email: 'alice@example.com' } });
    expect(verificationCodes.release.called).to.equal(false);
  });

  it('succeeds again when the link already verified the same slot', async () => {
    const { usecase, verificationCodes, humanContactRepository } = setup();
    verificationCodes.redeem.resolves({ payload: payload(), alreadyUsed: true });
    humanContactRepository.promotePendingAddress.resolves(null);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'alice@example.com',
      requestedAt: payload().requestedAt,
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    const result = await usecase.execute(
      VerifyAddressByCodeCommand.create({ address: 'alice@example.com', code: '481926' })
    );

    expect(result.verified).to.equal(true);
    expect(verificationCodes.release.called).to.equal(false);
  });

  it('reports a code from before a resend as superseded and keeps it spent', async () => {
    const { usecase, verificationCodes, humanContactRepository } = setup();
    verificationCodes.redeem.resolves({ payload: payload('2026-10-01T11:00:00.000Z'), alreadyUsed: false });
    humanContactRepository.promotePendingAddress.resolves(null);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'alice@example.com',
      requestedAt: '2026-10-01T12:00:00.000Z',
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    try {
      await usecase.execute(VerifyAddressByCodeCommand.create({ address: 'alice@example.com', code: '481926' }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).to.deep.include({ code: 'verification_superseded' });
    }

    expect(verificationCodes.release.called).to.equal(false);
  });

  it('gives the code back when the address write fails', async () => {
    const { usecase, verificationCodes, humanContactRepository } = setup();
    verificationCodes.redeem.resolves({ payload: payload(), alreadyUsed: false });
    humanContactRepository.promotePendingAddress.rejects(new Error('mongo down'));

    try {
      await usecase.execute(VerifyAddressByCodeCommand.create({ address: 'alice@example.com', code: '481926' }));
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.equal('mongo down');
    }

    expect(verificationCodes.release.calledOnceWith('alice@example.com', '481926')).to.equal(true);
  });

  it('reads the pending address from the invite when the page was refreshed', async () => {
    const { usecase, verificationCodes, humanContactRepository, inviteTokens } = setup();
    inviteTokens.requireActive.resolves({
      payload: { env: 'env-1', org: 'org-1', agentId: 'agent-1', subscriberId: 'alice' },
    });
    humanContactRepository.findPendingAddress.resolves({ address: 'alice@example.com' });
    verificationCodes.redeem.resolves({ payload: payload(), alreadyUsed: false });
    humanContactRepository.promotePendingAddress.resolves({
      address: 'alice@example.com',
      requestedAt: payload().requestedAt,
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    await usecase.execute(VerifyAddressByCodeCommand.create({ inviteToken: 'a'.repeat(32), code: '481926' }));

    expect(verificationCodes.redeem.firstCall.args[0]).to.equal('alice@example.com');
  });
});
