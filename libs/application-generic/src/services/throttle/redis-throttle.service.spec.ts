import { CacheInMemoryProviderService, WorkflowInMemoryProviderService } from '../in-memory-provider';
import { RedisThrottleService } from './redis-throttle.service';

const mockInitialize = jest.fn(async () => undefined);
const mockShutdown = jest.fn(async () => undefined);
const mockScript = jest.fn(async () => 'script-sha');
const mockEvalsha = jest.fn(async () => [1, 1, 90]);

jest.mock('../in-memory-provider', () => {
  const actual = jest.requireActual('../in-memory-provider');

  return {
    ...actual,
    CacheInMemoryProviderService: jest.fn().mockImplementation(() => ({
      initialize: mockInitialize,
      shutdown: mockShutdown,
      getClient: () => ({
        script: mockScript,
        evalsha: mockEvalsha,
      }),
    })),
  };
});

describe('RedisThrottleService SQS cache client', () => {
  const envKeys = [
    'QUEUE_BACKEND',
    'IS_SELF_HOSTED',
    'NOVU_ENTERPRISE',
    'IS_IN_MEMORY_CLUSTER_MODE_ENABLED',
    'IN_MEMORY_CLUSTER_MODE_ENABLED',
    'THROTTLE_REDIS_TTL_BUFFER_MS',
  ] as const;
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    jest.clearAllMocks();
  });

  it('reserves a throttle slot through the cache client and shuts it down', async () => {
    process.env.QUEUE_BACKEND = 'sqs';
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    delete process.env.THROTTLE_REDIS_TTL_BUFFER_MS;

    const workflowInMemoryProviderService = new WorkflowInMemoryProviderService();
    expect(workflowInMemoryProviderService.getClient()).toBeUndefined();

    const throttleService = new RedisThrottleService(workflowInMemoryProviderService);
    expect(CacheInMemoryProviderService).not.toHaveBeenCalled();

    const result = await throttleService.reserveThrottleSlot({
      environmentId: 'env-1',
      subscriberId: 'sub-1',
      workflowId: 'wf-1',
      stepId: 'step-1',
      jobId: 'job-1',
      windowMs: 60_000,
      limit: 2,
      nowMs: 1_700_000_000_000,
    });

    expect(result).toEqual({
      granted: true,
      count: 1,
      ttlMs: 90_000,
      windowStartMs: 1_700_000_000_000,
    });
    expect(CacheInMemoryProviderService).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(mockScript).toHaveBeenCalledWith('LOAD', expect.stringContaining('SCARD'));
    expect(mockEvalsha).toHaveBeenCalledWith(
      'script-sha',
      1,
      'throttle:env-1:sub-1:wf-1:step-1:set',
      '2',
      '90',
      'job-1'
    );

    await throttleService.onModuleDestroy();

    expect(mockShutdown).toHaveBeenCalledTimes(1);
  });
});
