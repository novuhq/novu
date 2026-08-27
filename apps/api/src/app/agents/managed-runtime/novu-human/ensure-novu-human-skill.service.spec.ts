import { expect } from 'chai';
import sinon from 'sinon';
import { EnsureNovuHumanSkill } from './ensure-novu-human-skill.service';

describe('EnsureNovuHumanSkill', () => {
  function setup() {
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new EnsureNovuHumanSkill(logger as any);

    return { service, logger };
  }

  it('skips upload when Read is off and no other skills are attached', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(provider as any, ['bash'], undefined);

    expect(skills).to.equal(undefined);
    expect(provider.uploadSkill.called).to.equal(false);
  });

  it('uploads and merges when Read is enabled', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(provider as any, ['read'], []);

    expect(provider.uploadSkill.calledOnce).to.equal(true);
    expect(skills).to.deep.equal([{ type: 'custom', skillId: 'skill_hitl', version: 'v1' }]);
  });

  it('attaches on reconcile when other skills already exist', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
      getConfig: sinon.stub().resolves({
        tools: [],
        skills: [{ type: 'anthropic', skillId: 'xlsx' }],
      }),
      updateConfig: sinon.stub().resolves({}),
    };

    await service.reconcile(provider as any, 'agent_1');

    expect(provider.updateConfig.calledOnce).to.equal(true);
    expect(provider.updateConfig.firstCall.args[1].skills).to.deep.equal([
      { type: 'anthropic', skillId: 'xlsx' },
      { type: 'custom', skillId: 'skill_hitl', version: 'v1' },
    ]);
  });

  it('does not force-enable Read when reconcile finds neither Read nor skills', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
      getConfig: sinon.stub().resolves({ tools: [{ type: 'builtin', externalId: 'bash' }], skills: [] }),
      updateConfig: sinon.stub().resolves({}),
    };

    await service.reconcile(provider as any, 'agent_1');

    expect(provider.uploadSkill.called).to.equal(false);
    expect(provider.updateConfig.called).to.equal(false);
  });

  it('merges when other skills exist even if Read is off', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(
      provider as any,
      ['bash'],
      [{ type: 'anthropic', skillId: 'xlsx' }]
    );

    expect(skills).to.deep.equal([
      { type: 'anthropic', skillId: 'xlsx' },
      { type: 'custom', skillId: 'skill_hitl', version: 'v1' },
    ]);
  });

  it('fail-opens to the existing skills when upload throws', async () => {
    const { service } = setup();
    const existing = [{ type: 'custom' as const, skillId: 'other' }];
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().rejects(new Error('upstream 500')),
    };

    const skills = await service.mergeForCreate(provider as any, ['read'], existing);

    expect(skills).to.equal(existing);
  });
});
