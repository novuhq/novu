import { JobStatusEnum } from '@novu/dal';
import { expect } from 'chai';
import sinon from 'sinon';
import { UpdateJobStatusCommand } from './update-job-status.command';
import { UpdateJobStatus } from './update-job-status.usecase';

describe('UpdateJobStatus', () => {
  let jobRepository: { updateStatus: sinon.SinonStub };
  let stepRunV2Writer: { write: sinon.SinonStub };
  let usecase: UpdateJobStatus;

  beforeEach(() => {
    jobRepository = { updateStatus: sinon.stub() };
    stepRunV2Writer = { write: sinon.stub() };
    usecase = new UpdateJobStatus(jobRepository as never, stepRunV2Writer as never);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('writes the post-update job to step_runs_v2', async () => {
    const updatedJob = { _id: 'job_1', _environmentId: 'env_1', status: JobStatusEnum.COMPLETED };
    jobRepository.updateStatus.resolves(updatedJob);

    const result = await usecase.execute(
      UpdateJobStatusCommand.create({
        environmentId: 'env_1',
        organizationId: 'org_1',
        jobId: 'job_1',
        status: JobStatusEnum.COMPLETED,
      })
    );

    expect(result).to.equal(updatedJob);
    expect(stepRunV2Writer.write.calledOnceWithExactly(updatedJob)).to.be.true;
  });

  it('passes null through when no job matched, so nothing is written', async () => {
    jobRepository.updateStatus.resolves(null);

    await usecase.execute(
      UpdateJobStatusCommand.create({
        environmentId: 'env_1',
        organizationId: 'org_1',
        jobId: 'missing',
        status: JobStatusEnum.FAILED,
      })
    );

    expect(stepRunV2Writer.write.calledOnceWithExactly(null)).to.be.true;
  });
});
