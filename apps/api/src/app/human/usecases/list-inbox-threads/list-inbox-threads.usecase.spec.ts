import { AGENT_INBOX_EVENTS } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ListInboxThreadsCommand } from './list-inbox-threads.command';
import { ListInboxThreads } from './list-inbox-threads.usecase';

describe('ListInboxThreads', () => {
  function setup() {
    const inbox = {
      resolveRelayAgent: sinon.stub().resolves({ _id: 'relay1', identifier: 'human-relay' }),
      listThreads: sinon.stub().resolves({ data: [{ id: 'thread-1' }], next: null }),
    };
    const hostStatus = { recordCheck: sinon.stub().resolves() };
    const analyticsService = { track: sinon.stub() };
    const usecase = new ListInboxThreads(inbox as never, hostStatus as never, analyticsService as never);

    return { usecase, analyticsService };
  }

  const base = { environmentId: 'env1', organizationId: 'org1', userId: 'user1' };

  it('counts listing the inbox for the owner, with the app that asked', async () => {
    const { usecase, analyticsService } = setup();

    await usecase.execute(ListInboxThreadsCommand.create({ ...base, analyticsSource: 'mcp' }));

    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.INBOX_LISTED, 'user1', { _organization: 'org1', agentId: 'relay1', source: 'mcp' }],
    ]);
  });

  it('says a request without a source came from the API', async () => {
    const { usecase, analyticsService } = setup();

    await usecase.execute(ListInboxThreadsCommand.create(base));

    expect(analyticsService.track.firstCall.args[2]).to.include({ source: 'api' });
  });

  it('does not count the operator reading the inbox on the dashboard', async () => {
    const { usecase, analyticsService } = setup();

    await usecase.execute(ListInboxThreadsCommand.create({ ...base, analyticsSource: 'dashboard' }));

    expect(analyticsService.track.called).to.equal(false);
  });
});
