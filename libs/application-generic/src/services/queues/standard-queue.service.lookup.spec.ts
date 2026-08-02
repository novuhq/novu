import { CommunityOrganizationRepository } from '@novu/dal';
import { CloudflareSchedulerMode } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { CloudflareSchedulerService } from '../cloudflare-scheduler';
import { FeatureFlagsService } from '../feature-flags';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { SqsService } from '../sqs';
import { StandardQueueService } from './standard-queue.service';

jest.mock('../in-memory-provider', () => ({
  WorkflowInMemoryProviderService: jest.fn(() => ({})),
}));

jest.mock('../bull-mq', () => {
  const mockBullMqService = {
    createQueue: jest.fn(),
    isClientReady: jest.fn().mockReturnValue(true),
    add: jest.fn().mockResolvedValue(undefined),
    addBulk: jest.fn().mockResolvedValue(undefined),
    gracefulShutdown: jest.fn().mockResolvedValue(undefined),
  };

  return {
    BullMqService: jest.fn(() => mockBullMqService),
  };
});

jest.mock('../feature-flags', () => ({ FeatureFlagsService: jest.fn() }));

const findOneOrgMock = jest.fn();
const getFlagMock = jest.fn();
const scheduleJobMock = jest.fn();

describe('StandardQueueService - delayed job organization lookup', () => {
  let service: StandardQueueService;

  const organizationId = 'organization-id';
  const delayedJob = {
    name: 'test-delayed-job',
    groupId: organizationId,
    data: {
      _id: 'job-id',
      _environmentId: 'environment-id',
      _organizationId: organizationId,
      _userId: 'user-id',
    },
    options: { delay: 60_000 },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new StandardQueueService(
      new WorkflowInMemoryProviderService(),
      { scheduleJob: scheduleJobMock } as unknown as CloudflareSchedulerService,
      { getFlag: getFlagMock } as unknown as FeatureFlagsService,
      { findOne: findOneOrgMock } as unknown as CommunityOrganizationRepository,
      {
        send: jest.fn().mockResolvedValue(undefined),
        sendBulk: jest.fn().mockResolvedValue(undefined),
      } as unknown as SqsService,
      {
        setContext: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as unknown as PinoLogger
    );
  });

  it('uses a primary read for delayed jobs so a recently created organization is not misreported as missing', async () => {
    findOneOrgMock.mockResolvedValueOnce({ _id: organizationId, apiServiceLevel: 'free' });
    getFlagMock.mockResolvedValueOnce(CloudflareSchedulerMode.OFF);

    await expect(service.add(delayedJob)).resolves.toBeUndefined();

    expect(findOneOrgMock).toHaveBeenCalledWith(
      { _id: organizationId },
      'apiServiceLevel',
      expect.objectContaining({ readPreference: 'primary' })
    );
  });

  it('throws only when the organization is confirmed absent on a primary read', async () => {
    findOneOrgMock.mockResolvedValueOnce(undefined);

    await expect(service.add(delayedJob)).rejects.toThrow(`Organization ${organizationId} not found`);
  });

  it('routes to the Cloudflare scheduler when scheduler mode is LIVE and the organization is found', async () => {
    findOneOrgMock.mockResolvedValueOnce({ _id: organizationId, apiServiceLevel: 'free' });
    getFlagMock.mockResolvedValueOnce(CloudflareSchedulerMode.LIVE);

    await service.add(delayedJob);

    expect(scheduleJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: delayedJob.data._id, mode: CloudflareSchedulerMode.LIVE })
    );
  });
});
