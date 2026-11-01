import { BadGatewayException, BadRequestException, ForbiddenException, GatewayTimeoutException } from '@nestjs/common';
import { HumanChannelViaEnum, VOICE_VERIFICATION_CALL_MINUTES } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { unconfirmedVoiceDialBody } from '../../../agents/channels/voice/voice-call-failure';
import { RequestVoiceVerificationCommand } from './request-voice-verification.command';
import { RequestVoiceVerification } from './request-voice-verification.usecase';

const ENV_KEYS = [
  'NOVU_VOICE_TWILIO_NUMBER',
  'NOVU_VOICE_ELEVENLABS_PHONE_NUMBER_ID',
  'NOVU_VOICE_ELEVENLABS_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_VERIFY_AGENT_ID',
  'NOVU_VOICE_ELEVENLABS_API_KEY',
] as const;

describe('RequestVoiceVerification', () => {
  const previous: Record<string, string | undefined> = {};
  const previousPending = { address: '+15550001111', requestedAt: '2026-10-01T12:00:00.000Z' };
  const writtenPending = { address: '+14155550123', requestedAt: '2026-10-01T12:05:00.000Z' };

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      previous[key] = process.env[key];
      process.env[key] = 'set';
    }
  });

  afterEach(() => {
    sinon.restore();
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });

  function setup() {
    const humanContactRepository = {
      findVerifiedAddress: sinon.stub().resolves({ address: '+15550001111', verifiedAt: 't0' }),
      findPendingAddress: sinon.stub().resolves(previousPending),
      upsertPendingAddress: sinon.stub().resolves(writtenPending),
      restorePendingAddress: sinon.stub().resolves(),
    };
    const rateLimit = {
      assertAndRecord: sinon.stub().resolves({ retryAfterSeconds: 60, reservation: 'res-1' }),
      release: sinon.stub().resolves(),
    };
    const codes = {
      issue: sinon.stub().resolves({ code: '421903', expiresAt: '2026-10-01T12:15:00.000Z', previous: null }),
      clear: sinon.stub().resolves(),
      restore: sinon.stub().resolves(),
    };
    const placeVerificationCall = { execute: sinon.stub().resolves({ conversationId: 'conv_v' }) };
    const credits = { accept: sinon.stub(), release: sinon.stub().resolves(), unlimited: false };
    const voiceMinuteQuota = { reserveMinutes: sinon.stub().resolves(credits) };
    const featureFlagsService = { getFlag: sinon.stub().resolves(true) };
    const keylessVoiceGate = { assertAllowed: sinon.stub().resolves() };
    const usecase = new RequestVoiceVerification(
      { execute: sinon.stub() } as never,
      featureFlagsService as never,
      keylessVoiceGate as never,
      humanContactRepository as never,
      rateLimit as never,
      codes as never,
      placeVerificationCall as never,
      voiceMinuteQuota as never
    );

    return { usecase, humanContactRepository, rateLimit, codes, placeVerificationCall, credits, voiceMinuteQuota };
  }

  const command = () =>
    RequestVoiceVerificationCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      agentId: 'agent1',
      subscriberId: 'alice',
      address: '+1 (415) 555-0123',
    });

  it('dials the spoken code and keeps the previous number until this one is confirmed', async () => {
    const { usecase, placeVerificationCall, codes, credits, voiceMinuteQuota, humanContactRepository } = setup();

    const result = await usecase.execute(command());

    expect(result).to.deep.equal({
      address: '+***0123',
      requestedAt: writtenPending.requestedAt,
      expiresAt: '2026-10-01T12:15:00.000Z',
      retryAfterSeconds: 60,
      replacesVerifiedAddress: true,
    });
    expect(voiceMinuteQuota.reserveMinutes.calledWith('org1', VOICE_VERIFICATION_CALL_MINUTES)).to.equal(true);
    expect(humanContactRepository.upsertPendingAddress.firstCall.args[0]).to.include({
      via: HumanChannelViaEnum.VOICE,
      address: '+14155550123',
    });
    expect(codes.issue.firstCall.args[1]).to.deep.equal({
      address: '+14155550123',
      requestedAt: writtenPending.requestedAt,
    });
    expect(placeVerificationCall.execute.firstCall.args[0].verificationLine).to.include('4, 2, 1, 9, 0, 3');
    expect(placeVerificationCall.execute.firstCall.args[0].toNumber).to.equal('+14155550123');
    expect(credits.accept.called).to.equal(false);
    expect(credits.release.calledOnce).to.equal(true);
  });

  it('puts the previous pending number back when the dial fails', async () => {
    const { usecase, placeVerificationCall, humanContactRepository, rateLimit, codes, credits } = setup();
    placeVerificationCall.execute.rejects(new BadGatewayException({ code: 'voice_invalid_number' }));

    try {
      await usecase.execute(command());
      expect.fail('expected the dial to fail');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
    }

    expect(humanContactRepository.restorePendingAddress.calledOnce).to.equal(true);
    expect(humanContactRepository.restorePendingAddress.firstCall.args[0].pending).to.equal(previousPending);
    expect(rateLimit.release.calledOnce).to.equal(true);
    expect(codes.clear.calledOnce).to.equal(true);
    expect(codes.restore.called).to.equal(false);
    expect(credits.release.calledOnce).to.equal(true);
    expect(credits.accept.called).to.equal(false);
  });

  it('keeps the new code when the dial is not confirmed', async () => {
    const { usecase, placeVerificationCall, humanContactRepository, rateLimit, codes } = setup();
    placeVerificationCall.execute.rejects(new GatewayTimeoutException(unconfirmedVoiceDialBody()));

    try {
      await usecase.execute(command());
      expect.fail('expected the dial to stay unconfirmed');
    } catch (err) {
      expect(err).to.be.instanceOf(GatewayTimeoutException);
    }

    expect(humanContactRepository.restorePendingAddress.called).to.equal(false);
    expect(rateLimit.release.called).to.equal(false);
    expect(codes.clear.called).to.equal(false);
    expect(codes.restore.called).to.equal(false);
  });

  it('puts the previous code back when a resend is rejected', async () => {
    const previousCode = {
      hash: 'old',
      salt: 'salt',
      address: '+15550001111',
      requestedAt: previousPending.requestedAt,
      attempts: 1,
      expiresAt: '2026-10-01T12:10:00.000Z',
    };
    const { usecase, placeVerificationCall, codes, humanContactRepository } = setup();
    codes.issue.resolves({ code: '421903', expiresAt: '2026-10-01T12:15:00.000Z', previous: previousCode });
    placeVerificationCall.execute.rejects(new BadGatewayException({ code: 'voice_invalid_number' }));

    try {
      await usecase.execute(command());
      expect.fail('expected the dial to fail');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
    }

    expect(codes.restore.calledOnce).to.equal(true);
    expect(codes.restore.firstCall.args[1]).to.equal(previousCode);
    expect(codes.clear.called).to.equal(false);
    expect(humanContactRepository.restorePendingAddress.calledOnce).to.equal(true);
  });

  it('rejects a number that is not E.164 before placing a call', async () => {
    const { usecase, placeVerificationCall } = setup();

    try {
      await usecase.execute(
        RequestVoiceVerificationCommand.create({
          environmentId: 'env1',
          organizationId: 'org1',
          agentId: 'agent1',
          subscriberId: 'alice',
          address: '555-0123',
        })
      );
      expect.fail('expected address_invalid');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).to.include({ code: 'address_invalid' });
    }

    expect(placeVerificationCall.execute.called).to.equal(false);
  });

  it('does not dial when voice is disabled', async () => {
    const { usecase, placeVerificationCall } = setup();
    const disabled = new RequestVoiceVerification(
      { execute: sinon.stub() } as never,
      { getFlag: sinon.stub().resolves(false) } as never,
      { assertAllowed: sinon.stub().resolves() } as never,
      { findVerifiedAddress: sinon.stub(), findPendingAddress: sinon.stub() } as never,
      { assertAndRecord: sinon.stub() } as never,
      { issue: sinon.stub() } as never,
      placeVerificationCall as never,
      { reserveMinutes: sinon.stub() } as never
    );

    try {
      await disabled.execute(command());
      expect.fail('expected voice disabled');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
    }

    expect(placeVerificationCall.execute.called).to.equal(false);
  });
});
