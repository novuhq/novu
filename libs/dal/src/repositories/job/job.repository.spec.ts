import type { IDigestBaseMetadata } from '@novu/shared';
import { JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { expect } from 'chai';
import type { JobEntity } from './job.entity';
import { JobRepository } from './job.repository';

type JobQuery = Record<string, unknown>;
type MockModel = {
  findOne: (query: JobQuery, projection: string) => Promise<null>;
};

describe('JobRepository - Digest Self-Merge Prevention (#12373)', () => {
  let jobRepository: JobRepository;
  let mockModel: MockModel;

  beforeEach(() => {
    mockModel = {
      findOne: (_query: JobQuery, _projection: string) => {
        return Promise.resolve(null);
      },
    };

    jobRepository = new JobRepository();
    (jobRepository as unknown as { _model: MockModel })._model = mockModel;
  });

  it('should query existing delayed jobs excluding the current job id ($ne: job._id)', async () => {
    let capturedQuery: JobQuery | null = null;

    mockModel.findOne = (query: JobQuery) => {
      capturedQuery = query;
      return Promise.resolve(null);
    };

    const mockJob = {
      _id: '64b0f0000000000000000001',
      _environmentId: '64b0f0000000000000000002',
      _subscriberId: '64b0f0000000000000000003',
      _templateId: '64b0f0000000000000000004',
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
    } as JobEntity;

    await jobRepository.getExistingDelayedJobWithTheSameDigestValue(mockJob, {
      digestValue: 'test-digest',
    } as IDigestBaseMetadata);

    expect(capturedQuery).to.not.equal(null);
    expect(capturedQuery?.status).to.equal(JobStatusEnum.DELAYED);
    expect(capturedQuery?.type).to.equal(StepTypeEnum.DIGEST);

    const idFilter = capturedQuery?._id as { $ne?: { toString: () => string } } | undefined;
    expect(idFilter?.$ne?.toString()).to.equal(mockJob._id);
  });
});
