import { ConflictException } from '@nestjs/common';
import { EnvironmentTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { EnsureBackingOrganizationCommand } from './ensure-backing-organization.command';
import { EnsureBackingOrganization, LOCK_WAIT_MS } from './ensure-backing-organization.usecase';

describe('EnsureBackingOrganization', () => {
  const originalRegion = process.env.NOVU_REGION;

  afterEach(() => {
    if (originalRegion === undefined) {
      delete process.env.NOVU_REGION;
    } else {
      process.env.NOVU_REGION = originalRegion;
    }
  });

  function setup({ existingOrganization }: { existingOrganization?: 'complete' | 'without-environments' } = {}) {
    const humanBackingAccounts = {
      findOrCreate: sinon
        .stub()
        .resolves({ clerkUserId: 'clerk_user', clerkOrganizationId: 'clerk_org', novuUserId: 'novu_user' }),
    };
    const existingOrganizationIds = { complete: 'novu_org', 'without-environments': 'novu_org_stale' };
    const communityOrganizationRepository = {
      findOne: sinon
        .stub()
        .resolves(existingOrganization ? { _id: existingOrganizationIds[existingOrganization] } : null),
      delete: sinon.stub().resolves(),
    };
    const environmentRepository = {
      findOrganizationEnvironments: sinon.stub().callsFake(async (organizationId: string) =>
        organizationId === 'novu_org'
          ? [
              { _id: 'prod_env', type: EnvironmentTypeEnum.PROD, _parentId: 'dev_env' },
              { _id: 'dev_env', type: EnvironmentTypeEnum.DEV },
            ]
          : []
      ),
    };
    /*
     * Takes and lets go of locks the way Redis `SET NX EX` and `DEL` do, so requests at the same time contend
     * for them, and a lock nobody lets go of runs out after its TTL. By lock, when it runs out.
     */
    const heldLocks = new Map<string, number>();
    const cacheService = {
      cacheEnabled: sinon.stub().returns(true),
      setIfNotExist: sinon.stub().callsFake(async (key: string, _value: string, options?: { ttl?: number }) => {
        const until = heldLocks.get(key);
        if (until !== undefined && until > Date.now()) {
          return null;
        }
        heldLocks.set(key, Date.now() + (options?.ttl ?? 60) * 1000);

        return 'OK';
      }),
      del: sinon.stub().callsFake(async (key: string) => heldLocks.delete(key)),
    };
    const syncExternalOrganization = { execute: sinon.stub().resolves({ _id: 'novu_org' }) };
    const moduleRef = { resolve: sinon.stub().resolves(syncExternalOrganization) };

    const usecase = new EnsureBackingOrganization(
      humanBackingAccounts as never,
      communityOrganizationRepository as never,
      environmentRepository as never,
      cacheService as never,
      moduleRef as never
    );

    return {
      usecase,
      humanBackingAccounts,
      syncExternalOrganization,
      cacheService,
      heldLocks,
      communityOrganizationRepository,
    };
  }

  /** The Novu organization is there once a setup has made it, as it would be in the database. */
  function findOrganizationOnceMade({ communityOrganizationRepository, syncExternalOrganization }: Setup) {
    communityOrganizationRepository.findOne.callsFake(async () =>
      syncExternalOrganization.execute.called ? { _id: 'novu_org' } : null
    );
  }

  type Setup = ReturnType<typeof setup>;

  const command = EnsureBackingOrganizationCommand.create({
    humanUserId: 'user_2AbC',
    firstName: 'Ada',
    lastName: 'Lovelace',
  });

  it('runs the normal organization setup the first time', async () => {
    process.env.NOVU_REGION = 'us-east-1';
    const { usecase, humanBackingAccounts, syncExternalOrganization } = setup();

    const result = await usecase.execute(command);

    expect(humanBackingAccounts.findOrCreate.firstCall.args[0]).to.deep.equal({
      humanUserId: 'user_2AbC',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(syncExternalOrganization.execute.firstCall.args[0]).to.deep.include({
      userId: 'novu_user',
      externalId: 'clerk_org',
      email: 'user_2abc@users.agentinbox.md',
    });
    expect(result).to.deep.equal({
      organizationId: 'novu_org',
      userId: 'novu_user',
      environmentId: 'dev_env',
      region: 'us',
    });
  });

  it('reuses the organization on later visits', async () => {
    process.env.NOVU_REGION = 'eu-central-1';
    const { usecase, syncExternalOrganization, cacheService } = setup({ existingOrganization: 'complete' });

    const result = await usecase.execute(command);

    expect(syncExternalOrganization.execute.called).to.equal(false);
    expect(result).to.include({ organizationId: 'novu_org', environmentId: 'dev_env', region: 'eu' });
    expect(cacheService.del.calledOnceWith('human_backing_account_lock:{user_2AbC}')).to.equal(true);
  });

  it('starts the setup over when an earlier attempt stopped before the environments', async () => {
    const { usecase, syncExternalOrganization, communityOrganizationRepository } = setup({
      existingOrganization: 'without-environments',
    });

    const result = await usecase.execute(command);

    expect(communityOrganizationRepository.delete.calledOnceWith({ _id: 'novu_org_stale' })).to.equal(true);
    expect(syncExternalOrganization.execute.calledOnce).to.equal(true);
    expect(result).to.include({ organizationId: 'novu_org', environmentId: 'dev_env' });
  });

  it('sets the account up once when the sign-up webhook and the first visit arrive together', async () => {
    const context = setup();
    const { usecase, humanBackingAccounts, syncExternalOrganization, heldLocks } = context;
    findOrganizationOnceMade(context);

    const [webhook, firstVisit] = await Promise.all([usecase.execute(command), usecase.execute(command)]);

    // The second one waited for the first setup instead of failing, and found the account it made.
    expect(firstVisit).to.deep.equal(webhook);
    expect(webhook).to.include({ organizationId: 'novu_org', environmentId: 'dev_env' });
    expect(syncExternalOrganization.execute.calledOnce).to.equal(true);
    expect(
      humanBackingAccounts.findOrCreate.secondCall.calledAfter(syncExternalOrganization.execute.firstCall)
    ).to.equal(true);
    expect(heldLocks.size).to.equal(0);
  });

  it('runs the setup for the request that waited when the one it waited for fails', async () => {
    const context = setup();
    const { usecase, humanBackingAccounts, syncExternalOrganization } = context;
    findOrganizationOnceMade(context);
    humanBackingAccounts.findOrCreate.onFirstCall().rejects(new Error('Clerk is down'));

    const [webhook, firstVisit] = await Promise.allSettled([usecase.execute(command), usecase.execute(command)]);

    expect(webhook.status).to.equal('rejected');
    expect(firstVisit.status).to.equal('fulfilled');
    expect(firstVisit.status === 'fulfilled' && firstVisit.value).to.include({
      organizationId: 'novu_org',
      environmentId: 'dev_env',
    });
    expect(syncExternalOrganization.execute.calledOnce).to.equal(true);
  });

  it('releases the lock when the setup fails', async () => {
    const { usecase, cacheService, humanBackingAccounts } = setup();
    humanBackingAccounts.findOrCreate.rejects(new Error('Clerk is down'));

    const error = await usecase.execute(command).catch((caught) => caught);

    expect(error.message).to.equal('Clerk is down');
    expect(cacheService.del.calledOnce).to.equal(true);
  });

  describe('when the lock is not let go', () => {
    const lockKey = 'human_backing_account_lock:{user_2AbC}';
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    });

    afterEach(() => {
      clock.restore();
    });

    it('takes the lock over once the lock of a request that died runs out', async () => {
      const { usecase, heldLocks, syncExternalOrganization } = setup();
      // A request took the lock and died: nobody lets it go, so it lasts until Redis drops it.
      heldLocks.set(lockKey, Date.now() + 60_000);

      const pending = usecase.execute(command);
      await clock.tickAsync(59_000);
      expect(syncExternalOrganization.execute.called).to.equal(false);

      await clock.tickAsync(2_000);
      expect(await pending).to.include({ organizationId: 'novu_org', environmentId: 'dev_env' });
    });

    it('says busy when the lock is still held once the wait is over', async () => {
      const { usecase, cacheService, humanBackingAccounts } = setup();
      cacheService.setIfNotExist.resolves(null);

      const pending = usecase.execute(command).catch((caught) => caught);
      await clock.tickAsync(LOCK_WAIT_MS + 1_000);
      const error = await pending;

      expect(error).to.be.instanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).to.deep.include({ code: 'human_account_busy' });
      expect(humanBackingAccounts.findOrCreate.called).to.equal(false);
    });

    it('says busy when the cache stops answering, and gives back a lock it takes after that', async () => {
      const { usecase, cacheService, humanBackingAccounts } = setup();
      let answer: (result: string) => void = () => undefined;
      cacheService.setIfNotExist.returns(
        new Promise((resolve) => {
          answer = resolve;
        })
      );

      const pending = usecase.execute(command).catch((caught) => caught);
      await clock.tickAsync(LOCK_WAIT_MS + 1_000);
      const error = await pending;

      expect(error).to.be.instanceOf(ConflictException);
      expect(humanBackingAccounts.findOrCreate.called).to.equal(false);

      // The call comes back after all, with the lock: it is let go at once.
      answer('OK');
      await clock.tickAsync(0);
      expect(cacheService.del.calledOnceWith(lockKey)).to.equal(true);
    });
  });
});
