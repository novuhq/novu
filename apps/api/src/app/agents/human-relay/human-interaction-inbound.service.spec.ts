import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { HumanInteractionInboundService } from './human-interaction-inbound.service';
import { toAgentHumanResponse } from './to-agent-human-response';

describe('HumanInteractionInboundService', () => {
  function makeTurn(overrides: Record<string, unknown> = {}) {
    return {
      agentId: 'agent1',
      config: {
        environmentId: 'env1',
        organizationId: 'org1',
        platform: AgentPlatformEnum.SLACK,
        integrationIdentifier: 'slack-main',
      },
      conversation: { _id: 'conv1' },
      subscriber: { subscriberId: 'sub-1' },
      message: { text: 'staging', raw: {} },
      event: AgentEventEnum.ON_MESSAGE,
      thread: { id: 'thread1', channelId: 'channel1', isDM: true },
      platformThreadId: 'thread1',
      ...overrides,
    };
  }

  function setup() {
    const pendingAsk = {
      _id: 'hi1',
      identifier: 'hi_1',
      requestId: 'hr_1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.PENDING,
      prompt: 'First?',
      subscriberId: 'sub-1',
      _environmentId: 'env1',
    };
    const humanInteractionRepository = {
      findByIdentifier: sinon.stub().resolves(null),
      findPendingByPlatformMessageId: sinon.stub().resolves(null),
      findPendingAsksByConversation: sinon.stub().resolves([]),
      findPendingAsks: sinon.stub().resolves([]),
    };
    const settlement = {
      expireIfOverdue: sinon.stub().callsFake(async (interaction) => interaction),
      settle: sinon.stub().resolves({
        ...pendingAsk,
        status: HumanInteractionStatusEnum.APPROVED,
        response: { optionId: 'approve', respondedBy: 'sub-1' },
      }),
    };
    const outboundGateway = {
      replyOnThread: sinon.stub().resolves(undefined),
      replyOnThreadWithCard: sinon.stub().resolves(undefined),
    };
    const cacheService = {
      set: sinon.stub().resolves(undefined),
      get: sinon.stub().resolves(null),
      del: sinon.stub().resolves(undefined),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new HumanInteractionInboundService(
      humanInteractionRepository as any,
      settlement as any,
      outboundGateway as any,
      cacheService as any,
      logger as any
    );

    return { service, humanInteractionRepository, settlement, outboundGateway, cacheService, pendingAsk };
  }

  it('ignores non-human actions', async () => {
    const { service } = setup();
    const result = await service.tryHandleAction(
      makeTurn({ action: { id: 'ack' }, event: AgentEventEnum.ON_ACTION }) as any,
      'conversation'
    );

    expect(result).to.deep.equal({ outcome: 'ignored' });
  });

  it('settles an approve click addressed to the conversation subscriber', async () => {
    const { service, humanInteractionRepository, settlement } = setup();
    const pending = {
      _id: 'hi1',
      identifier: 'hi_1',
      requestId: 'hr_1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.PENDING,
      subscriberId: 'sub-1',
      _environmentId: 'env1',
    };
    humanInteractionRepository.findByIdentifier.resolves(pending);

    const result = await service.tryHandleAction(
      makeTurn({
        event: AgentEventEnum.ON_ACTION,
        action: { id: 'human:hi_1:approve' },
        message: null,
        subscriber: { subscriberId: 'sub-1', firstName: 'Ada' },
      }) as any,
      'conversation'
    );

    expect(settlement.settle.calledOnce).to.equal(true);
    expect(settlement.settle.firstCall.args[1]).to.equal(HumanInteractionStatusEnum.APPROVED);
    expect(settlement.settle.firstCall.args[2].respondedBy).to.equal('Ada');
    expect(result.outcome).to.equal('settled');
    expect(result.outcome === 'settled' && result.settled.identifier).to.equal('hi_1');
  });

  it('falls back to subscriberId when firstName is missing', async () => {
    const { service, humanInteractionRepository, settlement } = setup();
    humanInteractionRepository.findByIdentifier.resolves({
      _id: 'hi1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.PENDING,
      subscriberId: 'sub-1',
      _environmentId: 'env1',
    });

    await service.tryHandleAction(
      makeTurn({
        event: AgentEventEnum.ON_ACTION,
        action: { id: 'human:hi_1:approve' },
        message: null,
      }) as any,
      'conversation'
    );

    expect(settlement.settle.firstCall.args[2].respondedBy).to.equal('sub-1');
  });

  it('returns an expired interaction as settled so the agent can see expired: true', async () => {
    const { service, humanInteractionRepository, settlement, outboundGateway } = setup();
    const expired = {
      _id: 'hi1',
      identifier: 'hi_1',
      requestId: 'hr_1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.EXPIRED,
      subscriberId: 'sub-1',
      _environmentId: 'env1',
    };
    humanInteractionRepository.findByIdentifier.resolves(expired);
    settlement.expireIfOverdue.resolves(expired);

    const result = await service.tryHandleAction(
      makeTurn({
        event: AgentEventEnum.ON_ACTION,
        action: { id: 'human:hi_1:approve' },
        message: null,
      }) as any,
      'conversation'
    );

    expect(result.outcome).to.equal('settled');
    expect(result.outcome === 'settled' && result.settled.status).to.equal(HumanInteractionStatusEnum.EXPIRED);
    expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
  });

  it('does not claim a bare conversation message when nothing is pending', async () => {
    const { service, outboundGateway } = setup();
    const result = await service.tryHandleMessage(makeTurn() as any, 'conversation');

    expect(result).to.deep.equal({ outcome: 'ignored' });
    expect(outboundGateway.replyOnThread.called).to.equal(false);
  });

  it('replies "nothing waiting" on the relay path when no ask is pending', async () => {
    const { service, outboundGateway } = setup();
    const result = await service.tryHandleMessage(makeTurn() as any, 'relay');

    expect(result).to.deep.equal({ outcome: 'consumed' });
    expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
    expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('Nothing is waiting');
  });

  it('settles a conversation ask with the inbound text and does not send Got it', async () => {
    const { service, humanInteractionRepository, settlement, outboundGateway, pendingAsk } = setup();
    humanInteractionRepository.findPendingAsksByConversation.resolves([pendingAsk]);
    settlement.settle.resolves({
      ...pendingAsk,
      status: HumanInteractionStatusEnum.ANSWERED,
      response: { type: 'text', text: 'staging', respondedBy: 'sub-1' },
    });

    const result = await service.tryHandleMessage(makeTurn() as any, 'conversation');

    expect(settlement.settle.calledOnce).to.equal(true);
    expect(settlement.settle.firstCall.args[1]).to.equal(HumanInteractionStatusEnum.ANSWERED);
    expect(result.outcome).to.equal('settled');
    expect(result.outcome === 'settled' && result.settled.status).to.equal(HumanInteractionStatusEnum.ANSWERED);
    expect(outboundGateway.replyOnThread.called).to.equal(false);
  });

  it('keeps each ambiguous answer on its own cache key so a later reply cannot overwrite it', async () => {
    const { service, humanInteractionRepository, cacheService, pendingAsk } = setup();
    const otherAsk = { ...pendingAsk, _id: 'hi2', identifier: 'hi_2', requestId: 'hr_2', prompt: 'Second?' };
    humanInteractionRepository.findPendingAsksByConversation.resolves([pendingAsk, otherAsk]);

    await service.tryHandleMessage(
      makeTurn({ message: { id: 'msg-1', text: 'staging', raw: {} } }) as any,
      'conversation'
    );
    await service.tryHandleMessage(
      makeTurn({ message: { id: 'msg-2', text: 'production', raw: {} } }) as any,
      'conversation'
    );

    expect(cacheService.set.firstCall.args[0]).to.equal('human:disamb:conv1:msg-1');
    expect(JSON.parse(cacheService.set.firstCall.args[1])).to.deep.equal({
      text: 'staging',
      subscriberId: 'sub-1',
    });
    expect(cacheService.set.secondCall.args[0]).to.equal('human:disamb:conv1:msg-2');
    expect(JSON.parse(cacheService.set.secondCall.args[1])).to.deep.equal({
      text: 'production',
      subscriberId: 'sub-1',
    });
  });

  it('settles a disambiguation pick with the cached answer bound to that click', async () => {
    const { service, humanInteractionRepository, settlement, cacheService, pendingAsk } = setup();
    humanInteractionRepository.findByIdentifier.resolves(pendingAsk);
    cacheService.get.resolves(JSON.stringify({ text: 'staging', subscriberId: 'sub-1' }));
    settlement.settle.resolves({
      ...pendingAsk,
      status: HumanInteractionStatusEnum.ANSWERED,
      response: { type: 'text', text: 'staging' },
    });

    const result = await service.tryHandleAction(
      makeTurn({
        event: AgentEventEnum.ON_ACTION,
        action: { id: 'human:pick:hi_1:msg-1' },
        message: null,
      }) as any,
      'conversation'
    );

    expect(cacheService.get.firstCall.args[0]).to.equal('human:disamb:conv1:msg-1');
    expect(settlement.settle.firstCall.args[2].text).to.equal('staging');
    expect(cacheService.del.firstCall.args[0]).to.equal('human:disamb:conv1:msg-1');
    expect(result.outcome).to.equal('settled');
  });

  it('does not persist a cached answer written by someone else', async () => {
    const { service, humanInteractionRepository, settlement, cacheService, pendingAsk } = setup();
    humanInteractionRepository.findByIdentifier.resolves(pendingAsk);
    cacheService.get.resolves(JSON.stringify({ text: 'production', subscriberId: 'other-sub' }));

    const result = await service.tryHandleAction(
      makeTurn({
        event: AgentEventEnum.ON_ACTION,
        action: { id: 'human:pick:hi_1:msg-1' },
        message: null,
      }) as any,
      'conversation'
    );

    expect(settlement.settle.called).to.equal(false);
    expect(cacheService.del.called).to.equal(false);
    expect(result.outcome).to.equal('consumed');
  });

  it('sends Got it after settling a relay ask', async () => {
    const { service, humanInteractionRepository, settlement, outboundGateway, pendingAsk } = setup();
    humanInteractionRepository.findPendingAsks.resolves([pendingAsk]);
    settlement.settle.resolves({
      ...pendingAsk,
      status: HumanInteractionStatusEnum.ANSWERED,
      response: { type: 'text', text: 'staging', respondedBy: 'sub-1' },
    });

    const result = await service.tryHandleMessage(makeTurn() as any, 'relay');

    expect(result.outcome).to.equal('settled');
    expect(outboundGateway.replyOnThread.calledOnce).to.equal(true);
    expect(outboundGateway.replyOnThread.firstCall.args[1].markdown).to.include('Got it');
  });
});

describe('toAgentHumanResponse', () => {
  it('maps a settled interaction onto the framework payload', () => {
    expect(
      toAgentHumanResponse({
        identifier: 'hi_1',
        requestId: 'hr_1',
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.ANSWERED,
        response: { text: 'staging', respondedBy: 'sub-1' },
      } as any)
    ).to.deep.equal({
      requestId: 'hr_1',
      interactionId: 'hi_1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.ANSWERED,
      expired: false,
      text: 'staging',
      optionId: undefined,
      respondedBy: 'sub-1',
    });
  });

  it('marks expired interactions', () => {
    expect(
      toAgentHumanResponse({
        identifier: 'hi_1',
        requestId: 'hr_1',
        kind: HumanInteractionKindEnum.APPROVE,
        status: HumanInteractionStatusEnum.EXPIRED,
      } as any).expired
    ).to.equal(true);
  });

  it('falls back to the interaction identifier when requestId is missing', () => {
    expect(
      toAgentHumanResponse({
        identifier: 'hi_1',
        kind: HumanInteractionKindEnum.APPROVE,
        status: HumanInteractionStatusEnum.APPROVED,
      } as any).requestId
    ).to.equal('hi_1');
  });
});
