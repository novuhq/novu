import { HumanInteractionKindEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { HandleNovuHumanCommand } from './handle-novu-human.command';
import { HandleNovuHuman } from './handle-novu-human.usecase';

describe('HandleNovuHuman', () => {
  function setup(overrides?: { flag?: boolean; input?: Record<string, unknown> }) {
    const conversation = {
      _id: 'conv1',
      _agentId: 'agent1',
      participants: [{ type: 'subscriber', id: 'sub-1' }],
    };
    const channel = { platform: 'slack', platformThreadId: 'thread-1' };
    const conversationService = {
      getConversation: sinon.stub().resolves(conversation),
      getPrimaryChannel: sinon.stub().returns(channel),
    };
    const createConversationInteraction = { execute: sinon.stub().resolves({ identifier: 'hi_1' }) };
    const managedAgentService = { sendToolResult: sinon.stub().resolves(undefined) };
    const featureFlagsService = { getFlag: sinon.stub().resolves(overrides?.flag ?? true) };
    const logger = { setContext: sinon.stub(), warn: sinon.stub() };
    const usecase = new HandleNovuHuman(
      conversationService as any,
      createConversationInteraction as any,
      managedAgentService as any,
      featureFlagsService as any,
      logger as any
    );
    const command = HandleNovuHumanCommand.create({
      userId: 'user1',
      environmentId: 'env1',
      organizationId: 'org1',
      toolUseId: 'sevt_1',
      sessionId: 'ses_1',
      input: overrides?.input ?? { kind: 'approve', card: { title: 'Deploy to production?' } },
      conversationId: 'conv1',
      agentIdentifier: 'ship-bot',
      integrationIdentifier: 'slack-main',
      subscriberId: 'sub-1',
      platform: AgentPlatformEnum.SLACK,
      platformThreadId: 'thread-1',
    });

    return { usecase, command, createConversationInteraction, managedAgentService, conversationService };
  }

  it('creates an approve interaction and does not resume the session', async () => {
    const { usecase, command, createConversationInteraction, managedAgentService } = setup();

    await usecase.execute(command);

    expect(createConversationInteraction.execute.calledOnce).to.equal(true);
    const created = createConversationInteraction.execute.firstCall.args[0];
    expect(created.kind).to.equal(HumanInteractionKindEnum.APPROVE);
    expect(created.requestId).to.equal('novu_human:ses_1:sevt_1');
    expect(created.from).to.equal('ship-bot');
    expect(created.to).to.equal('sub-1');
    expect(created.card).to.deep.include({ title: 'Deploy to production?' });
    expect(created.prompt).to.equal(undefined);
    expect(managedAgentService.sendToolResult.called).to.equal(false);
  });

  it('accepts nested card chrome', async () => {
    const { usecase, command, createConversationInteraction } = setup({
      input: {
        kind: 'approve',
        card: { title: 'Refund $25?', icon: 'stripe', subtitle: 'issue_refund', extraActions: ['Always allow'] },
      },
    });

    await usecase.execute(command);

    const created = createConversationInteraction.execute.firstCall.args[0];
    expect(created.card.title).to.equal('Refund $25?');
    expect(created.card.icon).to.equal('stripe');
    expect(created.card.extraActions).to.deep.equal(['Always allow']);
  });

  it('ignores a leftover top-level prompt', async () => {
    const { usecase, command, createConversationInteraction } = setup({
      input: { kind: 'ask', prompt: 'String title', card: { title: 'Card title', body: 'More' } },
    });

    await usecase.execute(command);

    const created = createConversationInteraction.execute.firstCall.args[0];
    expect(created.card).to.deep.include({ title: 'Card title', body: 'More' });
  });

  it('resumes with an error when card.title is missing', async () => {
    const { usecase, command, createConversationInteraction, managedAgentService } = setup({
      input: { kind: 'approve', card: { subtitle: 'no title' } },
    });

    await usecase.execute(command);

    expect(createConversationInteraction.execute.called).to.equal(false);
    const content = JSON.parse(managedAgentService.sendToolResult.firstCall.args[0].content);
    expect(content.error).to.equal('invalid_title');
  });

  it('delivers tell then resumes immediately', async () => {
    const { usecase, command, createConversationInteraction, managedAgentService } = setup({
      input: { kind: 'tell', card: { title: 'Deploy finished.' } },
    });

    await usecase.execute(command);

    expect(createConversationInteraction.execute.calledOnce).to.equal(true);
    expect(managedAgentService.sendToolResult.calledOnce).to.equal(true);
    const content = JSON.parse(managedAgentService.sendToolResult.firstCall.args[0].content);
    expect(content).to.include({ ok: true, kind: 'tell', status: 'delivered' });
  });

  it('resumes with an error when HITL is disabled', async () => {
    const { usecase, command, createConversationInteraction, managedAgentService } = setup({ flag: false });

    await usecase.execute(command);

    expect(createConversationInteraction.execute.called).to.equal(false);
    expect(managedAgentService.sendToolResult.calledOnce).to.equal(true);
    const content = JSON.parse(managedAgentService.sendToolResult.firstCall.args[0].content);
    expect(content.ok).to.equal(false);
    expect(content.error).to.equal('hitl_disabled');
  });

  it('resumes with an error when choose has too few options', async () => {
    const { usecase, command, createConversationInteraction, managedAgentService } = setup({
      input: { kind: 'choose', card: { title: 'Which region?', options: ['only-one'] } },
    });

    await usecase.execute(command);

    expect(createConversationInteraction.execute.called).to.equal(false);
    expect(managedAgentService.sendToolResult.calledOnce).to.equal(true);
    const content = JSON.parse(managedAgentService.sendToolResult.firstCall.args[0].content);
    expect(content.error).to.equal('invalid_options');
  });
});
