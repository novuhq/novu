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

  /** The agent as the database keeps it: updates apply to it, honouring a "not paused yet" filter. */
  function setup(agent: Record<string, unknown> | null = relay) {
    const db: { agent: Record<string, unknown> | null } = { agent: agent ? { ...agent } : null };
    const agentRepository = {
      findOne: sinon.stub().callsFake(async () => (db.agent ? { ...db.agent } : null)),
      updateOne: sinon.stub().callsFake(async (query: Record<string, any>, update: Record<string, any>) => {
        if (!db.agent || (query.pausedAt?.$exists === false && db.agent.pausedAt)) {
          return { matched: 0, modified: 0 };
        }

        const next: Record<string, unknown> = { ...db.agent, ...update.$set };
        for (const key of Object.keys(update.$unset ?? {})) {
          delete next[key];
        }
        db.agent = next;

        return { matched: 1, modified: 1 };
      }),
    };
    const humanAgentIdentity = { apply: sinon.stub().callsFake(async (existing) => existing) };
    const humanAgentPicture = { describe: sinon.stub().callsFake((described) => described) };
    const usecase = new UpdateHumanAgent(
      agentRepository as never,
      humanAgentIdentity as never,
      humanAgentPicture as never
    );

    return { usecase, agentRepository, humanAgentIdentity, db };
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
    const [filter, { $set }] = agentRepository.updateOne.firstCall.args;

    expect(filter).to.include({ _id: 'relay1' });
    expect(filter.pausedAt).to.deep.equal({ $exists: false });
    expect(Date.parse($set.pausedAt)).to.be.closeTo(Date.now(), 5000);
    expect(updated).to.include({ pausedAt: $set.pausedAt });
  });

  it('keeps the first pause when another pause got in between, and answers with it', async () => {
    const { usecase, agentRepository, db } = setup();
    // Read as not paused yet; meanwhile another request paused it.
    agentRepository.findOne.onFirstCall().resolves({ ...relay });
    db.agent = { ...relay, pausedAt: '2026-10-15T08:00:00.000Z' };

    const updated = await usecase.execute(command({ paused: true }));

    expect(db.agent.pausedAt).to.equal('2026-10-15T08:00:00.000Z');
    expect(updated).to.include({ pausedAt: '2026-10-15T08:00:00.000Z' });
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
    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { reach: 'contacts' } });
    expect(agentRepository.updateOne.secondCall.args[1].$set).to.have.property('pausedAt');
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
