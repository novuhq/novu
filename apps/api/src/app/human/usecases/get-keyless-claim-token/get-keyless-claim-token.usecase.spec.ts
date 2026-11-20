import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConnectClaimTokenCacheUnavailableError } from '../../../connect/services/connect-claim-token.service';
import { GetKeylessClaimTokenCommand } from './get-keyless-claim-token.command';
import { GetKeylessClaimToken, KEYLESS_SETUP_CLAIMED_CODE } from './get-keyless-claim-token.usecase';

describe('GetKeylessClaimToken', () => {
  const originalKeylessOrgId = process.env.KEYLESS_ORGANIZATION_ID;

  beforeEach(() => {
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless_org';
  });

  afterEach(() => {
    if (originalKeylessOrgId === undefined) {
      delete process.env.KEYLESS_ORGANIZATION_ID;
    } else {
      process.env.KEYLESS_ORGANIZATION_ID = originalKeylessOrgId;
    }
  });

  function setup({ claimed = false }: { claimed?: boolean } = {}) {
    const connectClaimTokenService = {
      isEnvironmentClaimed: sinon.stub().resolves(claimed),
      issueOrGetForEnvironment: sinon.stub().resolves({ token: 'claim_token', expiresAt: '2026-10-09T00:00:00.000Z' }),
    };

    return { usecase: new GetKeylessClaimToken(connectClaimTokenService as never), connectClaimTokenService };
  }

  function command(organizationId = 'keyless_org') {
    return GetKeylessClaimTokenCommand.create({ environmentId: 'keyless_env', organizationId, userId: 'keyless_user' });
  }

  it('returns the claim token of a keyless setup', async () => {
    const { usecase, connectClaimTokenService } = setup();

    expect(await usecase.execute(command())).to.deep.equal({ token: 'claim_token' });
    expect(connectClaimTokenService.issueOrGetForEnvironment.firstCall.args[0]).to.deep.equal({
      env: 'keyless_env',
      org: 'keyless_org',
    });
  });

  it('refuses setups that already belong to an account', async () => {
    const { usecase, connectClaimTokenService } = setup();

    const error = await usecase.execute(command('regular_org')).catch((caught) => caught);

    expect(error).to.be.instanceOf(BadRequestException);
    expect(connectClaimTokenService.issueOrGetForEnvironment.called).to.equal(false);
  });

  it('says when the setup was already claimed', async () => {
    const { usecase, connectClaimTokenService } = setup({ claimed: true });

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.deep.include({ code: KEYLESS_SETUP_CLAIMED_CODE });
    expect(connectClaimTokenService.issueOrGetForEnvironment.called).to.equal(false);
  });

  it('asks to try again while the token store is down', async () => {
    const { usecase, connectClaimTokenService } = setup();
    connectClaimTokenService.issueOrGetForEnvironment.rejects(
      new ConnectClaimTokenCacheUnavailableError('issueOrGetForEnvironment')
    );

    const error = await usecase.execute(command()).catch((caught) => caught);

    expect(error).to.be.instanceOf(ServiceUnavailableException);
  });
});
