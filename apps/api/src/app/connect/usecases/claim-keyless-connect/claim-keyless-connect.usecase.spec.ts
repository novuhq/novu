import { ConflictException } from '@nestjs/common';
import { EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ClaimKeylessConnectCommand } from './claim-keyless-connect.command';
import { ClaimKeylessConnect } from './claim-keyless-connect.usecase';

describe('ClaimKeylessConnect', () => {
  const originalKeylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;

  beforeEach(() => {
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless_org';
  });

  afterEach(() => {
    if (originalKeylessOrganizationId === undefined) {
      delete process.env.KEYLESS_ORGANIZATION_ID;
    } else {
      process.env.KEYLESS_ORGANIZATION_ID = originalKeylessOrganizationId;
    }
  });

  function repository() {
    return { update: sinon.stub().resolves() };
  }

  function setup() {
    const connectClaimTokenService = {
      tryAcquireClaimLock: sinon.stub().resolves(true),
      verify: sinon.stub().resolves({ env: 'keyless_env', org: 'keyless_org' }),
      claim: sinon.stub().resolves(),
      releaseClaimLock: sinon.stub().resolves(),
    };
    const environmentRepository = {
      findOne: sinon.stub().resolves({ _id: 'keyless_env' }),
      findOrganizationEnvironments: sinon.stub().resolves([{ _id: 'dev_env', type: EnvironmentTypeEnum.DEV }]),
    };
    const agentRepository = {
      ...repository(),
      find: sinon.stub().resolves([{ _id: 'agent1', identifier: 'human-relay' }]),
      findOne: sinon.stub(),
      withTransaction: sinon.stub().callsFake(async (move: (session: unknown) => Promise<void>) => move('session')),
    };
    agentRepository.findOne.onFirstCall().resolves(null);
    agentRepository.findOne.resolves({ identifier: 'human-relay' });
    const humanContactRepository = repository();

    const usecase = new ClaimKeylessConnect(
      connectClaimTokenService as never,
      environmentRepository as never,
      agentRepository as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      repository() as never,
      humanContactRepository as never,
      { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub() } as never
    );

    return { usecase, agentRepository, humanContactRepository, connectClaimTokenService };
  }

  const command = ClaimKeylessConnectCommand.create({
    token: 'T'.repeat(32),
    organizationId: 'target_org',
    userId: 'user1',
  });

  it('moves the contacts’ saved default channels along with the setup', async () => {
    const { usecase, humanContactRepository, connectClaimTokenService } = setup();

    expect(await usecase.execute(command)).to.deep.equal({ environmentId: 'dev_env', agentIdentifier: 'human-relay' });
    expect(humanContactRepository.update.firstCall.args).to.deep.equal([
      { _environmentId: 'keyless_env', _organizationId: 'keyless_org' },
      { $set: { _environmentId: 'dev_env', _organizationId: 'target_org' } },
      { session: 'session' },
    ]);
    expect(connectClaimTokenService.claim.calledOnce).to.equal(true);
  });

  it('refuses a target that already has an agent with the same identifier', async () => {
    const { usecase, agentRepository, connectClaimTokenService } = setup();
    agentRepository.findOne.onFirstCall().resolves({ identifier: 'human-relay' });

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.include({ code: 'claim_agent_exists' });
    expect(agentRepository.withTransaction.called).to.equal(false);
    expect(connectClaimTokenService.claim.called).to.equal(false);
    expect(connectClaimTokenService.releaseClaimLock.calledOnce).to.equal(true);
  });

  it('turns any other duplicate in the target into a conflict', async () => {
    const { usecase, agentRepository, connectClaimTokenService } = setup();
    agentRepository.withTransaction.rejects(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }));

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.include({ code: 'claim_conflict' });
    expect(connectClaimTokenService.claim.called).to.equal(false);
  });
});
