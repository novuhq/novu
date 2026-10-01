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
    };
    const humanContactRepository = {
      promotePendingAddress: sinon.stub(),
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
    }
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
