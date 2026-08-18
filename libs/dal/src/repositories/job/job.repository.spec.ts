import { expect } from 'chai';
import { JobRepository } from './job.repository';
import { JobStatusEnum, StepTypeEnum } from '@novu/shared';

describe('JobRepository - Digest Self-Merge Prevention (#12373)', () => {
  let jobRepository: JobRepository;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      findOne: (query: any, projection: any) => {
        return Promise.resolve(null);
      },
    };

    jobRepository = new JobRepository();
    (jobRepository as any)._model = mockModel;
  });

  it('should query existing delayed jobs excluding the current job id ($ne: job._id)', async () => {
    let capturedQuery: any = null;

    mockModel.findOne = (query: any) => {
      capturedQuery = query;
      return Promise.resolve(null);
    };

    const mockJob: any = {
      _id: '64b0f0000000000000000001',
      _environmentId: '64b0f0000000000000000002',
      _subscriberId: '64b0f0000000000000000003',
      _templateId: '64b0f0000000000000000004',
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
    };

    await jobRepository.getExistingDelayedJobWithTheSameDigestValue(mockJob, { digestValue: 'test-digest' } as any);

    expect(capturedQuery).to.exist;
    expect(capturedQuery.status).to.equal(JobStatusEnum.DELAYED);
    expect(capturedQuery.type).to.equal(StepTypeEnum.DIGEST);
    expect(capturedQuery._id).to.exist;
    expect(capturedQuery._id.$ne).to.exist;
    expect(capturedQuery._id.$ne.toString()).to.equal(mockJob._id);
  });
});
