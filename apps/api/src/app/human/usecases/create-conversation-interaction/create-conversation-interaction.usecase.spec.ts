import { BadRequestException, HttpException } from '@nestjs/common';
import { ConversationParticipantTypeEnum } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateConversationInteraction } from './create-conversation-interaction.usecase';

describe('CreateConversationInteraction', () => {
  function setup() {
    const created = {
      _id: 'hi1',
      identifier: 'hi_abc',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.PENDING,
      _environmentId: 'env1',
    };
    const humanInteractionRepository = {
      countPendingForSubscriber: sinon.stub().resolves(0),
      create: sinon.stub().resolves(created),
      stampDelivery: sinon.stub().resolves(undefined),
      markDeliveredIfPending: sinon.stub().resolves({ ...created, status: HumanInteractionStatusEnum.DELIVERED }),
      delete: sinon.stub().resolves(undefined),
    };
    const outboundGateway = {
      deliver: sinon.stub().resolves({ messageId: 'msg-1', platformThreadId: 'thread-1' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new CreateConversationInteraction(
      humanInteractionRepository as any,
      outboundGateway as any,
      logger as any
    );
    const conversation = {
      _id: 'conv1',
      _agentId: 'agent1',
      participants: [{ type: ConversationParticipantTypeEnum.SUBSCRIBER, id: 'sub-1' }],
    };
    const channel = { platform: 'slack', platformThreadId: 'thread-1' };
    const command = {
      userId: 'user1',
      environmentId: 'env1',
      organizationId: 'org1',
      conversation,
      channel,
      agentIdentifier: 'human-hitl',
      integrationIdentifier: 'slack-main',
      kind: HumanInteractionKindEnum.APPROVE,
      prompt: 'Deploy?',
      requestId: 'hr_1',
    };

    return { usecase, command, humanInteractionRepository, outboundGateway };
  }

  it('creates, delivers, and stamps the conversation on the interaction', async () => {
    const { usecase, command, humanInteractionRepository, outboundGateway } = setup();

    const result = await usecase.execute(command as any);

    expect(humanInteractionRepository.create.calledOnce).to.equal(true);
    expect(humanInteractionRepository.create.firstCall.args[0]).to.include({
      kind: HumanInteractionKindEnum.APPROVE,
      requestId: 'hr_1',
      subscriberId: 'sub-1',
      _agentId: 'agent1',
      _conversationId: 'conv1',
    });
    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['sub-1']);
    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2]).to.deep.include({
      platformMessageId: 'msg-1',
      _conversationId: 'conv1',
    });
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].deliveries).to.have.length(1);
    expect(result.platformMessageId).to.equal('msg-1');
    expect(result._conversationId).to.equal('conv1');
  });

  it('marks tell interactions delivered after a successful send', async () => {
    const { usecase, command, humanInteractionRepository } = setup();
    humanInteractionRepository.create.resolves({
      _id: 'hi1',
      identifier: 'hi_abc',
      kind: HumanInteractionKindEnum.TELL,
      status: HumanInteractionStatusEnum.PENDING,
      _environmentId: 'env1',
    });

    const result = await usecase.execute({ ...command, kind: HumanInteractionKindEnum.TELL } as any);

    expect(humanInteractionRepository.markDeliveredIfPending.calledOnce).to.equal(true);
    expect(result.status).to.equal(HumanInteractionStatusEnum.DELIVERED);
  });

  it('rejects when the conversation has no subscriber participant', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({
        ...command,
        conversation: { ...command.conversation, participants: [] },
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('rejects choose without at least two options', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({
        ...command,
        kind: HumanInteractionKindEnum.CHOOSE,
        options: ['only-one'],
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('enforces the pending-cap before creating a non-tell interaction', async () => {
    const { usecase, command, humanInteractionRepository } = setup();
    humanInteractionRepository.countPendingForSubscriber.resolves(25);

    try {
      await usecase.execute(command as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(429);
    }
    expect(humanInteractionRepository.create.called).to.equal(false);
  });

  it('honors signal `to` as the settlement allow-list and still posts one card', async () => {
    const { usecase, command, humanInteractionRepository, outboundGateway } = setup();

    await usecase.execute({ ...command, to: ['alice', 'bob'] } as any);

    expect(humanInteractionRepository.create.firstCall.args[0].subscriberId).to.equal('alice');
    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['alice', 'bob']);
    expect(outboundGateway.deliver.calledOnce).to.equal(true);
  });

  it('allows explicit `to` when the conversation has no subscriber participant', async () => {
    const { usecase, command, humanInteractionRepository } = setup();

    await usecase.execute({
      ...command,
      to: 'alice',
      conversation: { ...command.conversation, participants: [] },
    } as any);

    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['alice']);
  });

  it('enforces the pending-cap against every listed recipient', async () => {
    const { usecase, command, humanInteractionRepository } = setup();
    humanInteractionRepository.countPendingForSubscriber.onFirstCall().resolves(0);
    humanInteractionRepository.countPendingForSubscriber.onSecondCall().resolves(25);

    try {
      await usecase.execute({ ...command, to: ['alice', 'bob'] } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect((err as HttpException).getStatus()).to.equal(429);
      expect((err as HttpException).message).to.include('bob');
    }
    expect(humanInteractionRepository.create.called).to.equal(false);
  });
});
