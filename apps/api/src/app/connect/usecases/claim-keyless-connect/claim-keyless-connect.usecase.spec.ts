import { BadRequestException, ConflictException } from '@nestjs/common';
import { ChannelTypeEnum, EnvironmentTypeEnum, HumanChannelViaEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InvalidConnectClaimTokenError } from '../../services/connect-claim-token.service';
import { ClaimKeylessConnectCommand } from './claim-keyless-connect.command';
import { ClaimKeylessConnect } from './claim-keyless-connect.usecase';

describe('ClaimKeylessConnect', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless_org';
    process.env.STORE_ENCRYPTION_KEY = 'a'.repeat(32);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
      ...repository(),
      findOne: sinon.stub().resolves({ _id: 'keyless_env' }),
      findOrganizationEnvironments: sinon.stub().resolves([{ _id: 'dev_env', type: EnvironmentTypeEnum.DEV }]),
    };
    const integrationRepository = repository();
    const agentRepository = {
      ...repository(),
      find: sinon.stub().resolves([{ _id: 'agent1', identifier: 'human-relay' }]),
      findOne: sinon.stub(),
      withTransaction: sinon.stub().callsFake(async (move: (session: unknown) => Promise<void>) => move('session')),
    };
    agentRepository.findOne.onFirstCall().resolves(null);
    agentRepository.findOne.resolves({ identifier: 'human-relay' });
    const humanContactRepository = {
      ...repository(),
      findOperatorInEnvironment: sinon.stub().resolves(null),
    };

    const usecase = new ClaimKeylessConnect(
      connectClaimTokenService as never,
      environmentRepository as never,
      agentRepository as never,
      repository() as never,
      integrationRepository as never,
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

    return {
      usecase,
      agentRepository,
      humanContactRepository,
      connectClaimTokenService,
      environmentRepository,
      integrationRepository,
    };
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

  it('refuses to claim while the operator email is still awaiting verification', async () => {
    const { usecase, humanContactRepository, connectClaimTokenService, agentRepository } = setup();
    humanContactRepository.findOperatorInEnvironment.resolves({
      addresses: { [HumanChannelViaEnum.EMAIL]: { pending: { address: 'ada@example.com', requestedAt: 't1' } } },
    });

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).to.include({ code: 'verify_email_before_claim' });
    expect(agentRepository.withTransaction.called).to.equal(false);
    expect(connectClaimTokenService.claim.called).to.equal(false);
    expect(connectClaimTokenService.releaseClaimLock.calledOnce).to.equal(true);
  });

  it('without hooks, moves every non in-app integration and leaves the keyless environment untouched', async () => {
    const { usecase, integrationRepository, environmentRepository } = setup();

    await usecase.execute(command);

    expect(integrationRepository.update.firstCall.args[0]).to.deep.equal({
      _environmentId: 'keyless_env',
      _organizationId: 'keyless_org',
      channel: { $ne: ChannelTypeEnum.IN_APP },
    });
    expect(environmentRepository.update.called).to.equal(false);
  });

  it('runs the beforeMove hook after the preflights and before the move, with both environments', async () => {
    const { usecase, agentRepository, humanContactRepository, connectClaimTokenService } = setup();
    const beforeMove = sinon.stub().resolves(undefined);

    await usecase.execute(command, { beforeMove });

    expect(beforeMove.calledOnce).to.equal(true);
    expect(beforeMove.firstCall.args[0]).to.deep.equal({
      keylessEnvironment: { _id: 'keyless_env' },
      targetEnvironment: { _id: 'dev_env', type: EnvironmentTypeEnum.DEV },
    });
    expect(beforeMove.calledAfter(connectClaimTokenService.verify)).to.equal(true);
    expect(beforeMove.calledAfter(agentRepository.findOne)).to.equal(true);
    expect(beforeMove.calledAfter(humanContactRepository.findOperatorInEnvironment)).to.equal(true);
    expect(beforeMove.calledBefore(agentRepository.withTransaction)).to.equal(true);
  });

  it('does not move anything or consume the token when the beforeMove hook throws', async () => {
    const { usecase, agentRepository, connectClaimTokenService } = setup();
    const hookError = new ConflictException({ message: 'clash', code: 'claim_workflow_exists' });

    const error = await usecase
      .execute(command, { beforeMove: sinon.stub().rejects(hookError) })
      .catch((caught) => caught);

    expect(error).to.equal(hookError);
    expect(agentRepository.withTransaction.called).to.equal(false);
    expect(connectClaimTokenService.claim.called).to.equal(false);
    expect(connectClaimTokenService.releaseClaimLock.calledOnce).to.equal(true);
  });

  it('applies the hook move options inside the transaction', async () => {
    const { usecase, integrationRepository, environmentRepository } = setup();
    environmentRepository.findOne.resolves({
      _id: 'keyless_env',
      apiKeys: [{ key: 'enc', hash: 'old_hash', _userId: 'keyless_user' }],
    });

    await usecase.execute(command, {
      beforeMove: sinon.stub().resolves({ excludeIntegrationProviderIds: ['novu-email'], revokeKeylessApiKeys: true }),
    });

    expect(integrationRepository.update.firstCall.args).to.deep.equal([
      {
        _environmentId: 'keyless_env',
        _organizationId: 'keyless_org',
        channel: { $ne: ChannelTypeEnum.IN_APP },
        providerId: { $nin: ['novu-email'] },
      },
      { $set: { _environmentId: 'dev_env', _organizationId: 'target_org' } },
      { session: 'session' },
    ]);
    const [filter, update, options] = environmentRepository.update.firstCall.args;
    expect(filter).to.deep.equal({ _id: 'keyless_env', _organizationId: 'keyless_org' });
    expect(options).to.deep.equal({ session: 'session' });
    const [replacement] = update.$set.apiKeys;
    expect(update.$set.apiKeys).to.have.length(1);
    expect(replacement._userId).to.equal('keyless_user');
    expect(replacement.hash)
      .to.match(/^[a-f0-9]{64}$/)
      .and.not.equal('old_hash');
    expect(replacement.key).to.be.a('string').and.not.equal('enc');
  });

  it('still revokes the keys when the existing key has no owner', async () => {
    const { usecase, environmentRepository } = setup();
    environmentRepository.findOne.resolves({ _id: 'keyless_env', apiKeys: [{ key: 'enc', hash: 'old_hash' }] });

    await usecase.execute(command, { beforeMove: sinon.stub().resolves({ revokeKeylessApiKeys: true }) });

    const [, update] = environmentRepository.update.firstCall.args;
    expect(update.$set.apiKeys[0].hash).to.not.equal('old_hash');
    expect(update.$set.apiKeys[0]._userId).to.equal(command.userId);
  });

  it('keeps the integration filter unchanged when the hook excludes no providers', async () => {
    const { usecase, integrationRepository, environmentRepository } = setup();

    await usecase.execute(command, { beforeMove: sinon.stub().resolves({ excludeIntegrationProviderIds: [] }) });

    expect(integrationRepository.update.firstCall.args[0]).to.not.have.property('providerId');
    expect(environmentRepository.update.called).to.equal(false);
  });

  for (const { reason, message, code } of [
    { reason: 'used', message: 'This claim link has already been used.', code: 'claim_link_used' },
    { reason: 'expired', message: 'This claim link has expired.', code: 'claim_link_expired' },
    { reason: 'invalid', message: 'Invalid claim token.', code: 'claim_link_invalid' },
  ] as const) {
    it(`reports a ${reason} claim link with code ${code} and the existing message`, async () => {
      const { usecase, connectClaimTokenService } = setup();
      connectClaimTokenService.verify.rejects(new InvalidConnectClaimTokenError(reason));

      const error = await usecase.execute(command).catch((caught) => caught);

      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal(message);
      expect((error as BadRequestException).getResponse()).to.deep.equal({
        message,
        error: 'Bad Request',
        code,
      });
    });
  }

  it('reports a token issued for another organization as an invalid claim link', async () => {
    const { usecase, connectClaimTokenService } = setup();
    connectClaimTokenService.verify.resolves({ env: 'keyless_env', org: 'other_org' });

    const error = await usecase.execute(command).catch((caught) => caught);

    expect((error as BadRequestException).getResponse()).to.include({
      message: 'Invalid claim token.',
      code: 'claim_link_invalid',
    });
  });
});
