import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { StoreSubscriberJobs } from './store-subscriber-jobs.usecase';

function buildJobEntity(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'job_1',
    _userId: 'user_1',
    _environmentId: 'env_1',
    _organizationId: 'org_1',
    _subscriberId: 'subscriber_internal_1',
    subscriberId: 'subscriber_1',
    _notificationId: 'notification_1',
    _templateId: 'template_1',
    providerId: 'provider_1',
    transactionId: 'transaction_1',
    identifier: 'workflow-run-1',
    type: StepTypeEnum.EMAIL,
    bridge: false,
    controlVariables: {},
    ...overrides,
  };
}

describe('StoreSubscriberJobs', () => {
  let usecase: StoreSubscriberJobs;
  let jobRepository: { storeJobs: sinon.SinonStub };
  let stepRunRepository: { createMany: sinon.SinonStub };
  let createExecutionDetails: { execute: sinon.SinonStub };
  let addJob: { execute: sinon.SinonStub };
  let bulkCreateExecutionDetails: { execute: sinon.SinonStub };

  beforeEach(() => {
    jobRepository = { storeJobs: sinon.stub() };
    stepRunRepository = { createMany: sinon.stub().resolves() };
    createExecutionDetails = { execute: sinon.stub().resolves() };
    addJob = { execute: sinon.stub().resolves() };
    bulkCreateExecutionDetails = { execute: sinon.stub().resolves() };

    usecase = new StoreSubscriberJobs(
      addJob as never,
      jobRepository as never,
      bulkCreateExecutionDetails as never,
      stepRunRepository as never,
      createExecutionDetails as never
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('emits step_created trace for each stored job', async () => {
    const job1 = buildJobEntity({ _id: 'job_1' });
    const job2 = buildJobEntity({ _id: 'job_2', type: StepTypeEnum.SMS });
    jobRepository.storeJobs.resolves([job1, job2]);

    await usecase.execute({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      jobs: [job1, job2],
    } as never);

    expect(createExecutionDetails.execute.callCount).to.equal(2);

    const firstCallArg = createExecutionDetails.execute.getCall(0).args[0];
    expect(firstCallArg.detail).to.equal('Step created');
    expect(firstCallArg.source).to.equal(ExecutionDetailsSourceEnum.INTERNAL);
    expect(firstCallArg.status).to.equal(ExecutionDetailsStatusEnum.SUCCESS);
    expect(firstCallArg.isTest).to.equal(false);
    expect(firstCallArg.isRetry).to.equal(false);
    expect(firstCallArg.jobId).to.equal('job_1');
    expect(firstCallArg.channel).to.equal(StepTypeEnum.EMAIL);

    const secondCallArg = createExecutionDetails.execute.getCall(1).args[0];
    expect(secondCallArg.jobId).to.equal('job_2');
    expect(secondCallArg.channel).to.equal(StepTypeEnum.SMS);
  });

  it('emits step_created traces before invoking addJob', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);

    const callOrder: string[] = [];
    createExecutionDetails.execute.callsFake(async () => {
      callOrder.push('createExecutionDetails');
    });
    addJob.execute.callsFake(async () => {
      callOrder.push('addJob');
    });

    await usecase.execute({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      jobs: [job],
    } as never);

    expect(callOrder).to.deep.equal(['createExecutionDetails', 'addJob']);
  });

  it('populates trace fields from job metadata via getDetailsFromJob', async () => {
    const job = buildJobEntity({
      _id: 'job_42',
      _environmentId: 'env_42',
      _organizationId: 'org_42',
      subscriberId: 'ext_sub_42',
      _subscriberId: 'int_sub_42',
      _notificationId: 'notif_42',
      _templateId: 'tpl_42',
      providerId: 'prov_42',
      transactionId: 'tx_42',
      identifier: 'wf_run_42',
      type: StepTypeEnum.PUSH,
    });
    jobRepository.storeJobs.resolves([job]);

    await usecase.execute({
      environmentId: 'env_42',
      organizationId: 'org_42',
      userId: 'user_1',
      jobs: [job],
    } as never);

    const callArg = createExecutionDetails.execute.getCall(0).args[0];
    expect(callArg.environmentId).to.equal('env_42');
    expect(callArg.organizationId).to.equal('org_42');
    expect(callArg.subscriberId).to.equal('ext_sub_42');
    expect(callArg._subscriberId).to.equal('int_sub_42');
    expect(callArg.notificationId).to.equal('notif_42');
    expect(callArg.notificationTemplateId).to.equal('tpl_42');
    expect(callArg.providerId).to.equal('prov_42');
    expect(callArg.transactionId).to.equal('tx_42');
    expect(callArg.workflowRunIdentifier).to.equal('wf_run_42');
    expect(callArg.channel).to.equal(StepTypeEnum.PUSH);
  });

  it('calls stepRunRepository.createMany before emitting traces', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);

    const callOrder: string[] = [];
    stepRunRepository.createMany.callsFake(async () => {
      callOrder.push('createMany');
    });
    createExecutionDetails.execute.callsFake(async () => {
      callOrder.push('createExecutionDetails');
    });

    await usecase.execute({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      jobs: [job],
    } as never);

    expect(callOrder[0]).to.equal('createMany');
    expect(callOrder[1]).to.equal('createExecutionDetails');
  });

  it('still calls addJob even with a single stored job', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);

    await usecase.execute({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      jobs: [job],
    } as never);

    expect(addJob.execute.calledOnce).to.be.true;
    const addJobArg = addJob.execute.getCall(0).args[0];
    expect(addJobArg.jobId).to.equal('job_1');
  });
});
