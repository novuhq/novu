import { InMemoryProviderEnum } from './types';
import { selectWorkflowInMemoryProvider, WorkflowInMemoryProviderService } from './workflow-in-memory-provider.service';

describe('selectWorkflowInMemoryProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const setRedisClusterEnv = () => {
    process.env.REDIS_CLUSTER_SERVICE_HOST = 'redis.internal';
    process.env.REDIS_CLUSTER_SERVICE_PORTS = '[6379]';
  };

  it('uses MemoryDB for Novu Cloud', () => {
    process.env.IS_SELF_HOSTED = 'false';
    process.env.NOVU_ENTERPRISE = 'true';

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.MEMORY_DB);
  });

  it('uses single-node Redis for community self-hosted even when cluster env is set', () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';
    setRedisClusterEnv();

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.REDIS);
  });

  it('uses single-node Redis for enterprise self-hosted by default', () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    setRedisClusterEnv();
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_HOST;
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_PORT;

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.REDIS);
  });

  it('uses Redis Cluster for enterprise self-hosted when cluster mode is enabled', () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';
    setRedisClusterEnv();
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_HOST;
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_PORT;

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.REDIS_CLUSTER);
  });

  it('prefers MemoryDB over Redis Cluster for enterprise self-hosted', () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';
    setRedisClusterEnv();
    process.env.MEMORY_DB_CLUSTER_SERVICE_HOST = 'memorydb.internal';
    process.env.MEMORY_DB_CLUSTER_SERVICE_PORT = '6379';

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.MEMORY_DB);
  });

  /**
   * Cluster mode routes construction through the cluster path regardless of the
   * selected provider, so an incomplete cluster config must fail startup rather
   * than quietly send queues to a single-node Redis the operator did not pick.
   */
  it('fails startup instead of downgrading to standalone Redis when cluster endpoints are missing', () => {
    process.env.IS_SELF_HOSTED = 'true';
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'true';
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_HOST;
    delete process.env.MEMORY_DB_CLUSTER_SERVICE_PORT;
    delete process.env.REDIS_CLUSTER_SERVICE_HOST;
    delete process.env.REDIS_CLUSTER_SERVICE_PORT;
    delete process.env.REDIS_CLUSTER_SERVICE_PORTS;

    expect(selectWorkflowInMemoryProvider()).toEqual(InMemoryProviderEnum.REDIS_CLUSTER);
    expect(() => new WorkflowInMemoryProviderService()).toThrow(
      'Provider RedisCluster is not properly configured in the environment variables'
    );
  });
});
