import { ConversationActivitySenderTypeEnum } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanInteractionActivityRecorder } from './human-interaction-activity.recorder';

describe('HumanInteractionActivityRecorder', () => {
  function setup() {
    const conversationService = {
      getConversation: sinon
        .stub()
        .resolves({ _id: 'conv1', _agentId: 'agent1', channels: [{ platformThreadId: 'thread-1' }] }),
      getPrimaryChannel: sinon.stub().callsFake((conversation: { _id: string }) => ({
        platform: 'slack',
        _integrationId: 'int-1',
        platformThreadId: conversation._id === 'conv1' ? 'thread-1' : `thread-of-${conversation._id}`,
      })),
      // Each chat has its own thread: `thread-1` is Ada's `conv1`, `thread-2` is Bob's `conv2`.
      findByPlatformThread: sinon
        .stub()
        .callsFake(async (_env: string, _org: string, _agent: string, _integration: string, thread: string) => ({
          _id: thread === 'thread-1' ? 'conv1' : 'conv2',
          _agentId: 'agent1',
          channels: [{ platformThreadId: thread }],
        })),
      persistHumanInteractionRequest: sinon.stub().resolves(undefined),
      persistHumanInteractionResponse: sinon.stub().resolves(undefined),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ identifier: 'support-bot' }),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ _id: 'int-1' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const recorder = new HumanInteractionActivityRecorder(
      conversationService as any,
      agentRepository as any,
      integrationRepository as any,
      logger as any
    );
    const interaction = {
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.ASK,
      status: HumanInteractionStatusEnum.ANSWERED,
      content: { cardChrome: { title: 'Which env?' } },
      requestId: 'hr_1',
      _conversationId: 'conv1',
      _agentId: 'agent1',
      _environmentId: 'env1',
      _organizationId: 'org1',
      response: {
        type: 'text',
        text: 'staging',
        respondedBy: 'Ada',
        respondedBySubscriberId: 'sub-1',
        respondedAt: '2026-09-21T12:00:00.000Z',
      },
      deliveries: [
        {
          subscriberId: 'sub-1',
          integrationIdentifier: 'slack-main',
          platform: 'slack',
          platformMessageId: 'msg-1',
          platformThreadId: 'thread-1',
        },
      ],
    };

    return { recorder, conversationService, integrationRepository, interaction };
  }

  /** The same interaction sent to Ada and Bob, each in their own thread: `conv1` and `conv2`. */
  function sentToTwo(base: ReturnType<typeof setup>['interaction']) {
    return {
      ...base,
      subscriberIds: ['sub-1', 'sub-2'],
      deliveries: [
        ...base.deliveries,
        {
          subscriberId: 'sub-2',
          integrationIdentifier: 'slack-main',
          platform: 'slack',
          platformMessageId: 'msg-2',
          platformThreadId: 'thread-2',
        },
      ],
    };
  }

  it('persists a HITL request against the conversation ledger', async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordRequest(interaction as any);

    expect(conversationService.persistHumanInteractionRequest.calledOnce).to.equal(true);
    expect(conversationService.persistHumanInteractionRequest.firstCall.args[0]).to.include({
      conversationId: 'conv1',
      interactionIdentifier: 'hi_1',
      kind: HumanInteractionKindEnum.ASK,
      title: 'Which env?',
      actorType: ConversationActivitySenderTypeEnum.AGENT,
      actorId: 'support-bot',
      platformMessageId: 'msg-1',
    });
  });

  it('persists a HITL response with the human actor', async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordResponse(interaction as any);

    expect(conversationService.persistHumanInteractionResponse.calledOnce).to.equal(true);
    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.include({
      status: HumanInteractionStatusEnum.ANSWERED,
      text: 'staging',
      actorType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
      actorId: 'sub-1',
      actorName: 'Ada',
    });
  });

  it('keeps a send with one delivery to its own thread, without looking for others', async () => {
    const { recorder, conversationService, integrationRepository, interaction } = setup();

    await recorder.recordRequest(interaction as any);
    await recorder.recordResponse(interaction as any);

    expect(conversationService.persistHumanInteractionRequest.calledOnce).to.equal(true);
    expect(conversationService.persistHumanInteractionRequest.firstCall.args[0]).to.not.have.property('inOtherThread');
    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.include({
      conversationId: 'conv1',
    });
    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.not.have.property('inOtherThread');
    expect(integrationRepository.findOne.called).to.equal(false);
    expect(conversationService.findByPlatformThread.called).to.equal(false);
  });

  it('records a send to several contacts in the thread of each of them', async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordRequest(sentToTwo(interaction) as any);

    expect(conversationService.findByPlatformThread.getCalls().map((call) => call.args)).to.deep.equal([
      ['env1', 'org1', 'agent1', 'int-1', 'thread-1'],
      ['env1', 'org1', 'agent1', 'int-1', 'thread-2'],
    ]);
    expect(conversationService.persistHumanInteractionRequest.callCount).to.equal(2);
    const [first, second] = conversationService.persistHumanInteractionRequest.getCalls().map((call) => call.args[0]);
    expect(first).to.include({ conversationId: 'conv1', platformMessageId: 'msg-1' });
    expect(first).to.not.have.property('inOtherThread');
    expect(second).to.include({
      conversationId: 'conv2',
      interactionIdentifier: 'hi_1',
      platformMessageId: 'msg-2',
      inOtherThread: true,
    });
    expect(second.channel).to.include({ platformThreadId: 'thread-of-conv2' });
  });

  it("records the question in every thread when the interaction kept a later delivery's thread", async () => {
    const { recorder, conversationService, interaction } = setup();
    // Ada's thread was made, but the interaction was filed under Bob's.
    conversationService.getConversation.resolves({
      _id: 'conv2',
      _agentId: 'agent1',
      channels: [{ platformThreadId: 'thread-2' }],
    });

    await recorder.recordRequest({ ...sentToTwo(interaction), _conversationId: 'conv2' } as any);

    const [first, second] = conversationService.persistHumanInteractionRequest.getCalls().map((call) => call.args[0]);
    expect(conversationService.persistHumanInteractionRequest.callCount).to.equal(2);
    expect(first).to.include({ conversationId: 'conv2', platformMessageId: 'msg-2' });
    expect(first).to.not.have.property('inOtherThread');
    expect(second).to.include({ conversationId: 'conv1', platformMessageId: 'msg-1', inOtherThread: true });
  });

  it('records a send once in a thread that two deliveries share', async () => {
    const { recorder, conversationService, interaction } = setup();
    conversationService.findByPlatformThread.resolves({
      _id: 'conv1',
      _agentId: 'agent1',
      channels: [{ platformThreadId: 'thread-1' }],
    });

    await recorder.recordRequest(sentToTwo(interaction) as any);

    expect(conversationService.persistHumanInteractionRequest.calledOnce).to.equal(true);
  });

  it('records the answer in the thread it came in', async () => {
    const { recorder, conversationService, interaction } = setup();
    const answeredByBob = {
      ...sentToTwo(interaction),
      response: { ...interaction.response, respondedBy: 'Bob', respondedBySubscriberId: 'sub-2' },
    };

    await recorder.recordResponse(
      answeredByBob as any,
      {
        _id: 'conv2',
        _agentId: 'agent1',
        channels: [{ platformThreadId: 'thread-2' }],
      } as any
    );

    expect(conversationService.persistHumanInteractionResponse.calledOnce).to.equal(true);
    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.include({
      conversationId: 'conv2',
      platformMessageId: 'msg-2',
      inOtherThread: true,
      actorId: 'sub-2',
      actorName: 'Bob',
    });
    expect(conversationService.findByPlatformThread.called).to.equal(false);
  });

  it('records the answer in the thread it came in, even from a subscriber no delivery names', async () => {
    const { recorder, conversationService, interaction } = setup();
    // The same Slack user, resolved to another subscriber than the one the question went to.
    const answered = {
      ...sentToTwo(interaction),
      response: { ...interaction.response, respondedBySubscriberId: 'sub-9' },
    };

    await recorder.recordResponse(
      answered as any,
      { _id: 'conv2', _agentId: 'agent1', channels: [{ platformThreadId: 'thread-2' }] } as any
    );

    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.include({
      conversationId: 'conv2',
      inOtherThread: true,
    });
  });

  it('records the answer of the first contact, and an expiry, in the first thread', async () => {
    const { recorder, conversationService, interaction } = setup();
    const expired = {
      ...sentToTwo(interaction),
      status: HumanInteractionStatusEnum.EXPIRED,
      response: undefined,
    };

    await recorder.recordResponse(
      sentToTwo(interaction) as any,
      {
        _id: 'conv1',
        _agentId: 'agent1',
        channels: [{ platformThreadId: 'thread-1' }],
      } as any
    );
    await recorder.recordResponse(expired as any);

    expect(conversationService.findByPlatformThread.called).to.equal(false);
    for (const call of conversationService.persistHumanInteractionResponse.getCalls()) {
      expect(call.args[0]).to.include({ conversationId: 'conv1' });
      expect(call.args[0]).to.not.have.property('inOtherThread');
    }
  });

  it("keeps an answer in the first thread when it came in another agent's conversation", async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordResponse(sentToTwo(interaction) as any, { _id: 'conv9', _agentId: 'agent9' } as any);

    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.include({
      conversationId: 'conv1',
    });
    expect(conversationService.persistHumanInteractionResponse.firstCall.args[0]).to.not.have.property('inOtherThread');
  });

  it('skips tool-approval HITL rows so they stay on the tool approval ledger', async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordRequest({ ...interaction, requestId: 'tool_approval:apr_1' } as any);
    await recorder.recordResponse({ ...interaction, requestId: 'tool_approval:apr_1' } as any);

    expect(conversationService.persistHumanInteractionRequest.called).to.equal(false);
    expect(conversationService.persistHumanInteractionResponse.called).to.equal(false);
  });
});
