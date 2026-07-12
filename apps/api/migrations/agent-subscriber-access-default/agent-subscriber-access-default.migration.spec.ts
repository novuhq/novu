import { AgentSubscriberAccessEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';

import { setOpenSubscriberAccessOnUnsetAgents } from './agent-subscriber-access-default.migration';

describe('agent-subscriber-access-default migration', () => {
  it('updates only agents where behavior.subscriberAccess does not exist', async () => {
    const updateMany = stub().resolves({ matchedCount: 3, modifiedCount: 3 });

    const result = await setOpenSubscriberAccessOnUnsetAgents(updateMany);

    expect(result).to.deep.equal({ matchedCount: 3, modifiedCount: 3 });
    expect(updateMany.calledOnce).to.equal(true);

    const [filter, update] = updateMany.firstCall.args;
    expect(filter).to.deep.equal({ 'behavior.subscriberAccess': { $exists: false } });
    expect(update).to.deep.equal({
      $set: { 'behavior.subscriberAccess': AgentSubscriberAccessEnum.OPEN },
    });
  });
});
