import { HttpException } from '@nestjs/common';
import { ConversationParticipantTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanInboxService } from '../../services/human-inbox.service';
import { HumanKeylessCapService } from '../../services/human-keyless-cap.service';
import { ReplyInboxThread } from './reply-inbox-thread.usecase';

describe('ReplyInboxThread', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  function setup(usedInteractions: number) {
    const conversation = {
      _id: 'conv1',
      identifier: 'conv_1',
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'ada' }],
      channels: [{ platform: 'telegram', _integrationId: 'int1', platformThreadId: 'thread-1' }],
    };
    const humanInteractionRepository = { count: sinon.stub().resolves(usedInteractions) };
    const deliveryService = {
      resolveChannel: sinon.stub().resolves({ integrationIdentifier: 'telegram-main', platform: 'telegram' }),
      deliverContent: sinon.stub().resolves({ platformMessageId: 'cta-1' }),
    };
    const connectClaimTokenService = {
      issueOrGetForEnvironment: sinon.stub().resolves({ token: 'tok' }),
      isSignupCtaPosted: sinon.stub().resolves(false),
      tryMarkSignupCtaPosted: sinon.stub().resolves(true),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const keylessCap = new HumanKeylessCapService(
      humanInteractionRepository as any,
      deliveryService as any,
      connectClaimTokenService as any,
      logger as any
    );
    const inbox = new HumanInboxService(
      {
        findOne: sinon
          .stub()
          .resolves({ _id: 'agent1', identifier: 'human-relay', name: 'Relay', runtime: 'human_relay' }),
      } as any,
      { findByAgentAndIdentifier: sinon.stub().resolves(conversation) } as any,
      {} as any,
      {} as any,
      { findOne: sinon.stub().resolves({ identifier: 'telegram-main' }) } as any,
      keylessCap
    );
    sinon.stub(inbox, 'markRead').resolves();
    sinon.stub(inbox, 'toThread').resolves({ id: 'conv_1' } as any);
    const outboundGateway = { deliver: sinon.stub().resolves({ messageId: 'msg-1' }) };
    const usecase = new ReplyInboxThread(inbox, outboundGateway as any);
    const command = {
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      identifier: 'conv_1',
      text: 'hi',
    };

    return { usecase, command, outboundGateway, deliveryService, humanInteractionRepository };
  }

  it('delivers outside keyless organizations without counting the demo allowance', async () => {
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless-org';
    const { usecase, command, outboundGateway, humanInteractionRepository } = setup(100);

    const result = await usecase.execute(command as any);

    expect(result.messageId).to.equal('msg-1');
    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(humanInteractionRepository.count.called).to.equal(false);
  });

  it('refuses with the keyless 429 once the demo allowance is used, sending the sign-up card instead', async () => {
    process.env.KEYLESS_ORGANIZATION_ID = 'org1';
    process.env.KEYLESS_HUMAN_INTERACTION_CAP = '5';
    const { usecase, command, outboundGateway, deliveryService } = setup(5);

    let thrown: unknown;
    try {
      await usecase.execute(command as any);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).to.be.instanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).to.equal(429);
    expect(((thrown as HttpException).getResponse() as Record<string, unknown>).code).to.equal(
      'KEYLESS_HUMAN_CAP_REACHED'
    );
    expect(outboundGateway.deliver.called).to.equal(false);
    expect(deliveryService.resolveChannel.firstCall.args[0].subscriberId).to.equal('ada');
    expect(deliveryService.deliverContent.calledOnce).to.equal(true);
  });

  it('still delivers for a keyless organization under the allowance', async () => {
    process.env.KEYLESS_ORGANIZATION_ID = 'org1';
    process.env.KEYLESS_HUMAN_INTERACTION_CAP = '5';
    const { usecase, command, outboundGateway } = setup(4);

    await usecase.execute(command as any);

    expect(outboundGateway.deliver.calledOnce).to.equal(true);
  });
});
