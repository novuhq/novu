import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';

import { setSubscriberAccessDefaultsOnUnsetAgents } from './agent-subscriber-access-default.migration';

describe('agent-subscriber-access-default migration', () => {
  it('sets managed unset agents to open and self-hosted unset agents to restricted', async () => {
    const updateMany = stub();
    updateMany.onFirstCall().resolves({ matchedCount: 2, modifiedCount: 2 });
    updateMany.onSecondCall().resolves({ matchedCount: 1, modifiedCount: 1 });

    const result = await setSubscriberAccessDefaultsOnUnsetAgents(updateMany);

    expect(result).to.deep.equal({
      managedOpen: { matchedCount: 2, modifiedCount: 2 },
      selfHostedRestricted: { matchedCount: 1, modifiedCount: 1 },
    });
    expect(updateMany.calledTwice).to.equal(true);

    const [managedFilter, managedUpdate] = updateMany.firstCall.args;
    expect(managedFilter).to.deep.equal({
      'behavior.subscriberAccess': { $exists: false },
      runtime: 'managed',
      managedRuntime: { $exists: true, $ne: null },
    });
    expect(managedUpdate).to.deep.equal({
      $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.OPEN },
    });

    const [selfHostedFilter, selfHostedUpdate] = updateMany.secondCall.args;
    expect(selfHostedFilter).to.deep.equal({
      'behavior.subscriberAccess': { $exists: false },
      $nor: [{ runtime: 'managed', managedRuntime: { $exists: true, $ne: null } }],
    });
    expect(selfHostedUpdate).to.deep.equal({
      $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.RESTRICTED },
    });
  });
});
