import { SubscriberSourceEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { SubscriberJobBoundCommand } from './subscriber-job-bound.command';
import { SubscriberJobBound } from './subscriber-job-bound.usecase';

const ENVIRONMENT_ID = 'aaaaaaaaaaaaaaaaaaaaaaa1';
const ORGANIZATION_ID = 'aaaaaaaaaaaaaaaaaaaaaaa2';
const USER_ID = 'aaaaaaaaaaaaaaaaaaaaaaa3';
const WORKFLOW_ID = 'aaaaaaaaaaaaaaaaaaaaaaa4';
const SUBSCRIBER_ID = 'aaaaaaaaaaaaaaaaaaaaaaa5';

describe('SubscriberJobBound - usage increment stamp', () => {
  function buildUsecase() {
    const createNotificationJobs = { execute: sinon.stub().resolves([]) };
    const storeSubscriberJobs = { execute: sinon.stub().resolves() };
    const createOrUpdateSubscriberUsecase = {
      execute: sinon.stub().resolves({ _id: SUBSCRIBER_ID, subscriberId: 'external-subscriber-1' }),
    };
    const getPreferences = { safeExecute: sinon.stub().resolves({ preferences: { all: { readOnly: false } } }) };
    const inMemoryLRUCacheService = {
      get: sinon.stub().resolves({ _id: WORKFLOW_ID, name: 'Test workflow', steps: [], triggers: [] }),
    };
    const logger = { setContext: sinon.stub(), assign: sinon.stub(), error: sinon.stub(), warn: sinon.stub() };

    const usecase = new SubscriberJobBound(
      storeSubscriberJobs as never,
      createNotificationJobs as never,
      createOrUpdateSubscriberUsecase as never,
      { find: sinon.stub().resolves([]) } as never,
      {} as never,
      logger as never,
      { mixpanelTrack: sinon.stub() } as never,
      {} as never,
      getPreferences as never,
      {} as never,
      {} as never,
      inMemoryLRUCacheService as never,
      {} as never
    );

    return { usecase, createNotificationJobs };
  }

  function buildCommand(overrides: Partial<SubscriberJobBoundCommand> = {}): SubscriberJobBoundCommand {
    return {
      environmentId: ENVIRONMENT_ID,
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      transactionId: 'tx_1',
      identifier: 'test-workflow',
      payload: {},
      overrides: {},
      contextKeys: [],
      templateId: WORKFLOW_ID,
      subscriber: { subscriberId: 'external-subscriber-1' },
      _subscriberSource: SubscriberSourceEnum.SINGLE,
      ...overrides,
    } as SubscriberJobBoundCommand;
  }

  afterEach(() => {
    sinon.restore();
  });

  it('forwards the stamp so notification job creation increments the usage counter', async () => {
    const { usecase, createNotificationJobs } = buildUsecase();

    await usecase.execute(buildCommand({ incrementUsageInWorker: true }));

    expect(createNotificationJobs.execute.calledOnce).to.equal(true);
    expect(createNotificationJobs.execute.firstCall.args[0].incrementUsageInWorker).to.equal(true);
  });

  it('leaves the stamp unset for jobs the API already counted', async () => {
    const { usecase, createNotificationJobs } = buildUsecase();

    await usecase.execute(buildCommand());

    expect(createNotificationJobs.execute.calledOnce).to.equal(true);
    expect(createNotificationJobs.execute.firstCall.args[0].incrementUsageInWorker).to.equal(undefined);
  });
});
