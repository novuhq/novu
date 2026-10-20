import { ForbiddenException } from '@nestjs/common';
import { AGENT_INBOX_EVENTS, ChatProviderIdEnum, EmailProviderIdEnum, EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AddAgentIntegration } from './add-agent-integration.usecase';

describe('AddAgentIntegration Agent Email Inbox', () => {
  function setup(runtime: string) {
    const agentRepository = {
      findOne: sinon.stub().resolves({
        _id: 'agent-1',
        identifier: 'relay',
        name: 'Relay',
        runtime,
      }),
    };
    const environmentRepository = {
      findOne: sinon.stub().resolves({ type: EnvironmentTypeEnum.DEV, name: 'Development' }),
    };
    const findOrCreateNovuEmail = {
      execute: sinon.stub().resolves({
        response: {
          integration: { _id: 'int-1', identifier: 'inbox', providerId: 'agent-email-inbox', channel: 'email' },
        },
        provisionedNewLink: false,
      }),
    };
    const usecase = new AddAgentIntegration(
      agentRepository as never,
      {} as never,
      {} as never,
      {} as never,
      environmentRepository as never,
      findOrCreateNovuEmail as never,
      {} as never,
      { track: sinon.stub() } as never,
      {} as never
    );

    return { usecase, findOrCreateNovuEmail };
  }

  it('rejects Agent Email Inbox on an agent that is not a human relay', async () => {
    const { usecase, findOrCreateNovuEmail } = setup('managed');

    try {
      await usecase.execute({
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        agentIdentifier: 'relay',
        environmentId: 'env-1',
        organizationId: 'org-1',
        userId: 'user-1',
      } as never);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).to.equal(
        'Agent Email Inbox is only available for the Human project.'
      );
    }

    expect(findOrCreateNovuEmail.execute.called).to.equal(false);
  });

  it('provisions Agent Email Inbox for a human relay', async () => {
    const { usecase, findOrCreateNovuEmail } = setup('human_relay');

    await usecase.execute({
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      agentIdentifier: 'relay',
      environmentId: 'env-1',
      organizationId: 'org-1',
      userId: 'user-1',
    } as never);

    expect(findOrCreateNovuEmail.execute.calledOnce).to.equal(true);
    expect(findOrCreateNovuEmail.execute.firstCall.args[3]).to.equal(EmailProviderIdEnum.AgentEmailInbox);
  });
});

describe('AddAgentIntegration Agent Inbox analytics', () => {
  function setup(runtime: string) {
    const agentRepository = {
      findOne: sinon.stub().resolves({ _id: 'agent-1', identifier: 'relay', name: 'Relay', runtime }),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({
        _id: 'int-1',
        identifier: 'tg',
        providerId: ChatProviderIdEnum.Telegram,
        channel: 'chat',
        active: true,
      }),
    };
    const agentIntegrationRepository = {
      findOne: sinon.stub().resolves(null),
      createOrReviveLink: sinon.stub().resolves({ _id: 'link-1', _agentId: 'agent-1' }),
    };
    const environmentRepository = {
      findOne: sinon.stub().resolves({ type: EnvironmentTypeEnum.DEV, name: 'Development' }),
    };
    const analyticsService = { track: sinon.stub() };
    const usecase = new AddAgentIntegration(
      agentRepository as never,
      integrationRepository as never,
      agentIntegrationRepository as never,
      {} as never,
      environmentRepository as never,
      {} as never,
      {} as never,
      analyticsService as never,
      {} as never
    );

    return { usecase, analyticsService };
  }

  const command = {
    integrationIdentifier: 'tg',
    agentIdentifier: 'relay',
    environmentId: 'env-1',
    organizationId: 'org-1',
    userId: 'user-1',
  };

  it('counts a channel linked to the Agent Inbox agent as one of its own', async () => {
    const { usecase, analyticsService } = setup('human_relay');

    await usecase.execute(command as never);

    expect(analyticsService.track.secondCall.args).to.deep.equal([
      AGENT_INBOX_EVENTS.CHANNEL_CONNECTED,
      'user-1',
      { _organization: 'org-1', agentId: 'agent-1', channel: 'telegram' },
    ]);
  });

  it('counts only the agents event for any other agent', async () => {
    const { usecase, analyticsService } = setup('managed');

    await usecase.execute(command as never);

    expect(analyticsService.track.calledOnce).to.equal(true);
    expect(analyticsService.track.firstCall.args[0]).to.equal('Agent Integration Connected - [Agents]');
  });
});
