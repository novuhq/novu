import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanInteractionSettlementService } from './human-interaction-settlement.service';

describe('HumanInteractionSettlementService', () => {
  it('edits every fan-out delivery after settle', async () => {
    const humanInteractionRepository = {
      settleIfPending: sinon.stub().callsFake(async (_env, _id, status, response) => ({
        _id: 'hi1',
        identifier: 'hi_1',
        _environmentId: 'env1',
        _agentId: 'agent1',
        kind: HumanInteractionKindEnum.APPROVE,
        status,
        response,
        subscriberIds: ['sub-1', 'sub-2'],
        deliveries: [
          {
            subscriberId: 'sub-1',
            integrationIdentifier: 'telegram-main',
            platform: 'telegram',
            platformMessageId: 'msg-1',
            platformThreadId: 'thread-1',
          },
          {
            subscriberId: 'sub-2',
            integrationIdentifier: 'telegram-main',
            platform: 'telegram',
            platformMessageId: 'msg-2',
            platformThreadId: 'thread-2',
          },
        ],
      })),
    };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      { execute: sinon.stub().resolves(undefined) } as any,
      { execute: sinon.stub().resolves(undefined) } as any,
      logger as any,
      { recordRequest: sinon.stub().resolves(), recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved: sinon.stub().resolves() } as any
    );

    await service.settle(
      { _id: 'hi1', _environmentId: 'env1', identifier: 'hi_1' } as any,
      HumanInteractionStatusEnum.APPROVED,
      { type: 'option', optionId: 'approve', respondedAt: '2026-01-01T00:00:00.000Z' }
    );

    expect(outboundGateway.editInConversation.calledTwice).to.equal(true);
    expect(outboundGateway.editInConversation.firstCall.args[4]).to.equal('msg-1');
    expect(outboundGateway.editInConversation.secondCall.args[4]).to.equal('msg-2');
  });

  it('skips the card edit when the row has no deliveries', async () => {
    const humanInteractionRepository = {
      settleIfPending: sinon.stub().resolves({
        _id: 'hi1',
        identifier: 'hi_1',
        _environmentId: 'env1',
        _agentId: 'agent1',
        kind: HumanInteractionKindEnum.APPROVE,
        status: HumanInteractionStatusEnum.APPROVED,
        subscriberIds: ['sub-1'],
      }),
    };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      { execute: sinon.stub().resolves(undefined) } as any,
      { execute: sinon.stub().resolves(undefined) } as any,
      logger as any,
      { recordRequest: sinon.stub().resolves(), recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved: sinon.stub().resolves() } as any
    );

    await service.settle(
      { _id: 'hi1', _environmentId: 'env1', identifier: 'hi_1' } as any,
      HumanInteractionStatusEnum.APPROVED
    );

    expect(outboundGateway.editInConversation.called).to.equal(false);
  });

  it('resumes a managed HITL session after settle', async () => {
    const settled = {
      _id: 'hi1',
      identifier: 'hi_1',
      requestId: 'novu_human:ses_1:sevt_1',
      _environmentId: 'env1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.APPROVED,
    };
    const humanInteractionRepository = {
      settleIfPending: sinon.stub().resolves(settled),
    };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const resumeManagedHuman = { execute: sinon.stub().resolves(undefined) };
    const resumeToolApprovalFromHitl = { execute: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      resumeManagedHuman as any,
      resumeToolApprovalFromHitl as any,
      logger as any,
      { recordRequest: sinon.stub().resolves(), recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved: sinon.stub().resolves() } as any
    );

    await service.settle({ _id: 'hi1', _environmentId: 'env1' } as any, HumanInteractionStatusEnum.APPROVED);

    expect(resumeManagedHuman.execute.calledOnceWithExactly(settled)).to.equal(true);
    expect(resumeToolApprovalFromHitl.execute.calledOnceWithExactly(settled)).to.equal(true);
  });

  it('resumes a managed HITL session after lazy expiry actually flips the row', async () => {
    const pending = {
      _id: 'hi1',
      identifier: 'hi_1',
      requestId: 'novu_human:ses_1:sevt_1',
      _environmentId: 'env1',
      status: HumanInteractionStatusEnum.PENDING,
      expiresAt: '2020-01-01T00:00:00.000Z',
    };
    const expired = { ...pending, status: HumanInteractionStatusEnum.EXPIRED };
    const humanInteractionRepository = {
      expireIfOverdue: sinon.stub().resolves(expired),
    };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const resumeManagedHuman = { execute: sinon.stub().resolves(undefined) };
    const resumeToolApprovalFromHitl = { execute: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      resumeManagedHuman as any,
      resumeToolApprovalFromHitl as any,
      logger as any,
      { recordRequest: sinon.stub().resolves(), recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved: sinon.stub().resolves() } as any
    );

    await service.expireIfOverdue(pending as any);

    expect(resumeManagedHuman.execute.calledOnceWithExactly(expired)).to.equal(true);
    expect(resumeToolApprovalFromHitl.execute.calledOnceWithExactly(expired)).to.equal(true);
  });

  it('releases voice minutes once when a call never connects, and not on a second webhook', async () => {
    const delivery = {
      platform: 'voice',
      platformMessageId: 'conv_1',
      platformThreadId: 'CA1',
      subscriberId: 'sub-1',
      integrationIdentifier: 'voice-main',
    };
    const reason = { code: 'voice_busy' as const, message: 'The line was busy.' };
    const marked = {
      _id: 'hi1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.PENDING,
      voiceMinutesReserved: 5,
      voiceMinutesReservedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      voiceSubscriberIds: [],
      deliveries: [{ ...delivery, voiceFailure: reason }],
    };
    const failed = { ...marked, status: HumanInteractionStatusEnum.FAILED, voiceFailure: reason };
    const humanInteractionRepository = {
      markVoiceDeliveryFailed: sinon.stub().onFirstCall().resolves(marked).onSecondCall().resolves(null),
      failVoiceIfOpen: sinon.stub().resolves(failed),
      findByIdentifier: sinon.stub().resolves(failed),
      takeVoiceMinutes: sinon.stub().resolves({ minutes: 5, reservedAt: '2026-01-01T00:00:00.000Z' }),
    };
    const outboundGateway = { editInConversation: sinon.stub().resolves(undefined) };
    const releaseReserved = sinon.stub().resolves();
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      { execute: sinon.stub().resolves() } as any,
      { execute: sinon.stub().resolves() } as any,
      { setContext: sinon.stub(), warn: sinon.stub() } as any,
      { recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved } as any
    );
    const pending = {
      _id: 'hi1',
      identifier: 'hi_1',
      _environmentId: 'env1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.PENDING,
      deliveries: [delivery],
    } as any;

    await service.failVoiceCall(pending, reason, 'conv_1');
    await service.failVoiceCall(pending, reason, 'conv_1');

    expect(releaseReserved.calledOnce).to.equal(true);
    expect(releaseReserved.firstCall.args[0]).to.equal('org1');
    expect(releaseReserved.firstCall.args[1]).to.equal(5);
    expect(outboundGateway.editInConversation.called).to.equal(false);
    expect(humanInteractionRepository.takeVoiceMinutes.calledOnce).to.equal(true);
  });

  it('closes a call that was already marked when the first attempt did not finish', async () => {
    const delivery = {
      platform: 'voice',
      platformMessageId: 'conv_1',
      platformThreadId: 'CA1',
      subscriberId: 'sub-1',
      integrationIdentifier: 'voice-main',
    };
    const reason = { code: 'voice_busy' as const, message: 'The line was busy.' };
    const marked = {
      _id: 'hi1',
      identifier: 'hi_1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.PENDING,
      voiceMinutesReserved: 5,
      voiceMinutesReservedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      voiceSubscriberIds: [],
      deliveries: [{ ...delivery, voiceFailure: reason }],
    };
    const failed = { ...marked, status: HumanInteractionStatusEnum.FAILED, voiceFailure: reason };
    const humanInteractionRepository = {
      markVoiceDeliveryFailed: sinon.stub().resolves(null),
      findByIdentifier: sinon.stub().resolves(marked),
      failVoiceIfOpen: sinon.stub().resolves(failed),
      takeVoiceMinutes: sinon.stub().resolves({ minutes: 5, reservedAt: '2026-01-01T00:00:00.000Z' }),
    };
    const releaseReserved = sinon.stub().resolves();
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      { editInConversation: sinon.stub().resolves() } as any,
      { execute: sinon.stub().resolves() } as any,
      { execute: sinon.stub().resolves() } as any,
      { setContext: sinon.stub(), warn: sinon.stub() } as any,
      { recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved } as any
    );

    await service.failVoiceCall(
      {
        _id: 'hi1',
        identifier: 'hi_1',
        _environmentId: 'env1',
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.PENDING,
        deliveries: [delivery],
      } as any,
      reason,
      'conv_1'
    );

    expect(humanInteractionRepository.failVoiceIfOpen.calledOnce).to.equal(true);
    expect(releaseReserved.calledOnce).to.equal(true);
    expect(releaseReserved.firstCall.args[1]).to.equal(5);
  });

  it('keeps the interaction open when another recipient can still answer', async () => {
    const reason = { code: 'voice_busy' as const, message: 'The line was busy.' };
    const marked = {
      _id: 'hi1',
      _environmentId: 'env1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.PENDING,
      voiceSubscriberIds: [],
      deliveries: [
        {
          platform: 'voice',
          platformMessageId: 'conv_1',
          platformThreadId: 'CA1',
          subscriberId: 'sub-1',
          integrationIdentifier: 'voice-main',
          voiceFailure: reason,
        },
        {
          platform: 'telegram',
          platformMessageId: 'msg-2',
          platformThreadId: 'thread-2',
          subscriberId: 'sub-2',
          integrationIdentifier: 'telegram-main',
        },
      ],
    };
    const humanInteractionRepository = {
      markVoiceDeliveryFailed: sinon.stub().resolves(marked),
      failVoiceIfOpen: sinon.stub().resolves(null),
    };
    const releaseReserved = sinon.stub().resolves();
    const resume = sinon.stub().resolves();
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      { editInConversation: sinon.stub().resolves() } as any,
      { execute: resume } as any,
      { execute: sinon.stub().resolves() } as any,
      { setContext: sinon.stub(), warn: sinon.stub() } as any,
      { recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved } as any
    );
    const pending = {
      _id: 'hi1',
      _environmentId: 'env1',
      kind: HumanInteractionKindEnum.ASK,
      deliveries: marked.deliveries.map((delivery) => ({ ...delivery, voiceFailure: undefined })),
    } as any;

    const result = await service.failVoiceCall(pending, reason, 'conv_1');

    expect(result).to.equal(marked);
    expect(humanInteractionRepository.failVoiceIfOpen.called).to.equal(false);
    expect(releaseReserved.called).to.equal(false);
    expect(resume.called).to.equal(false);
  });

  it('records a busy tell after the dial was accepted', async () => {
    const reason = { code: 'voice_busy' as const, message: 'The line was busy.' };
    const delivery = {
      platform: 'voice',
      platformMessageId: 'conv_1',
      platformThreadId: 'CA1',
      subscriberId: 'sub-1',
      integrationIdentifier: 'voice-main',
    };
    const marked = {
      _id: 'hi1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.TELL,
      status: HumanInteractionStatusEnum.DELIVERED,
      deliveries: [{ ...delivery, voiceFailure: reason }],
    };
    const failed = { ...marked, status: HumanInteractionStatusEnum.FAILED, voiceFailure: reason };
    const humanInteractionRepository = {
      markVoiceDeliveryFailed: sinon.stub().resolves(marked),
      failVoiceIfOpen: sinon.stub().resolves(failed),
    };
    const releaseReserved = sinon.stub().resolves();
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      { editInConversation: sinon.stub().resolves() } as any,
      { execute: sinon.stub().resolves() } as any,
      { execute: sinon.stub().resolves() } as any,
      { setContext: sinon.stub(), warn: sinon.stub() } as any,
      { recordResponse: sinon.stub().resolves() } as any,
      { releaseReserved } as any
    );

    await service.failVoiceCall(
      {
        _id: 'hi1',
        _environmentId: 'env1',
        kind: HumanInteractionKindEnum.TELL,
        status: HumanInteractionStatusEnum.DELIVERED,
        deliveries: [delivery],
      } as any,
      reason,
      'conv_1'
    );

    expect(humanInteractionRepository.failVoiceIfOpen.calledOnce).to.equal(true);
    expect(humanInteractionRepository.failVoiceIfOpen.firstCall.args[3]).to.deep.equal([
      HumanInteractionStatusEnum.PENDING,
      HumanInteractionStatusEnum.DELIVERED,
    ]);
    expect(releaseReserved.called).to.equal(false);
  });
});
