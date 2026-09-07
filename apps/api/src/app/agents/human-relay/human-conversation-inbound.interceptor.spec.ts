import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { HumanConversationInboundInterceptor } from './human-conversation-inbound.interceptor';

describe('HumanConversationInboundInterceptor', () => {
  function makeTurn(runtime?: string) {
    return {
      agent: { _id: 'agent1', ...(runtime ? { runtime } : {}) },
      event: AgentEventEnum.ON_MESSAGE,
      humanResponse: undefined,
    };
  }

  it('skips conversation inbound for human_relay', async () => {
    const inbound = {
      tryHandleMessage: sinon.stub().resolves({ outcome: 'settled', settled: {} }),
      tryHandleAction: sinon.stub().resolves({ outcome: 'settled', settled: {} }),
    };
    const interceptor = new HumanConversationInboundInterceptor(inbound as any);
    const turn = makeTurn('human_relay');

    expect(await interceptor.tryHandleMessage(turn as any)).to.equal(false);
    expect(await interceptor.tryHandleAction(turn as any)).to.equal(false);
    expect(inbound.tryHandleMessage.called).to.equal(false);
    expect(inbound.tryHandleAction.called).to.equal(false);
  });

  it('attaches humanResponse and lets the turn dispatch when settled', async () => {
    const inbound = {
      tryHandleMessage: sinon.stub().resolves({
        outcome: 'settled',
        settled: {
          identifier: 'hi_1',
          requestId: 'hr_1',
          kind: HumanInteractionKindEnum.ASK,
          status: HumanInteractionStatusEnum.ANSWERED,
        },
      }),
    };
    const interceptor = new HumanConversationInboundInterceptor(inbound as any);
    const turn = makeTurn();

    expect(await interceptor.tryHandleMessage(turn as any)).to.equal(false);
    expect(turn.humanResponse).to.include({ requestId: 'hr_1', interactionId: 'hi_1' });
  });

  it('consumes the turn when a managed novu_human interaction settles', async () => {
    const inbound = {
      tryHandleMessage: sinon.stub().resolves({
        outcome: 'settled',
        settled: {
          identifier: 'hi_1',
          requestId: 'novu_human:ses_1:sevt_1',
          kind: HumanInteractionKindEnum.APPROVE,
          status: HumanInteractionStatusEnum.APPROVED,
        },
      }),
    };
    const interceptor = new HumanConversationInboundInterceptor(inbound as any);
    const turn = makeTurn('managed');

    expect(await interceptor.tryHandleMessage(turn as any)).to.equal(true);
    expect(turn.humanResponse).to.include({ requestId: 'novu_human:ses_1:sevt_1', interactionId: 'hi_1' });
  });

  it('consumes the turn when inbound handled it without a settlement', async () => {
    const inbound = {
      tryHandleMessage: sinon.stub().resolves({ outcome: 'consumed' }),
    };
    const interceptor = new HumanConversationInboundInterceptor(inbound as any);

    expect(await interceptor.tryHandleMessage(makeTurn() as any)).to.equal(true);
  });

  it('lets ordinary messages fall through', async () => {
    const inbound = {
      tryHandleMessage: sinon.stub().resolves({ outcome: 'ignored' }),
    };
    const interceptor = new HumanConversationInboundInterceptor(inbound as any);

    expect(await interceptor.tryHandleMessage(makeTurn() as any)).to.equal(false);
  });
});
