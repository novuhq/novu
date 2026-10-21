import { BadRequestException } from '@nestjs/common';
import { AGENT_INBOX_EVENTS } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetInboxThreadCommand } from './get-inbox-thread.command';
import { GetInboxThread } from './get-inbox-thread.usecase';

describe('GetInboxThread', () => {
  const agent = { _id: 'relay1', identifier: 'human-relay', name: 'Atlas' };
  const conversation = { _id: 'conv1', identifier: 'thread-1' };
  const thread = { id: 'thread-1', state: 'waiting_on_person', status: 'open' };
  const details = { threadId: 'thread-1', status: 'waiting_on_person', messageCount: 3 };

  function setup(page = { data: [{ identifier: 'm3' }, { identifier: 'm2' }], hasMore: true }) {
    const inbox = {
      resolveRelayAgent: sinon.stub().resolves(agent),
      findThread: sinon.stub().resolves(conversation),
      toThread: sinon.stub().resolves(thread),
      // The repository reads newest first; the thread shows oldest first.
      toMessages: sinon
        .stub()
        .callsFake(async (_scope, _agent, rows: Array<{ identifier: string }>) =>
          [...rows].reverse().map((row) => ({ id: row.identifier }))
        ),
      toDetails: sinon.stub().resolves(details),
    };
    const activityRepository = { findInboxMessages: sinon.stub().resolves(page) };
    const hostStatus = { recordCheck: sinon.stub().resolves() };
    const analyticsService = { track: sinon.stub() };
    const usecase = new GetInboxThread(
      inbox as never,
      activityRepository as never,
      hostStatus as never,
      analyticsService as never
    );

    return { usecase, inbox, activityRepository, hostStatus, analyticsService };
  }

  function command(fields: Partial<GetInboxThreadCommand> = {}) {
    return GetInboxThreadCommand.create({
      environmentId: 'env1',
      organizationId: 'org1',
      userId: 'user1',
      identifier: 'thread-1',
      ...fields,
    });
  }

  it('counts opening the thread for the owner, with the app that asked', async () => {
    const { usecase, analyticsService } = setup();

    await usecase.execute(command({ analyticsSource: 'cli' }));

    expect(analyticsService.track.args).to.deep.equal([
      [AGENT_INBOX_EVENTS.INBOX_ITEM_READ, 'user1', { _organization: 'org1', agentId: 'relay1', source: 'cli' }],
    ]);
  });

  it('does not count the dashboard keeping an open thread up to date', async () => {
    const { usecase, analyticsService } = setup();

    await usecase.execute(command({ analyticsSource: 'dashboard', after: 'm1' }));

    expect(analyticsService.track.called).to.equal(false);
  });

  it('reads the messages that came after a message, with the thread as it stands now', async () => {
    const { usecase, activityRepository } = setup();

    const result = await usecase.execute(command({ after: 'm1', limit: 50, include: 'system' }));

    expect(activityRepository.findInboxMessages.firstCall.args[0]).to.deep.include({
      conversationId: 'conv1',
      limit: 50,
      before: undefined,
      after: 'm1',
      includeSystem: true,
    });
    expect(result.messages.map((message) => message.id)).to.deep.equal(['m2', 'm3']);
    expect(result.hasMore).to.equal(true);
    // A refresh also brings the status chip and the Details box up to date.
    expect(result.thread).to.equal(thread);
    expect(result.details).to.equal(details);
  });

  it('reads the page before a message', async () => {
    const { usecase, activityRepository } = setup({ data: [], hasMore: false });

    const result = await usecase.execute(command({ before: 'm9' }));

    expect(activityRepository.findInboxMessages.firstCall.args[0]).to.deep.include({
      limit: 20,
      before: 'm9',
      after: undefined,
      includeSystem: false,
    });
    expect(result).to.deep.include({ messages: [], hasMore: false });
  });

  it('refuses `before` together with `after` before reading anything', async () => {
    const { usecase, inbox, activityRepository } = setup();

    let error: unknown;
    try {
      await usecase.execute(command({ before: 'm1', after: 'm2' }));
    } catch (caught) {
      error = caught;
    }

    expect(error).to.be.instanceOf(BadRequestException);
    expect(inbox.resolveRelayAgent.called).to.equal(false);
    expect(activityRepository.findInboxMessages.called).to.equal(false);
  });

  it('counts a read through a host as a check of the inbox, also when it reads on', async () => {
    const { usecase, hostStatus } = setup();

    await usecase.execute(command({ after: 'm1', hostVia: 'cli' as never }));

    expect(hostStatus.recordCheck.calledOnce).to.equal(true);
    expect(hostStatus.recordCheck.firstCall.args[2]).to.equal('cli');
  });
});
