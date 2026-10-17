import { ForbiddenException } from '@nestjs/common';
import { EmailProviderIdEnum, EnvironmentTypeEnum } from '@novu/shared';
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
