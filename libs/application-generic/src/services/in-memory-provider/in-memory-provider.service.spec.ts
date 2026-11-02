import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { InMemoryProviderService } from './in-memory-provider.service';
import { InMemoryProviderEnum } from './types';

let inMemoryProviderService: InMemoryProviderService;

/*
 * Hermetic stand-in for the ioredis Redis client: no sockets are opened. Constructor args are
 * recorded so the tests can assert what the service passes to ioredis. The real `Cluster` class
 * is kept as a static so the cluster tests can spy on it.
 */
const { redisConstructorCalls, FakeRedis } = vi.hoisted(() => {
  const calls: unknown[][] = [];

  class FakeRedisClient {
    static Cluster: unknown;
    public status = 'ready';
    public isCluster = false;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    public quit = vi.fn().mockResolvedValue('OK');
    public ping = vi.fn().mockResolvedValue('PONG');
    public set = vi.fn().mockResolvedValue('OK');
    public get = vi.fn();
    public options: Record<string, unknown>;

    constructor(...args: unknown[]) {
      calls.push(args);
      const [port, host, options] = args as [number, string, Record<string, unknown>];
      this.options = { port, host, ...options };
    }

    on(event: string, listener: (...args: unknown[]) => void) {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);

      return this;
    }
  }

  return { redisConstructorCalls: calls, FakeRedis: FakeRedisClient };
});

vi.mock('ioredis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ioredis')>();
  FakeRedis.Cluster = actual.default.Cluster;

  return { ...actual, default: FakeRedis };
});

