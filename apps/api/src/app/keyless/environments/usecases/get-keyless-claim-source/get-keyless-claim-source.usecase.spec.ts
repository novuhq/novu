import { NotFoundException } from '@nestjs/common';
import { expect } from 'chai';
import sinon from 'sinon';
import { InvalidConnectClaimTokenError } from '../../../../connect/services/connect-claim-token.service';
import { GetKeylessClaimSourceCommand } from './get-keyless-claim-source.command';
import { GetKeylessClaimSource } from './get-keyless-claim-source.usecase';

describe('GetKeylessClaimSource', () => {
  const originalKeylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;
  const token = 'T'.repeat(32);
  const inboxEnvironment = {
    _id: 'keyless_env',
    _organizationId: 'keyless_org',
    identifier: 'pk_keyless_abc_123',
    name: 'Keyless',
  };
  const agentEnvironment = { ...inboxEnvironment, identifier: 'Xk3m9QpL2aZt', name: 'Keyless Agent 2026' };

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

  function setup(environment: Record<string, unknown> | null = inboxEnvironment) {
    const cache = new Map<string, string>();
    const connectClaimTokenService = { verify: sinon.stub().resolves({ env: 'keyless_env', org: 'keyless_org' }) };
    const environmentRepository = { findOne: sinon.stub().resolves(environment) };
    const cacheService = {
      cacheEnabled: () => true,
      get: sinon.stub().callsFake(async (key: string) => cache.get(key) ?? null),
    };
    const usecase = new GetKeylessClaimSource(
      connectClaimTokenService as never,
      environmentRepository as never,
      cacheService as never
    );

    return { usecase, cache, connectClaimTokenService };
  }

  const execute = (usecase: GetKeylessClaimSource, claimToken = token) =>
    usecase.execute(GetKeylessClaimSourceCommand.create({ token: claimToken }));

  it('returns the stored creator of an inbox environment', async () => {
    const { usecase, cache } = setup();
    cache.set('keyless_environment_source:{keyless_env}', 'inbox');

    expect(await execute(usecase)).to.deep.equal({ source: 'inbox' });
  });

  it('returns agent with its client for an agent environment', async () => {
    const { usecase, cache } = setup(agentEnvironment);
    cache.set('keyless_environment_source:{keyless_env}', 'agent');
    cache.set('keyless_agent_source:{keyless_env}', 'claude-code');

    expect(await execute(usecase)).to.deep.equal({ source: 'agent', client: 'claude-code' });
  });

  it('falls back to the environment shape when the stored source is gone', async () => {
    const { usecase } = setup(agentEnvironment);

    expect(await execute(usecase)).to.deep.equal({ source: 'agent' });
  });

  it('rejects a malformed token without reading it', async () => {
    const { usecase, connectClaimTokenService } = setup();

    const error = await execute(usecase, 'bogus').catch((caught) => caught);

    expect(error).to.be.instanceOf(NotFoundException);
    expect(connectClaimTokenService.verify.called).to.equal(false);
  });

  it('rejects a used or expired token', async () => {
    const { usecase, connectClaimTokenService } = setup();
    connectClaimTokenService.verify.rejects(new InvalidConnectClaimTokenError('used'));

    expect(await execute(usecase).catch((caught) => caught)).to.be.instanceOf(NotFoundException);
  });

  it('rejects a token issued for another organization', async () => {
    const { usecase, connectClaimTokenService } = setup();
    connectClaimTokenService.verify.resolves({ env: 'keyless_env', org: 'other_org' });

    expect(await execute(usecase).catch((caught) => caught)).to.be.instanceOf(NotFoundException);
  });

  it('rejects a token whose environment no longer exists', async () => {
    const { usecase } = setup(null);

    expect(await execute(usecase).catch((caught) => caught)).to.be.instanceOf(NotFoundException);
  });
});
