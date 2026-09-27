import { expect } from 'chai';
import sinon from 'sinon';

import { InvalidTelegramMobileTokenError } from '../telegram-mobile-link-token.service';
import { GetTelegramMobileLinkStatusCommand } from './get-telegram-mobile-link-status.command';
import { GetTelegramMobileLinkStatus } from './get-telegram-mobile-link-status.usecase';

describe('GetTelegramMobileLinkStatus', () => {
  const token = 'a'.repeat(32);
  const payload = { kind: 'agent', env: 'env-1', org: 'org-1', aid: 'agent-1', iid: 'int-1' };

  function makeUsecase() {
    const tokenService = {
      extendAgentSetup: sinon.stub().resolves(),
      verify: sinon.stub().resolves(payload),
    };
    const integrationRepository = {
      findOne: sinon.stub().resolves({ _id: 'int-1', providerId: 'telegram' }),
    };
    const agentRepository = {
      findOne: sinon.stub().resolves({ name: 'Relay' }),
    };

    const usecase = new GetTelegramMobileLinkStatus(
      tokenService as any,
      agentRepository as any,
      integrationRepository as any
    );

    return { usecase, tokenService };
  }

  it('does not touch the token expiry on a plain status poll', async () => {
    const { usecase, tokenService } = makeUsecase();

    const result = await usecase.execute(GetTelegramMobileLinkStatusCommand.create({ token }));

    expect(result).to.deep.equal({ valid: true, agentName: 'Relay', providerName: 'telegram' });
    expect(tokenService.extendAgentSetup.called).to.equal(false);
  });

  it('re-arms the sliding expiry before verifying when extend is requested', async () => {
    const { usecase, tokenService } = makeUsecase();

    const result = await usecase.execute(GetTelegramMobileLinkStatusCommand.create({ token, extend: true }));

    expect(result.valid).to.equal(true);
    expect(tokenService.extendAgentSetup.calledOnceWithExactly(token)).to.equal(true);
    expect(tokenService.extendAgentSetup.calledBefore(tokenService.verify)).to.equal(true);
  });

  it('still reports expired when extend could not revive the token', async () => {
    const { usecase, tokenService } = makeUsecase();
    tokenService.verify.rejects(new InvalidTelegramMobileTokenError('expired'));

    const result = await usecase.execute(GetTelegramMobileLinkStatusCommand.create({ token, extend: true }));

    expect(result).to.deep.equal({ valid: false, reason: 'expired' });
  });
});