describe('In-memory Provider Service', () => {
  describe('Non cluster mode', () => {
    const originalEnv = { ...process.env };

    beforeEach(async () => {
      process.env.REDIS_CACHE_SERVICE_HOST = 'redis-cache.test';
      process.env.REDIS_CACHE_SERVICE_PORT = '6380';
      process.env.REDIS_HOST = 'redis.test';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_DB_INDEX = '1';
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_TLS;
      redisConstructorCalls.length = 0;

      inMemoryProviderService = new InMemoryProviderService(InMemoryProviderEnum.REDIS, false);

      await inMemoryProviderService.delayUntilReadiness();

      expect(inMemoryProviderService.getStatus()).toEqual('ready');
    });

    afterEach(async () => {
      await inMemoryProviderService.shutdown();
      process.env = { ...originalEnv };
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).toEqual('redis.test');

        if ('port' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.port).toEqual(6380);
        }

        expect(inMemoryProviderConfig.connectTimeout).toEqual(50_000);
        expect(inMemoryProviderConfig.family).toEqual(4);
        expect(inMemoryProviderConfig.keepAlive).toEqual(30_000);
        expect(inMemoryProviderConfig.keyPrefix).toEqual('');
        expect(inMemoryProviderConfig.password).toEqual(undefined);
        expect(inMemoryProviderConfig.ttl).toEqual(7_200);
        expect(inMemoryProviderConfig.tls).toEqual(undefined);
      });

      it('should pass the port, host and options from the env to the ioredis Redis constructor', () => {
        expect(redisConstructorCalls).toHaveLength(1);
        expect(redisConstructorCalls[0]).toEqual([
          6380,
          'redis.test',
          expect.objectContaining({
            db: 1,
            connectTimeout: 50_000,
            family: 4,
            keepAlive: 30_000,
            keyPrefix: '',
            maxRetriesPerRequest: null,
          }),
        ]);
      });

      it('should instantiate the provider properly', () => {
        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient).toBeInstanceOf(FakeRedis);
        expect(inMemoryProviderClient.status).toEqual('ready');
        expect(inMemoryProviderClient.isCluster).toEqual(false);
        expect(inMemoryProviderService.isClientReady()).toEqual(true);

        const options = inMemoryProviderService.getOptions();

        expect(options?.host).toEqual('redis.test');
        expect(options?.port).toEqual(6380);
        expect(options?.db).toEqual(1);
      });

      it('should operate through the mocked in-memory client', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;
        (inMemoryProviderClient as unknown as InstanceType<typeof FakeRedis>).get.mockResolvedValue('non cluster mode');

        expect(await inMemoryProviderClient.ping()).toEqual('PONG');

        await inMemoryProviderClient.set('novu', 'non cluster mode');
        expect(inMemoryProviderClient.set).toHaveBeenCalledWith('novu', 'non cluster mode');
        expect(await inMemoryProviderClient.get('novu')).toEqual('non cluster mode');
      });

      it('should shut the client down on shutdown', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;

        await inMemoryProviderService.shutdown();

        expect(inMemoryProviderClient.quit).toHaveBeenCalled();
      });
    });
  });

  describe('Cluster mode', () => {
    const originalEnv = { ...process.env };
    const clusterHost = 'redis-cluster.test';
    const clusterPorts = [7000, 7001, 7002];

    let clusterSpy: ReturnType<typeof vi.spyOn>;
    let fakeClients: FakeCluster[];

    /*
     * Hermetic stand-in for ioredis Cluster: no sockets are opened. It keeps the
     * constructor args as `options`, like the real client, and reports 'ready'
     * as soon as the service has subscribed to its events.
     */
    class FakeCluster extends EventEmitter {
      public status = 'ready';
      public isCluster = true;
      public quit = vi.fn().mockResolvedValue('OK');
      public ping = vi.fn().mockResolvedValue('PONG');
      public set = vi.fn().mockResolvedValue('OK');
      public get = vi.fn();

      constructor(
        public nodes: unknown,
        public options: any
      ) {
        super();
      }
    }

    beforeEach(() => {
      process.env.REDIS_CLUSTER_SERVICE_HOST = clusterHost;
      process.env.REDIS_CLUSTER_SERVICE_PORTS = JSON.stringify(clusterPorts);
      delete process.env.REDIS_CLUSTER_SERVICE_PORT;
      delete process.env.REDIS_CLUSTER_PASSWORD;
      delete process.env.REDIS_CLUSTER_USERNAME;
      delete process.env.REDIS_CLUSTER_TLS;

      fakeClients = [];
      clusterSpy = vi.spyOn(Redis, 'Cluster').mockImplementation(function (nodes: unknown, options: any) {
        const client = new FakeCluster(nodes, options);
        fakeClients.push(client);

        return client as any;
      });

      inMemoryProviderService = new InMemoryProviderService(InMemoryProviderEnum.REDIS, true);
    });

    afterEach(async () => {
      await inMemoryProviderService.shutdown();
      clusterSpy.mockRestore();
      process.env = { ...originalEnv };
    });

    it('should be ready through the mocked cluster without opening a connection', async () => {
      await inMemoryProviderService.delayUntilReadiness();

      expect(clusterSpy).toHaveBeenCalledTimes(1);
      expect(inMemoryProviderService.getStatus()).toEqual('ready');
      expect(inMemoryProviderService.isClientReady()).toEqual(true);
    });

    describe('TEMP: Check if enableAutoPipelining true is set properly in Cluster', () => {
      it('enableAutoPipelining is enabled', async () => {
        const clusterWithPipelining = new InMemoryProviderService(InMemoryProviderEnum.REDIS, true, true);
        await clusterWithPipelining.delayUntilReadiness();

        expect(clusterWithPipelining.getStatus()).toEqual('ready');
        expect(clusterWithPipelining.inMemoryProviderClient.options.enableAutoPipelining).toEqual(true);
        expect(clusterSpy).toHaveBeenLastCalledWith(
          expect.any(Array),
          expect.objectContaining({ enableAutoPipelining: true })
        );
      });
    });

    describe('Set up', () => {
      it('should have the right config', () => {
        const { inMemoryProviderConfig } = inMemoryProviderService;

        expect(inMemoryProviderConfig.host).toEqual(clusterHost);
        if ('ports' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.ports).toEqual(clusterPorts);
        }

        if ('instances' in inMemoryProviderConfig) {
          expect(inMemoryProviderConfig.instances).toEqual(clusterPorts.map((port) => ({ host: clusterHost, port })));
        }

        expect(inMemoryProviderConfig.connectTimeout).toEqual(50_000);
        expect(inMemoryProviderConfig.family).toEqual(4);
        expect(inMemoryProviderConfig.keepAlive).toEqual(30_000);
        expect(inMemoryProviderConfig.keyPrefix).toEqual('');
        expect(inMemoryProviderConfig.password).toEqual(undefined);
        expect(inMemoryProviderConfig.ttl).toEqual(7_200);
      });

      it('should pass the cluster nodes from the env to the ioredis Cluster constructor', () => {
        expect(clusterSpy).toHaveBeenCalledWith(
          clusterPorts.map((port) => ({ host: clusterHost, port })),
          expect.any(Object)
        );
      });

      it('should instantiate the provider properly', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;

        expect(inMemoryProviderClient).toBe(fakeClients[0]);
        expect(inMemoryProviderClient.status).toEqual('ready');
        expect(inMemoryProviderClient.isCluster).toEqual(true);
        expect(inMemoryProviderClient.options.enableAutoPipelining).toEqual(false);

        const options = inMemoryProviderService.getOptions();
        expect(options).toEqual(expect.objectContaining({ maxRetriesPerRequest: null }));

        const clusterOptions = await inMemoryProviderService.getClusterOptions();
        expect(clusterOptions.enableOfflineQueue).toEqual(false);
        expect(clusterOptions.enableReadyCheck).toEqual(true);
        expect(clusterOptions.scaleReads).toEqual('master');
        expect(clusterOptions.slotsRefreshTimeout).toEqual(2000);
      });

      it('should register the client lifecycle listeners', () => {
        const [client] = fakeClients;

        for (const event of ['connect', 'connecting', 'reconnecting', 'close', 'end', 'error', 'ready', 'wait']) {
          expect(client.listenerCount(event)).toEqual(1);
        }
      });

      it('should operate through the mocked in-memory client', async () => {
        const { inMemoryProviderClient } = inMemoryProviderService;
        (inMemoryProviderClient as unknown as FakeCluster).get.mockResolvedValue('cluster mode');

        expect(await inMemoryProviderClient.ping()).toEqual('PONG');

        await inMemoryProviderClient.set('novu', 'cluster mode');
        expect(inMemoryProviderClient.set).toHaveBeenCalledWith('novu', 'cluster mode');
        expect(await inMemoryProviderClient.get('novu')).toEqual('cluster mode');
      });
    });
  });
});
