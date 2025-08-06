import { ClickHouseService, StepRunRepository } from '@novu/application-generic';
import { JobEntity, JobRepository, SubscriberEntity } from '@novu/dal';
import { EmailBlockTypeEnum, JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { format, subDays } from 'date-fns';
import { GetChartsResponseDto } from '../dtos/get-charts.response.dto';

describe('Activity Charts - GET /v1/activity/charts #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let stepRunRepository: StepRunRepository;
  let jobRepository: JobRepository;
  const clickHouseService = new ClickHouseService();

  async function createStepRunsForChart(options: { channelType: StepTypeEnum; count: number }) {
    const { channelType, count } = options;
    const jobs: JobEntity[] = [];

    // Create a template for this channel type
    const template = await session.createTemplate({
      steps: [
        {
          type: channelType,
          content:
            channelType === StepTypeEnum.EMAIL
              ? [{ type: EmailBlockTypeEnum.TEXT, content: 'Test content' }]
              : 'Default content',
          ...(channelType === StepTypeEnum.EMAIL && {
            subject: 'Test Email',
          }),
        },
      ],
    });

    for (let i = 0; i < count; i++) {
      // Create data for different days within the query range (last 7 days)
      const daysAgo = Math.floor(Math.random() * 6) + 1; // Random day between 1-6 days ago
      const date = subDays(new Date(), daysAgo);

      const job: Partial<JobEntity> = {
        identifier: `test-job-${channelType}-${i}`,
        _environmentId: session.environment._id,
        _organizationId: session.organization._id,
        _userId: session.user._id,
        subscriberId: subscriber.subscriberId,
        _subscriberId: subscriber._id,
        _templateId: template._id,
        status: JobStatusEnum.COMPLETED,
        type: channelType,
        step: {
          template: template.steps[0],
        } as any,
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        transactionId: `test-transaction-${channelType}-${i}`,
        payload: { test: true },
      };

      // Create the job in the database
      const createdJob = await jobRepository.create(job as JobEntity);
      jobs.push(createdJob);
    }

    // Create step runs from the jobs
    await stepRunRepository.createMany(jobs, {
      status: JobStatusEnum.COMPLETED,
    });

    return jobs;
  }

  beforeEach(async () => {
    await clickHouseService.init();

    // Enable step run logs writing for testing
    (process.env as any).IS_STEP_RUN_LOGS_WRITE_ENABLED = 'true';

    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    stepRunRepository = session.testServer?.getService(StepRunRepository);
    jobRepository = session.testServer?.getService(JobRepository);
  });

  afterEach(() => {
    // Clean up environment variable after each test
    delete (process.env as any).IS_STEP_RUN_LOGS_WRITE_ENABLED;
  });

  it('should return delivery trend chart data with proper structure', async () => {
    await createStepRunsForChart({
      channelType: StepTypeEnum.EMAIL,
      count: 5,
    });
    await createStepRunsForChart({
      channelType: StepTypeEnum.IN_APP,
      count: 3,
    });
    await createStepRunsForChart({
      channelType: StepTypeEnum.SMS,
      count: 2,
    });
    await createStepRunsForChart({
      channelType: StepTypeEnum.PUSH,
      count: 3,
    });

    // Wait for data to be inserted
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const startDate = subDays(new Date(), 7);
    const endDate = new Date();

    const response = await session.testAgent
      .get('/v1/activity/charts')
      .query({
        'reportType[]': 'delivery-trend',
        createdAtGte: startDate.toISOString(),
        createdAtLte: endDate.toISOString(),
      })
      .expect(200);

    const body: GetChartsResponseDto = response.body;

    const deliveryTrendChart = body.data['delivery-trend'];
    expect(deliveryTrendChart).to.exist;

    expect(deliveryTrendChart).to.be.an('array');

    const chartData = deliveryTrendChart;
    expect(chartData.length).to.be.greaterThan(0);

    const lastDate = chartData[chartData.length - 1];
    const today = format(new Date(), 'yyyy-MM-dd');
    expect(lastDate.timestamp).to.equal(today);
    expect(lastDate.chat).to.equal(0);
    expect(lastDate.email).to.equal(5);
    expect(lastDate.sms).to.equal(2);
    expect(lastDate.push).to.equal(3);
    expect(lastDate.inApp).to.equal(3);
  });
});
