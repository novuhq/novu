import { AgentRepository } from '@novu/dal';
import { expect } from 'chai';
import { AgentTestContext, setupAgentTestContext } from './helpers/agent-test-setup';

const agentRepository = new AgentRepository();

const PAID_PLAN_RULE = { in: [{ var: 'context.tenant.data.plan' }, ['pro', 'enterprise']] };

describe('Agent access rule #novu-v2', () => {
  let ctx: AgentTestContext;

  before(() => {
    process.env.IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
  });

  after(() => {
    delete process.env.IS_CONVERSATIONAL_AGENTS_ENABLED;
    delete process.env.IS_SUBSCRIBER_TOKENS_ENABLED;
  });

  beforeEach(async () => {
    process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'true';
    ctx = await setupAgentTestContext();
  });

  function patchBehavior(behavior: Record<string, unknown>) {
    return ctx.session.testAgent.patch(`/v1/agents/${ctx.agentIdentifier}`).send({ behavior });
  }

  async function setRule(accessRule: Record<string, unknown>) {
    const res = await patchBehavior({ subscriberAccess: 'rule', accessRule });
    expect(res.status, JSON.stringify(res.body)).to.equal(200);
  }

  async function storedBehavior() {
    const res = await ctx.session.testAgent.get(`/v1/agents/${ctx.agentIdentifier}`);
    expect(res.status).to.equal(200);

    return res.body.data.behavior;
  }

  describe('saving a rule', () => {
    it('stores a valid rule, returns it, and clears it when the agent leaves rule mode', async () => {
      const res = await patchBehavior({ subscriberAccess: 'rule', accessRule: PAID_PLAN_RULE });

      expect(res.status).to.equal(200);
      expect(res.body.data.behavior.subscriberAccess).to.equal('rule');
      expect(res.body.data.behavior.accessRule).to.deep.equal(PAID_PLAN_RULE);

      const unrelated = await patchBehavior({ acknowledgeOnReceived: false });
      expect(unrelated.status).to.equal(200);
      expect((await storedBehavior())?.accessRule).to.deep.equal(PAID_PLAN_RULE);

      const restricted = await patchBehavior({ subscriberAccess: 'restricted' });
      expect(restricted.status).to.equal(200);
      expect(restricted.body.data.behavior.accessRule).to.equal(undefined);
      expect((await storedBehavior())?.accessRule).to.equal(undefined);
    });

    it('rejects rule mode without a rule, and a rule without rule mode', async () => {
      const missing = await patchBehavior({ subscriberAccess: 'rule' });
      expect(missing.status).to.equal(400);

      const orphan = await patchBehavior({ subscriberAccess: 'open', accessRule: PAID_PLAN_RULE });
      expect(orphan.status).to.equal(400);

      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
      expect((await storedBehavior())?.accessRule).to.equal(undefined);
    });

    it('rejects clearing the rule with null while the agent stays in rule mode', async () => {
      await setRule(PAID_PLAN_RULE);

      const res = await patchBehavior({ accessRule: null });

      expect(res.status).to.equal(422);
      expect((await storedBehavior())?.accessRule).to.deep.equal(PAID_PLAN_RULE);
    });

    it('rejects rules that are not JSON Logic over subscriber and context', async () => {
      const invalidRules: Record<string, unknown>[] = [
        { log: { var: 'subscriber.email' } },
        { '==': [{ var: 'workflow.name' }, 'x'] },
        { '==': [{ var: 'payload.region' }, 'eu'] },
        { '==': [{ var: 'subscriber.email' }, 'a@b.co'], '!=': [{ var: 'subscriber.email' }, 'c@d.co'] },
        {},
        { '==': [{ var: 'subscriber.constructor.name' }, 'Object'] },
        { notNull: { var: 'subscriber.toString' } },
        { notNull: { var: 'subscriber.data.__proto__' } },
        { notNull: { var: 'context.tenant.constructor' } },
        { '==': [{ var: 'subscriber.channels.0.credentials.apiKey' }, 'secret'] },
      ];

      for (const accessRule of invalidRules) {
        const res = await patchBehavior({ subscriberAccess: 'rule', accessRule });
        expect(res.status, `rule ${JSON.stringify(accessRule)} -> ${JSON.stringify(res.body)}`).to.equal(400);
      }

      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
    });

    it('accepts an unrelated update on an agent whose stored rule no longer validates', async () => {
      await agentRepository.update(
        { _id: ctx.agentId, _environmentId: ctx.session.environment._id },
        { $set: { 'behavior.subscriberAccess': 'rule', 'behavior.accessRule': { log: 'not allowed' } } }
      );

      const res = await patchBehavior({ acknowledgeOnReceived: false });

      expect(res.status, JSON.stringify(res.body)).to.equal(200);
    });

    it('refuses rule mode while the signed subscriber tokens flag is off', async () => {
      process.env.IS_SUBSCRIBER_TOKENS_ENABLED = 'false';

      const res = await patchBehavior({ subscriberAccess: 'rule', accessRule: PAID_PLAN_RULE });

      expect(res.status).to.equal(403);
      expect((await storedBehavior())?.subscriberAccess).to.equal('open');
    });
  });
});
