import { BadGatewayException, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { CreateInteraction } from './create-interaction.usecase';

describe('CreateInteraction', () => {
  function setup() {
    const created = {
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.APPROVE,
      status: HumanInteractionStatusEnum.PENDING,
      card: { title: 'Deploy?' },
      subscriberIds: ['sub-1'],
      expiresAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      _environmentId: 'env1',
      _id: 'hi1',
    };
    const humanInteractionRepository = {
      countPendingForSubscriber: sinon.stub().resolves(0),
      create: sinon.stub().resolves(created),
      stampDelivery: sinon.stub().resolves(undefined),
      markDeliveredIfPending: sinon.stub().resolves({ ...created, status: HumanInteractionStatusEnum.DELIVERED }),
      delete: sinon.stub().resolves(undefined),
    };
    const agentRepository = {
      findOne: sinon.stub(),
    };
    const deliveryService = {
      resolveChannel: sinon.stub().resolves({
        integrationIdentifier: 'telegram-main',
        platform: 'telegram',
        platformUserId: '777',
      }),
      deliver: sinon.stub().resolves({ platformMessageId: 'msg-1', platformThreadId: 'thread-1' }),
    };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new CreateInteraction(
      humanInteractionRepository as any,
      agentRepository as any,
      deliveryService as any,
      logger as any
    );
    const command = {
      userId: 'user1',
      environmentId: 'env1',
      organizationId: 'org1',
      kind: HumanInteractionKindEnum.APPROVE,
      card: { title: 'Deploy?' },
      to: 'sub-1',
      agentIdentifier: 'human-hitl',
    };

    return {
      usecase,
      command,
      created,
      agentRepository,
      deliveryService,
      humanInteractionRepository,
    };
  }

  it('resolves the named agent, creates the interaction, and DMs that agent', async () => {
    const { usecase, command, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });

    const result = await usecase.execute(command as any);

    expect(deliveryService.resolveChannel.calledOnce).to.equal(true);
    expect(deliveryService.resolveChannel.firstCall.args[0]).to.include({
      agentId: 'agent-hitl',
      subscriberId: 'sub-1',
    });
    expect(humanInteractionRepository.create.firstCall.args[0]).to.include({
      _agentId: 'agent-hitl',
      kind: HumanInteractionKindEnum.APPROVE,
    });
    expect(humanInteractionRepository.create.firstCall.args[0].content.cardChrome.title).to.equal('Deploy?');
    expect(humanInteractionRepository.create.firstCall.args[0].subscriberIds).to.deep.equal(['sub-1']);
    expect(humanInteractionRepository.create.firstCall.args[0]).to.not.have.property('subscriberId');
    expect(humanInteractionRepository.create.firstCall.args[0]).to.not.have.property('platform');
    expect(deliveryService.deliver.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].deliveries).to.have.length(1);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2]).to.not.have.property('platformMessageId');
    expect(result.id).to.equal('hi_1');
    expect(result.to).to.deep.equal(['sub-1']);
    expect(result.platform).to.equal('telegram');
    expect(result.integrationIdentifier).to.equal('telegram-main');
  });

  it('defaults to the human-relay agent when agentIdentifier is omitted', async () => {
    const { usecase, command, agentRepository, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'relay-1', identifier: 'human-relay', runtime: 'human_relay' });

    await usecase.execute({ ...command, agentIdentifier: undefined } as any);

    expect(agentRepository.findOne.firstCall.args[0].identifier).to.equal('human-relay');
    expect(humanInteractionRepository.create.firstCall.args[0]._agentId).to.equal('relay-1');
  });

  it('tells the caller to run human setup when the default relay agent is missing', async () => {
    const { usecase, command, agentRepository } = setup();
    agentRepository.findOne.resolves(null);

    try {
      await usecase.execute({ ...command, agentIdentifier: undefined } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('human setup');
    }
  });

  it('throws when a named agent is missing', async () => {
    const { usecase, command, agentRepository } = setup();
    agentRepository.findOne.resolves(null);

    try {
      await usecase.execute(command as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('human-hitl');
    }
  });

  it('rejects choose without options', async () => {
    const { usecase, command } = setup();

    try {
      await usecase.execute({ ...command, kind: HumanInteractionKindEnum.CHOOSE } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
    }
  });

  it('accepts a posted choose card whose options are action buttons', async () => {
    const { usecase, command, agentRepository, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    const card = {
      type: 'card' as const,
      title: 'Which region?',
      children: [
        { type: 'button', id: 'human:hi_1:opt:us-east', label: 'US' },
        { type: 'button', id: 'human:hi_1:opt:eu-west', label: 'EU' },
      ],
    };

    await usecase.execute({ ...command, kind: HumanInteractionKindEnum.CHOOSE, card } as any);

    expect(humanInteractionRepository.create.firstCall.args[0].content).to.deep.equal({ card });
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

  it('enforces the pending-cap before creating a non-tell interaction', async () => {
    const { usecase, command, agentRepository, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
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

  it('skips the pending-cap and marks tell delivered after send', async () => {
    const { usecase, command, created, agentRepository, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    humanInteractionRepository.create.resolves({
      ...created,
      kind: HumanInteractionKindEnum.TELL,
    });

    const result = await usecase.execute({ ...command, kind: HumanInteractionKindEnum.TELL } as any);

    expect(humanInteractionRepository.countPendingForSubscriber.called).to.equal(false);
    expect(humanInteractionRepository.markDeliveredIfPending.calledOnce).to.equal(true);
    expect(result.status).to.equal(HumanInteractionStatusEnum.DELIVERED);
  });

  it('deletes the row when delivery never reached the platform', async () => {
    const { usecase, command, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    deliveryService.deliver.rejects(new Error('telegram down'));

    try {
      await usecase.execute(command as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(BadGatewayException);
    }
    expect(humanInteractionRepository.delete.calledOnce).to.equal(true);
  });

  it('fans out DMs when `to` lists multiple subscribers', async () => {
    const { usecase, command, created, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    deliveryService.resolveChannel
      .onFirstCall()
      .resolves({ integrationIdentifier: 'telegram-main', platform: 'telegram', platformUserId: '777' });
    deliveryService.resolveChannel
      .onSecondCall()
      .resolves({ integrationIdentifier: 'telegram-main', platform: 'telegram', platformUserId: '888' });
    deliveryService.deliver.onFirstCall().resolves({ platformMessageId: 'msg-1', platformThreadId: 'thread-1' });
    deliveryService.deliver.onSecondCall().resolves({ platformMessageId: 'msg-2', platformThreadId: 'thread-2' });
    humanInteractionRepository.create.resolves({ ...created, subscriberIds: ['sub-1', 'sub-2'] });

    const result = await usecase.execute({ ...command, to: ['sub-1', 'sub-2'] } as any);

    expect(deliveryService.resolveChannel.calledTwice).to.equal(true);
    expect(deliveryService.deliver.calledTwice).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].deliveries).to.have.length(2);
    expect(result.to).to.deep.equal(['sub-1', 'sub-2']);
  });

  it('fails before create when a listed recipient has no linked channel', async () => {
    const { usecase, command, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    deliveryService.resolveChannel.onFirstCall().resolves({
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
      platformUserId: '777',
    });
    deliveryService.resolveChannel
      .onSecondCall()
      .rejects(new NotFoundException('Human "sub-2" has no linked channel. Run `human invite sub-2`.'));

    try {
      await usecase.execute({ ...command, to: ['sub-1', 'sub-2'] } as any);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
      expect((err as NotFoundException).message).to.include('human invite');
    }
    expect(humanInteractionRepository.create.called).to.equal(false);
  });

  it('keeps the row, stamps successful deliveries, and returns failedTo when some fan-out sends fail', async () => {
    const { usecase, command, created, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    deliveryService.resolveChannel.resolves({
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
      platformUserId: '777',
    });
    deliveryService.deliver.onFirstCall().resolves({ platformMessageId: 'msg-1', platformThreadId: 'thread-1' });
    deliveryService.deliver.onSecondCall().rejects(new Error('down'));
    humanInteractionRepository.create.resolves({ ...created, subscriberIds: ['sub-1', 'sub-2'] });

    const result = await usecase.execute({ ...command, to: ['sub-1', 'sub-2'] } as any);

    expect(humanInteractionRepository.delete.called).to.equal(false);
    expect(humanInteractionRepository.stampDelivery.calledOnce).to.equal(true);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].deliveries).to.have.length(1);
    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].subscriberIds).to.deep.equal(['sub-1']);
    expect(result.to).to.deep.equal(['sub-1']);
    expect(result.failedTo).to.deep.equal(['sub-2']);
    expect(result.id).to.equal('hi_1');
  });

  it('moves the primary subscriber to the first successful delivery when the original primary fails', async () => {
    const { usecase, command, created, agentRepository, deliveryService, humanInteractionRepository } = setup();
    agentRepository.findOne.resolves({ _id: 'agent-hitl', identifier: 'human-hitl' });
    deliveryService.resolveChannel.resolves({
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
      platformUserId: '777',
    });
    deliveryService.deliver.onFirstCall().rejects(new Error('down'));
    deliveryService.deliver.onSecondCall().resolves({ platformMessageId: 'msg-2', platformThreadId: 'thread-2' });
    humanInteractionRepository.create.resolves({
      ...created,
      subscriberId: 'sub-1',
      subscriberIds: ['sub-1', 'sub-2'],
    });

    const result = await usecase.execute({ ...command, to: ['sub-1', 'sub-2'] } as any);

    expect(humanInteractionRepository.stampDelivery.firstCall.args[2].subscriberIds).to.deep.equal(['sub-2']);
    expect(result.to).to.deep.equal(['sub-2']);
    expect(result.failedTo).to.deep.equal(['sub-1']);
  });
});
