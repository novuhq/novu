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
      prompt: 'Deploy?',
      subscriberId: 'sub-1',
      integrationIdentifier: 'telegram-main',
      platform: 'telegram',
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
      prompt: 'Deploy?',
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
      subscriberId: 'sub-1',
      kind: HumanInteractionKindEnum.APPROVE,
      prompt: 'Deploy?',
    });
    expect(deliveryService.deliver.calledOnce).to.equal(true);
    expect(result.id).to.equal('hi_1');
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
});
