import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { buildManagedHumanToolResult, ResumeManagedHuman } from './resume-managed-human.usecase';

describe('buildManagedHumanToolResult', () => {
  it('marks denied/expired/canceled as not ok and never approved', () => {
    const denied = buildManagedHumanToolResult({
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.DENIED,
      response: { type: 'option', optionId: 'deny', respondedAt: '2026-01-01T00:00:00.000Z' },
    } as any);
    const expired = buildManagedHumanToolResult({
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.EXPIRED,
    } as any);
    const canceled = buildManagedHumanToolResult({
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.CANCELED,
    } as any);

    expect(denied).to.include({ ok: false, approved: false, optionId: 'deny', expired: false });
    expect(expired).to.include({ ok: false, expired: true });
    expect(expired.approved).to.equal(undefined);
    expect(canceled).to.include({ ok: false, status: 'canceled', expired: false });
    expect(canceled.approved).to.equal(undefined);
  });

  it('reports a failed voice call with its reason and does not treat it as expiry', () => {
    const failed = buildManagedHumanToolResult({
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.FAILED,
      voiceFailure: { code: 'voice_busy', message: 'The line was busy.' },
    } as any);

    expect(failed).to.include({ ok: false, expired: false, status: 'failed' });
    expect(failed.voiceFailure).to.deep.equal({ code: 'voice_busy', message: 'The line was busy.' });
    expect(failed.instruction).to.equal('The line was busy.');
  });
});

describe('ResumeManagedHuman', () => {
  function setup() {
    const agentRepository = { findOne: sinon.stub().resolves({ identifier: 'ship-bot' }) };
    const managedAgentService = { sendToolResult: sinon.stub().resolves(undefined) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new ResumeManagedHuman(agentRepository as any, managedAgentService as any, logger as any);

    return { usecase, agentRepository, managedAgentService };
  }

  it('skips when the row has no delivery', async () => {
    const { usecase, managedAgentService } = setup();

    await usecase.execute({
      requestId: 'novu_human:ses_1:sevt_1',
      _conversationId: 'conv1',
      _agentId: 'agent1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.APPROVED,
    } as any);

    expect(managedAgentService.sendToolResult.called).to.equal(false);
  });

  it('skips framework HITL request ids', async () => {
    const { usecase, agentRepository, managedAgentService } = setup();

    await usecase.execute({
      requestId: 'hr_1',
      _conversationId: 'conv1',
    } as any);

    expect(agentRepository.findOne.called).to.equal(false);
    expect(managedAgentService.sendToolResult.called).to.equal(false);
  });
});
