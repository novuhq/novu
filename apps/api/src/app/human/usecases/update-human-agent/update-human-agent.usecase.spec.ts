import { expect } from 'chai';
import sinon from 'sinon';
import { UpdateHumanAgentCommand } from './update-human-agent.command';
import { UpdateHumanAgent } from './update-human-agent.usecase';

describe('UpdateHumanAgent', () => {
  const relay = {
    _id: 'relay1',
    identifier: 'human-relay',
    name: 'Atlas',
    runtime: 'human_relay',
    active: true,
    _environmentId: 'env1',
    _organizationId: 'org1',
  };

  function setup(agent: Record<string, unknown> | null = relay) {
    const agentRepository = {
      findOne: sinon.stub().resolves(agent),
      updateOne: sinon.stub().resolves({ matched: 1, modified: 1 }),
    };
    const humanAgentIdentity = { apply: sinon.stub().callsFake(async (existing) => existing) };
    const humanAgentPicture = { describe: sinon.stub().callsFake((described) => described) };
    const usecase = new UpdateHumanAgent(
      agentRepository as never,
      humanAgentIdentity as never,
      humanAgentPicture as never
    );

    return { usecase, agentRepository, humanAgentIdentity };
  }

  function command(fields: Partial<UpdateHumanAgentCommand>) {
    return UpdateHumanAgentCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      ...fields,
    });
  }

  it('lets only contacts reach the agent', async () => {
    const { usecase, agentRepository } = setup();

    const updated = await usecase.execute(command({ reach: 'contacts' }));

    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { reach: 'contacts' } });
    expect(updated).to.include({ reach: 'contacts' });
  });

  it('writes nothing when the agent already has the reach it is given', async () => {
    const { usecase, agentRepository } = setup();

    await usecase.execute(command({ reach: 'anyone' }));

    expect(agentRepository.updateOne.called).to.equal(false);
  });

  it('pauses the agent with the time', async () => {
    const { usecase, agentRepository } = setup();

    const updated = await usecase.execute(command({ paused: true }));
    const { $set } = agentRepository.updateOne.firstCall.args[1];

    expect(Date.parse($set.pausedAt)).to.be.closeTo(Date.now(), 5000);
    expect(updated).to.include({ pausedAt: $set.pausedAt });
  });

  it('keeps the first pause when a paused agent is paused again', async () => {
    const { usecase, agentRepository } = setup({ ...relay, pausedAt: '2026-10-15T08:00:00.000Z' });

    const updated = await usecase.execute(command({ paused: true }));

    expect(agentRepository.updateOne.called).to.equal(false);
    expect(updated).to.include({ pausedAt: '2026-10-15T08:00:00.000Z' });
  });

  it('resumes a paused agent', async () => {
    const { usecase, agentRepository } = setup({ ...relay, pausedAt: '2026-10-15T08:00:00.000Z' });

    const updated = await usecase.execute(command({ paused: false }));

    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $unset: { pausedAt: 1 } });
    expect(updated).to.not.have.property('pausedAt');
  });

  it('renames and changes the settings in one call', async () => {
    const { usecase, humanAgentIdentity, agentRepository } = setup();

    await usecase.execute(command({ name: 'Deploy bot', reach: 'contacts', paused: true }));

    expect(humanAgentIdentity.apply.firstCall.args[1]).to.deep.equal({ name: 'Deploy bot', description: undefined });
    expect(agentRepository.updateOne.firstCall.args[1].$set).to.include({ reach: 'contacts' });
    expect(agentRepository.updateOne.firstCall.args[1].$set).to.have.property('pausedAt');
  });

  it('refuses a call that changes nothing', async () => {
    const { usecase } = setup();

    const error = await usecase.execute(command({})).catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(400);
  });

  it('answers 404 before setup made the agent', async () => {
    const { usecase } = setup(null);

    const error = await usecase.execute(command({ paused: true })).catch((caught: Error) => caught);

    expect((error as { status?: number }).status).to.equal(404);
  });
});
