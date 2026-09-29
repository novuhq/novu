import { ConversationActivitySenderTypeEnum } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanInteractionActivityRecorder } from './human-interaction-activity.recorder';

describe('HumanInteractionActivityRecorder', () => {
  function setup() {
    const conversationService = {
      getConversation: sinon.stub().resolves({ _id: 'conv1' }),
      getPrimaryChannel: sinon.stub().returns({
        platform: 'slack',
        _integrationId: 'int-1',
        platformThreadId: 'thread-1',
      }),
      persistHumanInteractionRequest: sinon.stub().resolves(undefined),
      persistHumanInteractionResponse: sinon.stub().resolves(undefined),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ identifier: 'support-bot' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const recorder = new HumanInteractionActivityRecorder(
      conversationService as any,
      agentRepository as any,
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

    return { recorder, conversationService, interaction };
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

  it('skips tool-approval HITL rows so they stay on the tool approval ledger', async () => {
    const { recorder, conversationService, interaction } = setup();

    await recorder.recordRequest({ ...interaction, requestId: 'tool_approval:apr_1' } as any);
    await recorder.recordResponse({ ...interaction, requestId: 'tool_approval:apr_1' } as any);

    expect(conversationService.persistHumanInteractionRequest.called).to.equal(false);
    expect(conversationService.persistHumanInteractionResponse.called).to.equal(false);
  });
});
