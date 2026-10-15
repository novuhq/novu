import { BadRequestException, ConflictException } from '@nestjs/common';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { KeylessAgentAnalyticsEventEnum } from '../../../keyless-agent-environment';
import { ClaimKeylessEnvironmentCommand } from './claim-keyless-environment.command';
import { ClaimKeylessEnvironment } from './claim-keyless-environment.usecase';

describe('ClaimKeylessEnvironment', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless_org';
    process.env.KEYLESS_AGENT_ENVIRONMENT_RETENTION_HOURS = '72';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const createdAt = new Date(Date.now() - 90 * 60 * 1000);
  const agentEnvironment = {
    _id: 'keyless_env',
    _organizationId: 'keyless_org',
    identifier: 'Xk3m9QpL2aZt',
    name: 'Keyless Agent 2026-10-14T20:00:00.000Z',
    createdAt,
    apiKeys: [{ hash: 'hash_1' }, { hash: 'hash_2' }],
  };
  const connectEnvironment = {
    _id: 'connect_env',
    _organizationId: 'keyless_org',
    identifier: 'pk_keyless_abc_123',
    name: 'Keyless',
    createdAt,
    apiKeys: [{ hash: 'connect_hash' }],
  };
  const targetEnvironment = { _id: 'dev_env', _organizationId: 'target_org' };
  const user = { _id: 'claimer', organizationId: 'target_org', environmentId: 'claimer_env' };

  function setup(keylessEnvironment: Record<string, unknown> = agentEnvironment) {
    const moveOptions: unknown[] = [];
    const claimKeylessConnect = {
      execute: sinon.stub().callsFake(async (_command, hooks) => {
        moveOptions.push(await hooks?.beforeMove?.({ keylessEnvironment, targetEnvironment }));

        return { environmentId: 'dev_env', agentIdentifier: undefined };
      }),
    };
    const copyKeylessWorkflows = {
      preflight: sinon.stub().resolves({ toCopy: ['order-shipped'], skipped: ['hello-world'] }),
      copy: sinon.stub().resolves({ copiedInternalIds: ['copy_1'], copied: ['order-shipped'], skipped: [] }),
      compensate: sinon.stub().resolves(),
    };
    const integrationRepository = { findOne: sinon.stub().resolves(null) };
    const cacheService = {
      cacheEnabled: sinon.stub().returns(true),
      set: sinon.stub().resolves(),
      get: sinon.stub().resolves('cursor'),
    };
    const analyticsService = { track: sinon.stub(), mixpanelTrack: sinon.stub(), alias: sinon.stub() };
    const logger = { setContext: sinon.stub(), warn: sinon.stub(), info: sinon.stub() };

    const usecase = new ClaimKeylessEnvironment(
      claimKeylessConnect as never,
      copyKeylessWorkflows as never,
      integrationRepository as never,
      cacheService as never,
      analyticsService as never,
      logger as never
    );

    return {
      usecase,
      claimKeylessConnect,
      copyKeylessWorkflows,
      integrationRepository,
      cacheService,
      analyticsService,
      moveOptions,
    };
  }

  const command = ClaimKeylessEnvironmentCommand.create({ token: 'T'.repeat(32), user: user as never });

  it('refuses to claim into the keyless organization itself', async () => {
    const { usecase, claimKeylessConnect } = setup();
    const keylessUser = { ...user, organizationId: 'keyless_org' };

    const error = await usecase
      .execute(ClaimKeylessEnvironmentCommand.create({ token: 'T'.repeat(32), user: keylessUser as never }))
      .catch((caught) => caught);

    expect(error).to.be.instanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).to.include({ code: 'claim_into_keyless_org' });
    expect(claimKeylessConnect.execute.called).to.equal(false);
  });

  it('passes Connect environments straight through to the existing claim', async () => {
    const { usecase, claimKeylessConnect, copyKeylessWorkflows, cacheService, analyticsService, moveOptions } =
      setup(connectEnvironment);
    claimKeylessConnect.execute.callsFake(async (_command, hooks) => {
      moveOptions.push(await hooks?.beforeMove?.({ keylessEnvironment: connectEnvironment, targetEnvironment }));

      return { environmentId: 'dev_env', agentIdentifier: 'human-relay' };
    });

    expect(await usecase.execute(command)).to.deep.equal({
      kind: 'connect',
      environmentId: 'dev_env',
      agentIdentifier: 'human-relay',
      workflowIdentifiers: [],
      skippedWorkflowIdentifiers: [],
    });
    expect(claimKeylessConnect.execute.firstCall.args[0]).to.include({
      token: 'T'.repeat(32),
      organizationId: 'target_org',
      userId: 'claimer',
    });
    expect(moveOptions).to.deep.equal([undefined]);
    expect(copyKeylessWorkflows.preflight.called).to.equal(false);
    expect(cacheService.set.called).to.equal(false);
    expect(analyticsService.track.called).to.equal(false);
  });

  it('copies the workflows, revokes the key and reports copied and skipped identifiers', async () => {
    const { usecase, copyKeylessWorkflows, moveOptions } = setup();

    expect(await usecase.execute(command)).to.deep.equal({
      kind: 'agent-environment',
      environmentId: 'dev_env',
      agentIdentifier: undefined,
      workflowIdentifiers: ['order-shipped'],
      skippedWorkflowIdentifiers: ['hello-world'],
    });
    const scope = {
      sourceEnvironmentId: 'keyless_env',
      sourceOrganizationId: 'keyless_org',
      targetEnvironmentId: 'dev_env',
      targetOrganizationId: 'target_org',
    };
    expect(copyKeylessWorkflows.preflight.firstCall.args[0]).to.deep.equal(scope);
    expect(copyKeylessWorkflows.copy.firstCall.args[0]).to.deep.equal({
      ...scope,
      user,
      workflowIds: ['order-shipped'],
    });
    expect(copyKeylessWorkflows.copy.calledAfter(copyKeylessWorkflows.preflight)).to.equal(true);
    expect(moveOptions).to.deep.equal([{ excludeIntegrationProviderIds: [], revokeKeylessApiKeys: true }]);
  });

  it('leaves the keyless Novu Email behind when the target already has one', async () => {
    const { usecase, integrationRepository, moveOptions } = setup();
    integrationRepository.findOne.resolves({ _id: 'target_novu_email' });

    await usecase.execute(command);

    expect(integrationRepository.findOne.firstCall.args[0]).to.deep.equal({
      _environmentId: 'dev_env',
      _organizationId: 'target_org',
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.Novu,
    });
    expect(moveOptions).to.deep.equal([
      { excludeIntegrationProviderIds: [EmailProviderIdEnum.Novu], revokeKeylessApiKeys: true },
    ]);
  });

  it('copies nothing when looking up the target Novu Email fails', async () => {
    const { usecase, integrationRepository, copyKeylessWorkflows } = setup();
    integrationRepository.findOne.rejects(new Error('db down'));

    await usecase.execute(command).catch(() => undefined);

    expect(copyKeylessWorkflows.copy.called).to.equal(false);
  });

  it('refuses an expired environment before checking workflows', async () => {
    const { usecase, copyKeylessWorkflows } = setup({ ...agentEnvironment, createdAt: new Date(0) });

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error).to.be.instanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).to.include({ code: 'keyless_environment_expired' });
    expect(copyKeylessWorkflows.preflight.called).to.equal(false);
  });

  it('lets a workflow clash abort the claim without copying', async () => {
    const { usecase, copyKeylessWorkflows } = setup();
    const clash = new ConflictException({ code: 'claim_workflow_exists' });
    copyKeylessWorkflows.preflight.rejects(clash);

    expect(await usecase.execute(command).catch((caught) => caught)).to.equal(clash);
    expect(copyKeylessWorkflows.copy.called).to.equal(false);
    expect(copyKeylessWorkflows.compensate.called).to.equal(false);
  });

  it('deletes the copied workflows when the claim fails after copying', async () => {
    const { usecase, claimKeylessConnect, copyKeylessWorkflows, cacheService } = setup();
    const moveFailure = new ConflictException({ code: 'claim_conflict' });
    claimKeylessConnect.execute.callsFake(async (_command, hooks) => {
      await hooks.beforeMove({ keylessEnvironment: agentEnvironment, targetEnvironment });
      throw moveFailure;
    });

    expect(await usecase.execute(command).catch((caught) => caught)).to.equal(moveFailure);
    expect(copyKeylessWorkflows.compensate.firstCall.args[0]).to.deep.equal({
      user,
      targetEnvironmentId: 'dev_env',
      targetOrganizationId: 'target_org',
      copiedInternalIds: ['copy_1'],
    });
    expect(cacheService.set.called).to.equal(false);
  });

  it('tombstones every revoked key and records the claim in analytics', async () => {
    const { usecase, cacheService, analyticsService } = setup();

    await usecase.execute(command);

    expect(cacheService.set.callCount).to.equal(2);
    expect(cacheService.set.firstCall.args[0]).to.equal('keyless_agent_claimed_key:{hash_1}');
    expect(cacheService.set.secondCall.args[0]).to.equal('keyless_agent_claimed_key:{hash_2}');
    expect(JSON.parse(cacheService.set.firstCall.args[1])).to.include({
      environmentId: 'keyless_env',
      organizationId: 'keyless_org',
    });

    const expectedEvent = {
      environmentId: 'keyless_env',
      targetOrganizationId: 'target_org',
      targetEnvironmentId: 'dev_env',
      source: 'cursor',
      ageMinutes: 90,
      workflowsCopied: 1,
      workflowsSkipped: 1,
    };
    expect(analyticsService.track.firstCall.args).to.deep.equal([
      KeylessAgentAnalyticsEventEnum.CLAIMED,
      'keyless_env',
      expectedEvent,
    ]);
    expect(analyticsService.mixpanelTrack.firstCall.args).to.deep.equal([
      KeylessAgentAnalyticsEventEnum.CLAIMED,
      'keyless_env',
      expectedEvent,
    ]);
    expect(analyticsService.alias.firstCall.args).to.deep.equal(['keyless_env', 'claimer']);
  });

  it('reports an unknown source when none was recorded', async () => {
    const { usecase, cacheService, analyticsService } = setup();
    cacheService.get.resolves(null);

    await usecase.execute(command);

    expect(analyticsService.track.firstCall.args[2]).to.include({ source: 'unknown' });
  });
});
