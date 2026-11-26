import { WorkflowRunStatusEnum } from '@novu/application-generic';
import { JobEntity, JobStatusEnum } from '@novu/dal';
import { EnvironmentTypeEnum, SECRET_MASK, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ExecuteBridgeJobCommand } from '../execute-bridge-job';
import { AddJobCommand } from './add-job.command';
import { AddJob } from './add-job.usecase';

/**
 * Structural view of the collaborators the deferred path touches up to the bridge
 * `skip` check, so variable resolution can be asserted without booting the DI graph.
 */
type AddJobTestDouble = {
  executeDeferredJob: (command: AddJobCommand) => Promise<{
    workflowStatus: WorkflowRunStatusEnum | null;
    stepStatus?: string;
  }>;
  normalizeVariablesUsecase: { execute: sinon.SinonStub; getSubscriberBySubscriberId: sinon.SinonStub };
  contextRepository: { findByKeys: sinon.SinonStub };
  environmentRepository: { findByIdAndOrganization: sinon.SinonStub };
  environmentVariableRepository: { findByEnvironment: sinon.SinonStub };
  inMemoryLRUCacheService: { get: sinon.SinonStub };
  conditionsFilter: { filter: sinon.SinonStub };
  executeBridgeJob: { execute: sinon.SinonStub };
};

const ENVIRONMENT = {
  _id: 'environment-id',
  _organizationId: 'organization-id',
  name: 'Production',
  type: EnvironmentTypeEnum.PROD,
};

function buildUsecase(sandbox: sinon.SinonSandbox): AddJobTestDouble {
  const usecase = Object.create(AddJob.prototype) as AddJobTestDouble;
  usecase.normalizeVariablesUsecase = {
    execute: sandbox.stub().resolves({ payload: { type: 'a' }, subscriber: { subscriberId: 'subscriber-1' } }),
    getSubscriberBySubscriberId: sandbox.stub().resolves(null),
  };
  usecase.contextRepository = { findByKeys: sandbox.stub().resolves([]) };
  usecase.environmentRepository = { findByIdAndOrganization: sandbox.stub().resolves(ENVIRONMENT) };
  usecase.environmentVariableRepository = { findByEnvironment: sandbox.stub().resolves([]) };
  // Cache miss: run the loader.
  usecase.inMemoryLRUCacheService = {
    get: sandbox.stub().callsFake(async (_store, _key, loader: () => Promise<unknown>) => loader()),
  };
  usecase.conditionsFilter = {
    filter: sandbox.stub().callsFake(async ({ variables }) => ({ passed: true, variables })),
  };
  // Returning `skip` ends the deferred path right after the bridge call.
  usecase.executeBridgeJob = { execute: sandbox.stub().resolves({ options: { skip: true } }) };

  return usecase;
}

function buildCommand(jobOverrides: Partial<JobEntity> = {}): AddJobCommand {
  return {
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    userId: 'user-id',
    jobId: 'job-id',
    job: {
      _id: 'job-id',
      _environmentId: 'environment-id',
      _organizationId: 'organization-id',
      _subscriberId: 'subscriber-db-id',
      subscriberId: 'subscriber-1',
      identifier: 'delay',
      type: StepTypeEnum.DELAY,
      payload: { type: 'a' },
      step: { filters: [] },
      ...jobOverrides,
    } as unknown as JobEntity,
  } as AddJobCommand;
}

function bridgeCommand(usecase: AddJobTestDouble): ExecuteBridgeJobCommand {
  return usecase.executeBridgeJob.execute.firstCall.args[0];
}

