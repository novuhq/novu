import { expect } from 'chai';
import sinon from 'sinon';
import { ClaimForHumanAccountCommand } from './claim-for-human-account.command';
import { ClaimForHumanAccount } from './claim-for-human-account.usecase';

describe('ClaimForHumanAccount', () => {
  it('claims the setup into the backing organization, attributed to the Human product', async () => {
    const account = { organizationId: 'novu_org', environmentId: 'novu_env', userId: 'novu_user' };
    const ensureBackingOrganization = { execute: sinon.stub().resolves(account) };
    const claimKeylessConnect = { execute: sinon.stub().resolves({ environmentId: 'novu_env' }) };
    const humanAccountAgent = {
      claimOverUntouchedAgent: sinon
        .stub()
        .callsFake(async (_account, _name, claim: () => Promise<unknown>) => claim()),
    };
    const usecase = new ClaimForHumanAccount(
      ensureBackingOrganization as never,
      claimKeylessConnect as never,
      humanAccountAgent as never
    );

    await usecase.execute(ClaimForHumanAccountCommand.create({ humanUserId: 'user_human', token: 'T'.repeat(32) }));

    expect(claimKeylessConnect.execute.firstCall.args[0]).to.deep.include({
      token: 'T'.repeat(32),
      organizationId: 'novu_org',
      userId: 'novu_user',
      source: 'human',
    });
  });
});
