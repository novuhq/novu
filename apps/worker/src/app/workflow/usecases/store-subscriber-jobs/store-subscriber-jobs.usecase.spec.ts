import { StepTypeEnum } from '@novu/shared';
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
  let traceLogRepository: { createStepRun: sinon.SinonStub };
  let addJob: { execute: sinon.SinonStub };
  let bulkCreateExecutionDetails: { execute: sinon.SinonStub };

  beforeEach(() => {
    jobRepository = { storeJobs: sinon.stub() };
    stepRunRepository = { createMany: sinon.stub().resolves() };
    traceLogRepository = { createStepRun: sinon.stub().resolves() };
    addJob = { execute: sinon.stub().resolves() };
    bulkCreateExecutionDetails = { execute: sinon.stub().resolves() };

    usecase = new StoreSubscriberJobs(
      addJob as never,
      jobRepository as never,
      bulkCreateExecutionDetails as never,
      stepRunRepository as never,
      traceLogRepository as never
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

    expect(traceLogRepository.createStepRun.calledOnce).to.be.true;

    const traces = traceLogRepository.createStepRun.getCall(0).args[0];
    expect(traces).to.have.length(2);

    expect(traces[0].event_type).to.equal('step_created');
    expect(traces[0].title).to.equal('Step created');
    expect(traces[0].status).to.equal('success');
    expect(traces[0].entity_id).to.equal('job_1');
    expect(traces[0].step_run_type).to.equal(StepTypeEnum.EMAIL);

    expect(traces[1].entity_id).to.equal('job_2');
    expect(traces[1].step_run_type).to.equal(StepTypeEnum.SMS);
  });

  it('emits step_created traces before invoking addJob', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);

    const callOrder: string[] = [];
    traceLogRepository.createStepRun.callsFake(async () => {
      callOrder.push('createStepRun');
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

    expect(callOrder).to.deep.equal(['createStepRun', 'addJob']);
  });

  it('populates trace fields from job metadata', async () => {
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

    const trace = traceLogRepository.createStepRun.getCall(0).args[0][0];
    expect(trace.environment_id).to.equal('env_42');
    expect(trace.organization_id).to.equal('org_42');
    expect(trace.external_subscriber_id).to.equal('ext_sub_42');
    expect(trace.subscriber_id).to.equal('int_sub_42');
    expect(trace.workflow_id).to.equal('tpl_42');
    expect(trace.provider_id).to.equal('prov_42');
    expect(trace.workflow_run_identifier).to.equal('wf_run_42');
    expect(trace.step_run_type).to.equal(StepTypeEnum.PUSH);
  });

  it('calls stepRunRepository.createMany before emitting traces', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);

    const callOrder: string[] = [];
    stepRunRepository.createMany.callsFake(async () => {
      callOrder.push('createMany');
    });
    traceLogRepository.createStepRun.callsFake(async () => {
      callOrder.push('createStepRun');
    });

    await usecase.execute({
      environmentId: 'env_1',
      organizationId: 'org_1',
      userId: 'user_1',
      jobs: [job],
    } as never);

    expect(callOrder[0]).to.equal('createMany');
    expect(callOrder[1]).to.equal('createStepRun');
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

  it('still calls addJob when step_created trace emission fails', async () => {
    const job = buildJobEntity();
    jobRepository.storeJobs.resolves([job]);
    traceLogRepository.createStepRun.rejects(new Error('trace write failed'));

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
