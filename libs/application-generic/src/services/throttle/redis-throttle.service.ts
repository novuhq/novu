import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { WorkflowInMemoryProviderService } from '../in-memory-provider';
import { IThrottleReservationParams, IThrottleReservationResult } from './throttle.types';

const LOG_CONTEXT = 'RedisThrottleService';

@Injectable()
export class RedisThrottleService {
  private reserveScriptSha: string | null = null;
  private releaseScriptSha: string | null = null;
  private readonly ttlBufferMs: number;

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

  private get redisClient(): Redis | undefined {
    return this.workflowInMemoryProviderService.getClient() as Redis;
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
    const throttleKeyPart =
      params.throttleKey && params.throttleValue !== undefined ? `:${params.throttleKey}:${params.throttleValue}` : '';
    const finalKey = `${baseKey}${throttleKeyPart}:set`;

    return finalKey;
  }

  private computeTtlSeconds(windowMs: number): number {
    return Math.ceil((windowMs + this.ttlBufferMs) / 1000);
  }

  private async ensureScriptsLoaded(): Promise<void> {
    const client = this.redisClient;
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
    const client = this.redisClient;
    if (!client) {
      throw new Error('Redis client not available');
    }

    try {
      await this.ensureScriptsLoaded();
      const result = await client.evalsha(
        this.reserveScriptSha!,
        1,
        setKey,
        limit.toString(),
        ttlSec.toString(),
        jobId
      );
      return result as [number, number, number];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('NOSCRIPT')) {
        Logger.warn('Script not found, reloading and retrying', LOG_CONTEXT);
        this.reserveScriptSha = null;
        await this.ensureScriptsLoaded();
        const result = await client.evalsha(
          this.reserveScriptSha!,
          1,
          setKey,
          limit.toString(),
          ttlSec.toString(),
          jobId
        );
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
