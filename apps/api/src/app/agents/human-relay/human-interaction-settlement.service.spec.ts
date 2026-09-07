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
      logger as any
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
      logger as any
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
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      resumeManagedHuman as any,
      logger as any
    );

    await service.settle({ _id: 'hi1', _environmentId: 'env1' } as any, HumanInteractionStatusEnum.APPROVED);

    expect(resumeManagedHuman.execute.calledOnceWithExactly(settled)).to.equal(true);
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
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionSettlementService(
      humanInteractionRepository as any,
      outboundGateway as any,
      resumeManagedHuman as any,
      logger as any
    );

    await service.expireIfOverdue(pending as any);

    expect(resumeManagedHuman.execute.calledOnceWithExactly(expired)).to.equal(true);
  });
});
