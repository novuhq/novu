import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { ChannelTypeEnum, EmailProviderIdEnum, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE } from '../../../keyless/keyless-email-gate.service';
import { RequestAddressVerificationCommand } from './request-address-verification.command';
import { RequestAddressVerification } from './request-address-verification.usecase';

describe('RequestAddressVerification', () => {
  const previousPending = {
    address: 'old@example.com',
    requestedAt: '2026-10-01T12:00:00.000Z',
  };
  const writtenPending = { address: 'new@example.com', requestedAt: '2026-10-01T12:05:00.000Z' };

  function setup() {
    const humanContactRepository = {
      findVerifiedAddress: sinon
        .stub()
        .resolves({ address: 'old@example.com', verifiedAt: '2026-10-01T11:00:00.000Z' }),
      findPendingAddress: sinon.stub().resolves(previousPending),
      upsertPendingAddress: sinon.stub().resolves(writtenPending),
      restorePendingAddress: sinon.stub().resolves(),
    };
    const rateLimit = {
      assertAndRecord: sinon.stub().resolves({ retryAfterSeconds: 60, reservation: 'res-1' }),
      release: sinon.stub().resolves(),
    };
    const verificationTokens = {
      issue: sinon.stub().resolves({ token: 'a'.repeat(32), expiresAt: '2026-10-02T12:00:00.000Z' }),
    };
    const verificationCodes = {
      issue: sinon.stub().resolves({ code: '481926', expiresAt: '2026-10-02T12:00:00.000Z' }),
    };
    const emailSender = {
      send: sinon.stub().resolves(),
    };
    const inboxQuota = {
      withCredits: sinon.stub().callsFake((_org: string, _count: number, fn: () => Promise<unknown>) => fn()),
    };
    const keylessEmailGate = {
      assertOperatorVerificationAllowed: sinon.stub().resolves({}),
      isBlocked: sinon.stub().returns(false),
    };
    const usecase = new RequestAddressVerification(
      { execute: sinon.stub() } as never,
      {
        findOne: sinon.stub().resolves({ _id: 'agent-1', name: 'Acme Ops' }),
      } as never,
      {
        findLinksForAgents: sinon.stub().resolves([{ _integrationId: 'email-int' }]),
      } as never,
      {
        find: sinon.stub().resolves([
          {
            _id: 'email-int',
            providerId: EmailProviderIdEnum.AgentEmailInbox,
            channel: ChannelTypeEnum.EMAIL,
            credentials: { outboundIntegrationId: 'out-1' },
          },
        ]),
        findOne: sinon.stub().resolves({
          _id: 'out-1',
          providerId: EmailProviderIdEnum.Novu,
          channel: ChannelTypeEnum.EMAIL,
          active: true,
          credentials: {},
        }),
      } as never,
      humanContactRepository as never,
      rateLimit as never,
      verificationTokens as never,
      verificationCodes as never,
      emailSender as never,
      inboxQuota as never,
      keylessEmailGate as never
    );

    return {
      usecase,
      humanContactRepository,
      rateLimit,
      emailSender,
      verificationTokens,
      inboxQuota,
      keylessEmailGate,
    };
  }

  function command() {
    return RequestAddressVerificationCommand.create({
      environmentId: 'env-1',
      organizationId: 'org-1',
      agentId: 'agent-1',
      subscriberId: 'alice',
      via: HumanChannelViaEnum.EMAIL,
      address: 'new@example.com',
    });
  }

  it('restores the previous pending address and releases the rate limit when send fails', async () => {
    const { usecase, humanContactRepository, rateLimit, emailSender, inboxQuota } = setup();
    emailSender.send.rejects(
      new BadGatewayException({ error: 'delivery_failed', message: 'Unauthorized: bad sender' })
    );

    try {
      await usecase.execute(command());
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
      expect((err as BadGatewayException).getResponse()).to.deep.include({
        message: 'Unauthorized: bad sender',
      });
    }

    expect(humanContactRepository.restorePendingAddress.calledOnce).to.equal(true);
    expect(humanContactRepository.restorePendingAddress.firstCall.args[0]).to.deep.include({
      replaced: writtenPending,
      pending: previousPending,
    });
    expect(inboxQuota.withCredits.calledOnce).to.equal(true);
    expect(rateLimit.release.calledOnce).to.equal(true);
    expect(rateLimit.release.firstCall.args[0]).to.deep.include({ reservation: 'res-1' });
    expect(rateLimit.release.calledAfter(humanContactRepository.restorePendingAddress)).to.equal(true);
  });

  it('returns the requestedAt of the pending slot it wrote', async () => {
    const { usecase, verificationTokens, inboxQuota } = setup();

    const result = await usecase.execute(command());

    expect(inboxQuota.withCredits.calledOnce).to.equal(true);
    expect(result.requestedAt).to.equal(writtenPending.requestedAt);
    expect(result.address).to.equal('n***@example.com');
    expect(verificationTokens.issue.firstCall.args[0]).to.include({
      address: writtenPending.address,
      requestedAt: writtenPending.requestedAt,
    });
  });

  it('passes the keyless claim link to the verification email without the shared inbox budget', async () => {
    const { usecase, keylessEmailGate, emailSender, inboxQuota } = setup();
    keylessEmailGate.isBlocked.returns(true);
    keylessEmailGate.assertOperatorVerificationAllowed.resolves({ claimUrl: 'https://gethuman.md/claim?token=t' });

    await usecase.execute(command());

    expect(emailSender.send.firstCall.args[0]).to.include({ claimUrl: 'https://gethuman.md/claim?token=t' });
    expect(inboxQuota.withCredits.called).to.equal(false);
  });

  it('refuses a keyless org before any reservation or pending write', async () => {
    const { usecase, keylessEmailGate, rateLimit, inboxQuota, humanContactRepository } = setup();
    keylessEmailGate.assertOperatorVerificationAllowed.rejects(
      new ForbiddenException({
        code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE,
        message: 'Outbound email needs a Human account.',
      })
    );

    try {
      await usecase.execute(command());
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).to.include({ code: KEYLESS_EMAIL_REQUIRES_ACCOUNT_CODE });
    }

    expect(rateLimit.assertAndRecord.called).to.equal(false);
    expect(inboxQuota.withCredits.called).to.equal(false);
    expect(humanContactRepository.upsertPendingAddress.called).to.equal(false);
  });
});
