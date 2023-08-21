import { Test } from '@nestjs/testing';
import { ExecutionDetailsRepository, JobRepository } from '@novu/dal';

import { AddJob, AddDigestJob, AddDelayJob } from './index';

import { CreateExecutionDetails } from '../create-execution-details';

import {
  CalculateDelayService,
  DistributedLockService,
  EventsDistributedLockService,
  InMemoryProviderService,
  QueueService,
} from '../../services';

let inMemoryProviderService: InMemoryProviderService;

describe('AddJob use case', function () {
  let useCase: AddJob;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [
        {
          provide: InMemoryProviderService,
          useFactory: () => {
            return new InMemoryProviderService();
          },
        },
        CalculateDelayService,
        DistributedLockService,
        EventsDistributedLockService,
        ExecutionDetailsRepository,
        JobRepository,
        CreateExecutionDetails,
        AddDigestJob,
        AddDelayJob,
      ],
    }).compile();

    const jobRepository = moduleRef.get<JobRepository>(JobRepository);
    const queueService = new QueueService();
    const createExecutionDetails = moduleRef.get<CreateExecutionDetails>(
      CreateExecutionDetails
    );
    const addDigestJob = moduleRef.get<AddDigestJob>(AddDigestJob);
    const addDelayJob = moduleRef.get<AddDelayJob>(AddDelayJob);
    useCase = new AddJob(
      jobRepository,
      createExecutionDetails,
      addDigestJob,
      addDelayJob,
      queueService
    );
  });

  afterAll(async () => {
    await useCase.queueService.gracefulShutdown();
  });

  it('should instantiate properly the use case', async () => {
    const queueService = useCase.queueService;

    expect(queueService.DEFAULT_ATTEMPTS).toEqual(3);
    expect(queueService.name).toEqual('standard');
    const { bullMqService } = queueService;
    expect(bullMqService).toBeDefined();
    expect(await bullMqService.getRunningStatus()).toEqual({
      queueIsPaused: false,
      queueName: 'standard',
      workerIsRunning: undefined,
      workerName: undefined,
    });
  });
});
