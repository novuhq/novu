import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CacheInMemoryProviderService, WorkflowInMemoryProviderService } from '../in-memory-provider';
import { buildThrottleGroupingSuffix } from './resolve-throttle-grouping';
import { IThrottleReservationParams, IThrottleReservationResult } from './throttle.types';

const LOG_CONTEXT = 'RedisThrottleService';

@Injectable()
export class RedisThrottleService implements OnModuleDestroy {
  private reserveScriptSha: string | null = null;
  private releaseScriptSha: string | null = null;
  private readonly ttlBufferMs: number;
  /** Opened only when BullMQ's Redis is absent, so throttle stays on ElastiCache. */
  private cacheInMemoryProviderService?: CacheInMemoryProviderService;

  private readonly reserveScript = `
    -- KEYS[1] = setKey
    -- ARGV[1] = limit
    -- ARGV[2] = ttlSec
    -- ARGV[3] = jobId
    -- Returns: {granted (0/1), countAfter, ttlSecRemaining}
    local setKey = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttlSec = tonumber(ARGV[2])
    local jobId = ARGV[3]

    -- Manual TTL check: if key exists but has expired, clean it up
    local currentTtl = redis.call('TTL', setKey)
    if currentTtl == 0 then
      -- Key exists but has no TTL (should not happen) or has expired
      redis.call('DEL', setKey)
    elseif currentTtl == -1 then
      -- Key exists but has no expiry set (should not happen with our logic)
      redis.call('DEL', setKey)
    end

    local count = redis.call('SCARD', setKey)
    if count >= limit then
      local ttl = redis.call('TTL', setKey)
      return {0, count, ttl}
    end

    local added = redis.call('SADD', setKey, jobId)
    if added == 0 then
      -- Job already exists, consider it granted
      local ttl = redis.call('TTL', setKey)
      return {1, count, ttl}
    end

    count = count + 1
    if count == 1 then
      redis.call('EXPIRE', setKey, ttlSec)
    end

    if count > limit then
      redis.call('SREM', setKey, jobId)
      local ttl = redis.call('TTL', setKey)
      return {0, count - 1, ttl}
    end

    local ttl = redis.call('TTL', setKey)
    return {1, count, ttl}
  `;

  private readonly releaseScript = `
    -- KEYS[1] = setKey
    -- ARGV[1] = jobId
    -- Returns: {removed (0/1), countAfter, ttlSecRemaining}
    local setKey = KEYS[1]
    local jobId = ARGV[1]
    
    -- Manual TTL check: if key exists but has expired, clean it up
    local currentTtl = redis.call('TTL', setKey)
    if currentTtl == 0 then
      -- Key exists but has no TTL (should not happen) or has expired
      redis.call('DEL', setKey)
      return {0, 0, 0}
    elseif currentTtl == -1 then
      -- Key exists but has no expiry set (should not happen with our logic)
      redis.call('DEL', setKey)
      return {0, 0, 0}
    end
    
    local removed = redis.call('SREM', setKey, jobId)
    local count = redis.call('SCARD', setKey)
    local ttl = redis.call('TTL', setKey)
    return {removed, count, ttl}
  `;

  constructor(private workflowInMemoryProviderService: WorkflowInMemoryProviderService) {
    this.ttlBufferMs = Number(process.env.THROTTLE_REDIS_TTL_BUFFER_MS) || 30000;
  }

  /**
   * BullMQ modes keep throttle keys on the workflow Redis (MemoryDB). SQS-only
   * has no workflow Redis; ElastiCache, which cache already uses, holds them.
   */
  private async getRedisClient(): Promise<Redis | undefined> {
    const workflowClient = this.workflowInMemoryProviderService.getClient();

    if (workflowClient) {
      return workflowClient as Redis;
    }

    if (!this.cacheInMemoryProviderService) {
      this.cacheInMemoryProviderService = new CacheInMemoryProviderService();
      await this.cacheInMemoryProviderService.initialize();
    }

    return this.cacheInMemoryProviderService.getClient() as Redis;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.cacheInMemoryProviderService) {
      return;
    }

    await this.cacheInMemoryProviderService.shutdown();
  }

  private buildSetKey(params: {
    environmentId: string;
    subscriberId: string;
    workflowId: string;
    stepId: string;
    throttleKey?: string;
    throttleValue?: string;
  }): string {
    const baseKey = `throttle:${params.environmentId}:${params.subscriberId}:${params.workflowId}:${params.stepId}`;
    const groupingPart = buildThrottleGroupingSuffix({
      throttleKey: params.throttleKey,
      throttleValue: params.throttleValue,
    });
    const finalKey = `${baseKey}${groupingPart}:set`;

    return finalKey;
  }

  private computeTtlSeconds(windowMs: number): number {
    return Math.ceil((windowMs + this.ttlBufferMs) / 1000);
  }

  private async ensureScriptsLoaded(): Promise<void> {
    const client = await this.getRedisClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      if (!this.reserveScriptSha) {
        this.reserveScriptSha = (await client.script('LOAD', this.reserveScript)) as string;
      }
      if (!this.releaseScriptSha) {
        this.releaseScriptSha = (await client.script('LOAD', this.releaseScript)) as string;
      }
    } catch (error) {
      Logger.error('Failed to load Lua scripts', error, LOG_CONTEXT);
      throw error;
    }
  }

  private async executeReserveScript(
    setKey: string,
    limit: number,
    ttlSec: number,
    jobId: string
  ): Promise<[number, number, number]> {
    const client = await this.getRedisClient();
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      await this.ensureScriptsLoaded();
      const reserveScriptSha = this.reserveScriptSha;

      if (!reserveScriptSha) {
        throw new Error('Throttle reserve script failed to load');
      }

      const result = await client.evalsha(reserveScriptSha, 1, setKey, limit.toString(), ttlSec.toString(), jobId);
      return result as [number, number, number];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('NOSCRIPT')) {
        // On a cluster, SCRIPT LOAD reaches one node; EVAL runs on (and caches the script in) the node owning setKey.
        const result = await client.eval(this.reserveScript, 1, setKey, limit.toString(), ttlSec.toString(), jobId);
        return result as [number, number, number];
      }
      throw error;
    }
  }

  async reserveThrottleSlot(params: IThrottleReservationParams): Promise<IThrottleReservationResult> {
    const setKey = this.buildSetKey({
      environmentId: params.environmentId,
      subscriberId: params.subscriberId,
      workflowId: params.workflowId,
      stepId: params.stepId,
      throttleKey: params.throttleKey,
      throttleValue: params.throttleValue,
    });

    const ttlSec = this.computeTtlSeconds(params.windowMs);

    try {
      const [granted, count, ttlSecRemaining] = await this.executeReserveScript(
        setKey,
        params.limit,
        ttlSec,
        params.jobId
      );

      const result: IThrottleReservationResult = {
        granted: granted === 1,
        count,
        ttlMs: ttlSecRemaining > 0 ? ttlSecRemaining * 1000 : 0,
        windowStartMs: params.nowMs, // For sliding windows, window starts when first request arrives
      };

      Logger.debug(
        {
          ...params,
          setKey,
          result,
        },
        'Throttle slot reservation result',
        LOG_CONTEXT
      );

      return result;
    } catch (error) {
      Logger.error(
        {
          error,
          params,
          setKey,
        },
        'Failed to reserve throttle slot',
        LOG_CONTEXT
      );

      throw error;
    }
  }
}
