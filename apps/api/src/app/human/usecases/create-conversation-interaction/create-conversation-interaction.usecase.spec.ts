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
      card: { title: 'Deploy?' },
      requestId: 'hr_1',
    };

    return { usecase, command, humanInteractionRepository, outboundGateway };
  }

  it('persists and delivers a posted card on card', async () => {
    const { usecase, command, humanInteractionRepository, outboundGateway } = setup();
    const card = { type: 'card' as const, title: 'Refund $25?', children: [] };

    await usecase.execute({ ...command, card } as any);

    expect(humanInteractionRepository.create.firstCall.args[0].content).to.deep.equal({ card });
    expect(outboundGateway.deliver.firstCall.args[1]).to.deep.equal({ card });
  });

  it('persists a posted choose card without requiring chrome options', async () => {
    const { usecase, command, humanInteractionRepository } = setup();
    const card = {
      type: 'card' as const,
      title: 'Which region?',
      children: [
        { type: 'button', id: 'human:hr_1:opt:us-east', label: 'US' },
        { type: 'button', id: 'human:hr_1:opt:eu-west', label: 'EU' },
      ],
    };

    await usecase.execute({ ...command, kind: HumanInteractionKindEnum.CHOOSE, card } as any);

    expect(humanInteractionRepository.create.firstCall.args[0].content).to.deep.equal({ card });
  });

  it('mints pending chrome buttons from actionIdentifier', async () => {
    const { usecase, command, outboundGateway } = setup();

    await usecase.execute({ ...command, actionIdentifier: 'hr_1' } as any);

    const delivered = outboundGateway.deliver.firstCall.args[1];
    const buttons = delivered.card.children
      .filter((child: { type: string }) => child.type === 'actions')
      .flatMap((child: { children: Array<{ id: string }> }) => child.children);
    expect(buttons.map((button: { id: string }) => button.id)).to.deep.equal(['human:hr_1:deny', 'human:hr_1:approve']);
  });

  it('rejects chrome without a title', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({ ...command, card: { subtitle: 'no title' } } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('creates, delivers, and stamps the conversation on the interaction', async () => {
    const { usecase, command, humanInteractionRepository, outboundGateway } = setup();

    const result = await usecase.execute(command as any);

    expect(humanInteractionRepository.create.calledOnce).to.equal(true);
    expect(humanInteractionRepository.create.firstCall.args[0]).to.include({
      kind: HumanInteractionKindEnum.APPROVE,
      requestId: 'hr_1',
      _agentId: 'agent1',
      _conversationId: 'conv1',
    });
    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['sub-1']);
    expect(humanInteractionRepository.create.firstCall.args[0]).to.not.have.property('subscriberId');
    expect(humanInteractionRepository.create.firstCall.args[0]).to.not.have.property('platform');
    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2]).to.deep.include({
      _conversationId: 'conv1',
    });
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2]).to.not.have.property('platformMessageId');
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].deliveries).to.have.length(1);
    expect(result.deliveries?.[0]?.platformMessageId).to.equal('msg-1');
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
        card: { title: 'Deploy?', options: ['only-one'] },
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('rejects a posted choose card without option buttons', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({
        ...command,
        kind: HumanInteractionKindEnum.CHOOSE,
        card: { type: 'card', title: 'Which region?', children: [] },
      } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('rejects a posted approve card with more than four extra actions', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({
        ...command,
        card: {
          type: 'card',
          title: 'Deploy?',
          children: [
            { type: 'button', id: 'human:hr_1:approve', label: 'Approve' },
            { type: 'button', id: 'human:hr_1:deny', label: 'Deny' },
            { type: 'button', id: 'human:hr_1:opt:a', label: 'A' },
            { type: 'button', id: 'human:hr_1:opt:b', label: 'B' },
            { type: 'button', id: 'human:hr_1:opt:c', label: 'C' },
            { type: 'button', id: 'human:hr_1:opt:d', label: 'D' },
            { type: 'button', id: 'human:hr_1:opt:e', label: 'E' },
          ],
        },
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

    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['alice', 'bob']);
    expect(outboundGateway.deliver.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].subscriberIds).to.equal(undefined);
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