describe('AddJob - deferred step variables', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  for (const type of [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE]) {
    it(`passes the resolved trigger context to the ${type} step conditions and bridge skip check`, async () => {
      const usecase = buildUsecase(sandbox);
      usecase.contextRepository.findByKeys.resolves([
        { type: 'workspace', id: 'ws_1', data: { status: 'ACTIVE' } },
        { type: 'tenant', id: 'acme', data: {} },
      ]);

      const result = await usecase.executeDeferredJob(
        buildCommand({ type, contextKeys: ['workspace:ws_1', 'tenant:acme'] })
      );

      const expectedContext = {
        workspace: { id: 'ws_1', data: { status: 'ACTIVE' } },
        tenant: { id: 'acme', data: {} },
      };

      expect(
        usecase.contextRepository.findByKeys.calledOnceWithExactly('environment-id', 'organization-id', [
          'workspace:ws_1',
          'tenant:acme',
        ])
      ).to.equal(true);
      expect(usecase.conditionsFilter.filter.firstCall.args[0].variables.context).to.deep.equal(expectedContext);
      expect(bridgeCommand(usecase).variables?.context).to.deep.equal(expectedContext);
      expect(bridgeCommand(usecase).variables?.subscriber).to.deep.equal({ subscriberId: 'subscriber-1' });
      expect(result.stepStatus).to.equal(JobStatusEnum.SKIPPED);
    });
  }

  it('skips the context lookup and sends an empty context when the trigger had none', async () => {
    const usecase = buildUsecase(sandbox);

    await usecase.executeDeferredJob(buildCommand({ contextKeys: undefined }));

    expect(usecase.contextRepository.findByKeys.called).to.equal(false);
    expect(bridgeCommand(usecase).variables?.context).to.deep.equal({});
  });

  it('passes the trigger actor to the step conditions and bridge skip check', async () => {
    const usecase = buildUsecase(sandbox);
    const actor = { subscriberId: 'actor-1', firstName: 'Ada' };
    usecase.normalizeVariablesUsecase.getSubscriberBySubscriberId.resolves(actor);

    await usecase.executeDeferredJob(buildCommand({ actorId: 'actor-1' }));

    expect(
      usecase.normalizeVariablesUsecase.getSubscriberBySubscriberId.calledOnceWithExactly({
        subscriberId: 'actor-1',
        _environmentId: 'environment-id',
      })
    ).to.equal(true);
    expect(usecase.conditionsFilter.filter.firstCall.args[0].variables.actor).to.deep.equal(actor);
    expect(bridgeCommand(usecase).variables?.actor).to.deep.equal(actor);
  });

  it('skips the actor lookup when the trigger had no actor', async () => {
    const usecase = buildUsecase(sandbox);

    await usecase.executeDeferredJob(buildCommand());

    expect(usecase.normalizeVariablesUsecase.getSubscriberBySubscriberId.called).to.equal(false);
    expect(bridgeCommand(usecase).variables).to.not.have.property('actor');
  });

  it('passes env, with masked secrets, and the loaded environment to the bridge', async () => {
    const usecase = buildUsecase(sandbox);
    usecase.environmentVariableRepository.findByEnvironment.resolves([
      { key: 'REGION', value: 'eu', isSecret: false },
      { key: 'API_TOKEN', value: 'nv-enc:secret', isSecret: true },
      { key: 'name', value: 'overridden', isSecret: false },
    ]);

    await usecase.executeDeferredJob(buildCommand());

    expect(
      usecase.environmentVariableRepository.findByEnvironment.calledOnceWithExactly('organization-id', 'environment-id')
    ).to.equal(true);
    expect(usecase.inMemoryLRUCacheService.get.secondCall.args[1]).to.equal('organization-id:environment-id:masked');
    expect(bridgeCommand(usecase).variables?.env).to.deep.equal({
      REGION: 'eu',
      API_TOKEN: SECRET_MASK,
      name: 'Production',
      type: EnvironmentTypeEnum.PROD,
    });
    expect(bridgeCommand(usecase).environment).to.equal(ENVIRONMENT);
  });

  it('leaves env and the environment to ExecuteBridgeJob when the environment is not found', async () => {
    const usecase = buildUsecase(sandbox);
    usecase.environmentRepository.findByIdAndOrganization.resolves(null);

    await usecase.executeDeferredJob(buildCommand());

    expect(bridgeCommand(usecase).variables).to.not.have.property('env');
    expect(bridgeCommand(usecase).environment).to.equal(undefined);
  });
});
