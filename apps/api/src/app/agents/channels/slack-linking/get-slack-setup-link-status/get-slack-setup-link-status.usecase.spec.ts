import { expect } from 'chai';
import sinon from 'sinon';

import { InvalidTelegramMobileTokenError } from '../../../../telegram-linking/telegram-mobile-link-token.service';
import { GetSlackSetupLinkStatusCommand } from './get-slack-setup-link-status.command';
import { GetSlackSetupLinkStatus } from './get-slack-setup-link-status.usecase';

describe('GetSlackSetupLinkStatus', () => {
  const token = 'a'.repeat(32);
  const payload = { kind: 'slack-agent-setup', env: 'env-1', org: 'org-1', aid: 'agent-1', iid: 'int-1' };

  function makeUsecase() {
    const tokenService = {
      extendSlackAgentSetup: sinon.stub().resolves(),
      verifySlackAgentSetup: sinon.stub().resolves(payload),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ _id: 'int-1', providerId: 'slack' }),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ name: 'Relay' }),
    };

    const usecase = new GetSlackSetupLinkStatus(
      tokenService as any,
      agentRepository as any,
      integrationRepository as any
    );

    return { usecase, tokenService };
  }

  it('does not touch the token expiry on a plain status poll', async () => {
    const { usecase, tokenService } = makeUsecase();

    const result = await usecase.execute(GetSlackSetupLinkStatusCommand.create({ token }));

    expect(result).to.deep.equal({ valid: true, agentName: 'Relay', providerName: 'slack' });
    expect(tokenService.extendSlackAgentSetup.called).to.equal(false);
  });

  it('re-arms the sliding expiry before verifying when extend is requested', async () => {
    const { usecase, tokenService } = makeUsecase();

    const result = await usecase.execute(GetSlackSetupLinkStatusCommand.create({ token, extend: true }));

    expect(result.valid).to.equal(true);
    expect(tokenService.extendSlackAgentSetup.calledOnceWithExactly(token)).to.equal(true);
    expect(tokenService.extendSlackAgentSetup.calledBefore(tokenService.verifySlackAgentSetup)).to.equal(true);
  });

  it('still reports expired when extend could not revive the token', async () => {
    const { usecase, tokenService } = makeUsecase();
    tokenService.verifySlackAgentSetup.rejects(new InvalidTelegramMobileTokenError('expired'));

    const result = await usecase.execute(GetSlackSetupLinkStatusCommand.create({ token, extend: true }));

    expect(result).to.deep.equal({ valid: false, reason: 'expired' });
  });
});
