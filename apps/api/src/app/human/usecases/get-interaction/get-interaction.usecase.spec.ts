import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetInteractionCommand } from './get-interaction.command';
import { GetInteraction } from './get-interaction.usecase';

describe('GetInteraction', () => {
  function setup(interaction: Record<string, unknown>) {
    const row = {
      _id: 'hi-row-1',
      identifier: 'hi_1',
      kind: HumanInteractionKindEnum.APPROVE,
      content: { cardChrome: { title: 'Ship it?' } },
      subscriberIds: ['bob'],
      _environmentId: 'env1',
      _organizationId: 'org1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-10-27T10:00:00.000Z',
      ...interaction,
    };
    const repository = {
      findByIdentifier: sinon.stub().resolves(row),
      markAnswerRead: sinon.stub().resolves(undefined),
    };
    const settlement = { expireIfOverdue: sinon.stub().callsFake(async (found: unknown) => found) };
    const usecase = new GetInteraction(repository as any, settlement as any);
    const command = GetInteractionCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      identifier: 'hi_1',
    });

    return { usecase, repository, command };
  }

  it('notes that the agent read a person’s answer, so the listener leaves it out', async () => {
    const { usecase, repository, command } = setup({
      status: HumanInteractionStatusEnum.APPROVED,
      response: { type: 'approval', respondedBySubscriberId: 'carol', respondedAt: '2026-10-27T10:05:00.000Z' },
    });

    const read = await usecase.execute(command);

    expect(read.status).to.equal(HumanInteractionStatusEnum.APPROVED);
    expect(repository.markAnswerRead.calledOnceWith('env1', 'hi-row-1')).to.equal(true);
  });

  it('notes nothing while the question waits, once its answer was read, or for what no person settled', async () => {
    for (const interaction of [
      { status: HumanInteractionStatusEnum.PENDING },
      { status: HumanInteractionStatusEnum.EXPIRED },
      { status: HumanInteractionStatusEnum.DELIVERED, kind: HumanInteractionKindEnum.TELL },
      {
        status: HumanInteractionStatusEnum.ANSWERED,
        response: { type: 'text', text: 'prod', respondedAt: '2026-10-27T10:05:00.000Z' },
        answerReadAt: '2026-10-27T10:05:01.000Z',
      },
    ]) {
      const { usecase, repository, command } = setup(interaction);

      await usecase.execute(command);

      expect(repository.markAnswerRead.called, interaction.status).to.equal(false);
    }
  });
});
