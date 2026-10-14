import { EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { stub } from 'sinon';

import { pinUnsetAgentInboxDomains } from './pin-agent-inbox-domain';

describe('pin-agent-inbox-domain migration', () => {
  it('pins every agent inbox integration that has no inboxDomain to the Connect domain', async () => {
    const updateMany = stub().resolves({ matchedCount: 4, modifiedCount: 4 });

    const result = await pinUnsetAgentInboxDomains(updateMany, 'agentconnect.sh');

    expect(result).to.deep.equal({ matchedCount: 4, modifiedCount: 4 });
    expect(updateMany.calledOnce).to.equal(true);

    const [filter, update] = updateMany.firstCall.args;
    expect(filter).to.deep.equal({
      providerId: { $in: [EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.AgentEmailInbox] },
      'credentials.inboxDomain': { $exists: false },
    });
    expect(update).to.deep.equal({
      $set: { 'credentials.inboxDomain': 'agentconnect.sh' },
    });
  });
});
