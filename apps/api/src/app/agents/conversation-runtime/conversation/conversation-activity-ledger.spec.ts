import { ConversationActivityTypeEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConversationActivityLedger } from './conversation-activity-ledger';

describe('ConversationActivityLedger', () => {
  const lifecycleParams = {
    conversationId: 'conv-1',
    channel: {
      platform: 'agent_chat',
      _integrationId: 'int-1',
      platformThreadId: 'thread-1',
    },
    agentIdentifier: 'agent-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    runId: 'run-abc',
    event: { type: 'run-start' } as const,
  };

  function makeLedger(createRunActivity: sinon.SinonStub) {
    return new ConversationActivityLedger({ createRunActivity } as any, { mint: sinon.stub().resolves(7) } as any);
  }

  it('stamps the minted sequence so lifecycle rows interleave with messages in order', async () => {
    const createRunActivity = sinon.stub().resolves({
      _id: 'run-1',
      type: ConversationActivityTypeEnum.RUN_START,
      sequence: 7,
    });

    await makeLedger(createRunActivity).persistProtocolEvent(lifecycleParams);

    expect(createRunActivity.firstCall.args[0].sequence).to.equal(7);
    expect(createRunActivity.firstCall.args[0].identifier).to.equal('run_run-abc_start');
  });

  it('returns null when the same run event is ingested twice so it is published once', async () => {
    const createRunActivity = sinon.stub().rejects(Object.assign(new Error('dup'), { code: 11000 }));

    const activity = await makeLedger(createRunActivity).persistProtocolEvent(lifecycleParams);

    expect(activity).to.equal(null);
  });

  it('propagates non-duplicate write failures to the caller', async () => {
    const createRunActivity = sinon.stub().rejects(new Error('mongo down'));

    try {
      await makeLedger(createRunActivity).persistProtocolEvent(lifecycleParams);
      expect.fail('expected persistProtocolEvent to reject');
    } catch (err) {
      expect((err as Error).message).to.equal('mongo down');
    }
  });
});
