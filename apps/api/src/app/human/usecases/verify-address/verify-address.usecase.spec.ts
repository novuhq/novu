import { ConflictException } from '@nestjs/common';
import { HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InactiveHumanVerificationError } from '../../services/human-verification-token.service';
import { VerifyAddressCommand } from './verify-address.command';
import { VerifyAddress } from './verify-address.usecase';

describe('VerifyAddress', () => {
  function setup() {
    const verificationTokens = {
      claim: sinon.stub(),
      release: sinon.stub().resolves(),
    };
    const humanContactRepository = {
      promotePendingAddress: sinon.stub(),
      findVerifiedAddress: sinon.stub().resolves(null),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ name: 'Acme Ops', operatorSubscriberId: 'nikita' }),
    };
    const subscriberRepository = {
      findOne: sinon.stub().resolves({ firstName: 'Nikita', lastName: 'Grossman' }),
      update: sinon.stub().resolves(),
    };
    const usecase = new VerifyAddress(
      verificationTokens as never,
      humanContactRepository as never,
      agentRepository as never,
      subscriberRepository as never
    );

    return { usecase, verificationTokens, humanContactRepository, subscriberRepository, agentRepository };
  }

  it('promotes a matching pending address and copies it onto the subscriber', async () => {
    const { usecase, verificationTokens, humanContactRepository, subscriberRepository } = setup();
    verificationTokens.claim.resolves({
      payload: {
        env: 'env-1',
        org: 'org-1',
        agentId: 'agent-1',
        subscriberId: 'alice',
        via: HumanChannelViaEnum.EMAIL,
        address: 'alice@example.com',
      },
      expiresAt: '2026-10-02T12:00:00.000Z',
    });
    humanContactRepository.promotePendingAddress.resolves({
      address: 'alice@example.com',
      requestedAt: '2026-10-01T12:00:00.000Z',
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    const result = await usecase.execute(VerifyAddressCommand.create({ token: 'a'.repeat(32) }));

    expect(result).to.deep.equal({
      verified: true,
      agentName: 'Acme Ops',
      operatorName: 'Nikita Grossman',
      via: HumanChannelViaEnum.EMAIL,
      address: 'a***@example.com',
    });
    expect(subscriberRepository.update.firstCall.args[1]).to.deep.equal({
      $set: { email: 'alice@example.com' },
    });
  });

  it('returns verification_superseded when no pending match remains', async () => {
    const { usecase, verificationTokens, humanContactRepository, subscriberRepository } = setup();
    verificationTokens.claim.resolves({
      payload: {
        env: 'env-1',
        org: 'org-1',
        agentId: 'agent-1',
        subscriberId: 'alice',
        via: HumanChannelViaEnum.EMAIL,
        address: 'old@example.com',
      },
      expiresAt: '2026-10-02T12:00:00.000Z',
    });
    humanContactRepository.promotePendingAddress.resolves(null);

    try {
      await usecase.execute(VerifyAddressCommand.create({ token: 'b'.repeat(32) }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).to.deep.include({ code: 'verification_superseded' });
      expect(subscriberRepository.update.called).to.equal(false);
      expect(verificationTokens.release.called).to.equal(false);
    }
  });

  it('finishes a retry when the address was already promoted', async () => {
    const { usecase, verificationTokens, humanContactRepository, subscriberRepository } = setup();
    verificationTokens.claim.resolves({
      payload: {
        env: 'env-1',
        org: 'org-1',
        agentId: 'agent-1',
        subscriberId: 'alice',
        via: HumanChannelViaEnum.EMAIL,
        address: 'alice@example.com',
      },
      expiresAt: '2026-10-02T12:00:00.000Z',
    });
    humanContactRepository.promotePendingAddress.resolves(null);
    humanContactRepository.findVerifiedAddress.resolves({
      address: 'alice@example.com',
      requestedAt: '2026-10-01T12:00:00.000Z',
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });

    const result = await usecase.execute(VerifyAddressCommand.create({ token: 'd'.repeat(32) }));

    expect(result.verified).to.equal(true);
    expect(subscriberRepository.update.firstCall.args[1]).to.deep.equal({
      $set: { email: 'alice@example.com' },
    });
    expect(verificationTokens.release.called).to.equal(false);
  });

  it('follows a newer verified address instead of writing the one this link confirmed', async () => {
    const { usecase, verificationTokens, humanContactRepository, subscriberRepository } = setup();
    verificationTokens.claim.resolves({
      payload: {
        env: 'env-1',
        org: 'org-1',
        agentId: 'agent-1',
        subscriberId: 'alice',
        via: HumanChannelViaEnum.EMAIL,
        address: 'old@example.com',
      },
      expiresAt: '2026-10-02T12:00:00.000Z',
    });
    humanContactRepository.promotePendingAddress.resolves({
      address: 'old@example.com',
      requestedAt: '2026-10-01T12:00:00.000Z',
      verifiedAt: '2026-10-01T12:05:00.000Z',
    });
    humanContactRepository.findVerifiedAddress
      .onFirstCall()
      .resolves({ address: 'old@example.com', requestedAt: '', verifiedAt: '' })
      .onSecondCall()
      .resolves({ address: 'new@example.com', requestedAt: '', verifiedAt: '' })
      .resolves({ address: 'new@example.com', requestedAt: '', verifiedAt: '' });

    await usecase.execute(VerifyAddressCommand.create({ token: 'e'.repeat(32) }));

    expect(subscriberRepository.update.lastCall.args[1]).to.deep.equal({
      $set: { email: 'new@example.com' },
    });
  });

  it('releases the token when the write fails so the same link can be retried', async () => {
    const { usecase, verificationTokens, humanContactRepository } = setup();
    const claimed = {
      payload: {
        env: 'env-1',
        org: 'org-1',
        agentId: 'agent-1',
        subscriberId: 'alice',
        via: HumanChannelViaEnum.EMAIL,
        address: 'alice@example.com',
      },
      expiresAt: '2026-10-02T12:00:00.000Z',
    };
    verificationTokens.claim.resolves(claimed);
    humanContactRepository.promotePendingAddress.rejects(new Error('mongo down'));

    try {
      await usecase.execute(VerifyAddressCommand.create({ token: 'f'.repeat(32) }));
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).to.equal('mongo down');
    }

    expect(verificationTokens.release.calledOnce).to.equal(true);
    expect(verificationTokens.release.firstCall.args[0]).to.equal('f'.repeat(32));
    expect(verificationTokens.release.firstCall.args[1]).to.equal(claimed);
  });

  it('maps inactive tokens to HTTP errors', async () => {
    const { usecase, verificationTokens } = setup();
    verificationTokens.claim.rejects(new InactiveHumanVerificationError('used'));

    try {
      await usecase.execute(VerifyAddressCommand.create({ token: 'c'.repeat(32) }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ConflictException);
    }
  });
});
