import { ControlValuesLevelEnum, ResourceOriginEnum, ResourceTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ExecuteBridgeJob } from './execute-bridge-job.usecase';

/**
 * Unit tests guarding the redundant-query optimization in ExecuteBridgeJob:
 * when the workflow is already loaded upstream, the bridge-type `notificationtemplates findOne`
 * must be skipped because the in-memory entity's type fully determines the same result.
 */
describe('ExecuteBridgeJob - redundant workflow lookup', () => {
  function buildUsecase() {
    const notificationTemplateRepository = { findOne: sinon.stub().resolves(null) };
    const jobRepository = { findOne: sinon.stub().resolves(null), find: sinon.stub().resolves([]) };
    const notificationPayloadService = {};
    const messageRepository = { findOne: sinon.stub().resolves(null) };
    const environmentRepository = {
      findOne: sinon.stub().resolves({ _id: 'env_1', apiKeys: [], echo: undefined }),
    };
    const controlValuesRepository = {
      findOne: sinon.stub().resolves(null),
      find: sinon.stub().resolves([]),
    };
    const createExecutionDetails = { execute: sinon.stub().resolves(undefined) };
    const executeBridgeRequest = { execute: sinon.stub().resolves({ outputs: {}, options: {} }) };
    const logger = {
      setContext: sinon.stub(),
      debug: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      trace: sinon.stub(),
    };
    // Pass-through cache so getEnvironment hits the (stubbed) repository fetch fn.
    const inMemoryLRUCacheService = {
      get: (_store: unknown, _key: string, fn: () => Promise<unknown>) => fn(),
    };

    const usecase = new ExecuteBridgeJob(
      jobRepository as never,
      notificationTemplateRepository as never,
      notificationPayloadService as never,
      messageRepository as never,
      environmentRepository as never,
      controlValuesRepository as never,
      createExecutionDetails as never,
      executeBridgeRequest as never,
      logger as never,
      inMemoryLRUCacheService as never
    );

    return {
      usecase,
      notificationTemplateRepository,
      executeBridgeRequest,
      environmentRepository,
      controlValuesRepository,
    };
  }

  function buildCommand(workflow?: Record<string, unknown>) {
    return {
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      jobId: 'job_1',
      job: {
        _id: 'job_1',
        _templateId: 'tpl_1',
        _parentId: undefined,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        step: { stepId: 'step_1', uuid: 'step_1' },
      },
      variables: {},
      workflow,
    } as never;
  }

  afterEach(() => {
    sinon.restore();
  });

  it('skips the bridge-type findOne when a non-bridge workflow is already provided', async () => {
    const { usecase, notificationTemplateRepository } = buildUsecase();

    // NOVU_CLOUD/regular workflow → DB query would filter by ECHO/BRIDGE and return null.
    const result = await usecase.execute(
      buildCommand({
        _id: 'tpl_1',
        type: ResourceTypeEnum.REGULAR,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        triggers: [{ identifier: 'wf-identifier' }],
      })
    );

    expect(notificationTemplateRepository.findOne.called).to.equal(false);
    // Equivalent to the previous behaviour: stateful job with no bridge workflow returns null.
    expect(result).to.equal(null);
  });

  it('queries the repository when no workflow is provided', async () => {
    const { usecase, notificationTemplateRepository } = buildUsecase();

    const result = await usecase.execute(buildCommand(undefined));

    expect(notificationTemplateRepository.findOne.calledOnce).to.equal(true);
    expect(result).to.equal(null);
  });

  it('uses the provided bridge workflow without querying the repository', async () => {
    const { usecase, notificationTemplateRepository, executeBridgeRequest } = buildUsecase();

    const result = await usecase.execute(
      buildCommand({
        _id: 'tpl_1',
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        triggers: [{ identifier: 'wf-identifier' }],
      })
    );

    expect(notificationTemplateRepository.findOne.called).to.equal(false);
    expect(executeBridgeRequest.execute.calledOnce).to.equal(true);
    expect(result).to.deep.equal({ outputs: {}, options: {} });
  });

  it('passes actor to the bridge event when provided in variables', async () => {
    const { usecase, executeBridgeRequest } = buildUsecase();
    const actor = {
      subscriberId: 'actor-subscriber-01',
      firstName: 'Actor',
      lastName: 'User',
      email: 'actor@example.com',
    };

    const command = {
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      jobId: 'job_1',
      job: {
        _id: 'job_1',
        _templateId: 'tpl_1',
        _parentId: undefined,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        step: { stepId: 'step_1', uuid: 'step_1' },
      },
      variables: {
        subscriber: { subscriberId: 'recipient-01' },
        actor,
        payload: {},
        env: { name: 'Development', type: 'dev' },
      },
      workflow: {
        _id: 'tpl_1',
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        triggers: [{ identifier: 'wf-identifier' }],
      },
    } as never;

    await usecase.execute(command);

    expect(executeBridgeRequest.execute.calledOnce).to.equal(true);
    const bridgeRequest = executeBridgeRequest.execute.firstCall.args[0];
    expect(bridgeRequest.event.actor).to.deep.equal(actor);
  });

  it('stitches STEP_PROVIDER_CONTROLS docs into controls.providerOverrides for the bridge event', async () => {
    const { usecase, executeBridgeRequest, controlValuesRepository } = buildUsecase();

    controlValuesRepository.findOne.resolves({
      controls: { body: 'default alert' },
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });
    controlValuesRepository.find.resolves([
      {
        providerId: ToolProviderIdEnum.PagerDuty,
        controls: { severity: 'warning', summary: 'db down' },
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      },
      {
        providerId: ToolProviderIdEnum.Webhook,
        controls: { alert_type: 'incident', priority: 'high' },
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      },
    ]);

    const command = {
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      identifier: 'wf-identifier',
      jobId: 'job_1',
      job: {
        _id: 'job_1',
        _templateId: 'tpl_1',
        _parentId: undefined,
        _environmentId: 'env_1',
        _organizationId: 'org_1',
        step: {
          stepId: 'step_1',
          uuid: 'step_1',
          _id: 'step_tpl_1',
          template: { type: 'tool' },
        },
      },
      variables: {
        payload: {},
        env: { name: 'Development', type: 'dev' },
      },
      workflow: {
        _id: 'tpl_1',
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
        triggers: [{ identifier: 'wf-identifier' }],
      },
    } as never;

    await usecase.execute(command);

    expect(executeBridgeRequest.execute.calledOnce).to.equal(true);
    const bridgeRequest = executeBridgeRequest.execute.firstCall.args[0];
    expect(bridgeRequest.event.controls).to.deep.equal({
      body: 'default alert',
      providerOverrides: {
        [ToolProviderIdEnum.PagerDuty]: { severity: 'warning', summary: 'db down' },
        [ToolProviderIdEnum.Webhook]: { alert_type: 'incident', priority: 'high' },
      },
    });
  });
});
