import { expect } from 'chai';
import sinon from 'sinon';
import { EnsureNovuHumanSkill } from './ensure-novu-human-skill.service';

describe('EnsureNovuHumanSkill', () => {
  function setup() {
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const service = new EnsureNovuHumanSkill(logger as any);

    return { service, logger };
  }

  it('uploads and attaches when the agent has no Read tool and no other skills', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(provider as any, undefined);

    expect(provider.uploadSkill.calledOnce).to.equal(true);
    expect(skills).to.deep.equal([{ type: 'custom', skillId: 'skill_hitl', version: 'v1' }]);
  });

  it('uploads and attaches onto an empty skills list', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(provider as any, []);

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

  it('attaches on reconcile when Read is off and no other skills exist', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
      getConfig: sinon.stub().resolves({ tools: [{ type: 'builtin', externalId: 'bash' }], skills: [] }),
      updateConfig: sinon.stub().resolves({}),
    };

    await service.reconcile(provider as any, 'agent_1');

    expect(provider.uploadSkill.calledOnce).to.equal(true);
    expect(provider.updateConfig.calledOnce).to.equal(true);
    expect(provider.updateConfig.firstCall.args[1].skills).to.deep.equal([
      { type: 'custom', skillId: 'skill_hitl', version: 'v1' },
    ]);
  });

  it('re-pins the skill version when the same skill id already exists', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v2' }),
      getConfig: sinon.stub().resolves({
        tools: [{ type: 'builtin', externalId: 'read' }],
        skills: [{ type: 'custom', skillId: 'skill_hitl', version: 'v1' }],
      }),
      updateConfig: sinon.stub().resolves({}),
    };

    await service.reconcile(provider as any, 'agent_1');

    expect(provider.updateConfig.calledOnce).to.equal(true);
    expect(provider.updateConfig.firstCall.args[1].skills).to.deep.equal([
      { type: 'custom', skillId: 'skill_hitl', version: 'v2' },
    ]);
  });

  it('skips updateConfig when the skill is already pinned to the uploaded version', async () => {
    const { service } = setup();
    const existing = [{ type: 'custom' as const, skillId: 'skill_hitl', version: 'v1' }];
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
      getConfig: sinon.stub().resolves({ tools: [], skills: existing }),
      updateConfig: sinon.stub().resolves({}),
    };

    await service.reconcile(provider as any, 'agent_1');

    expect(provider.updateConfig.called).to.equal(false);
  });

  it('merges next to existing skills', async () => {
    const { service } = setup();
    const provider = {
      capabilities: { skills: true },
      uploadSkill: sinon.stub().resolves({ skillId: 'skill_hitl', version: 'v1' }),
    };

    const skills = await service.mergeForCreate(provider as any, [{ type: 'anthropic', skillId: 'xlsx' }]);

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

    const skills = await service.mergeForCreate(provider as any, existing);

    expect(skills).to.equal(existing);
  });
});
