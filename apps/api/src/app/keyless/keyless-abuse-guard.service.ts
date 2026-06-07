import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { isKeylessEnvironmentExpired, keylessEnvironmentRetentionTtlSeconds } from '../inbox/utils/keyless-expiry';
import {
  INCR_WITH_EXPIRE_SCRIPT,
  KEYLESS_DAILY_COUNTER_TTL_SECONDS,
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY,
  KEYLESS_MAX_AGENTS_PER_ENV,
} from './keyless-abuse.constants';

export type KeylessEnvCreationDecision =
  | { action: 'create' }
  | { action: 'reuse'; applicationIdentifier: string };

const ENV_CREATE_LIMIT_MESSAGE =
  'Daily keyless demo limit reached. Sign up for a free Novu account or try again tomorrow.';

const GENERATE_LIMIT_MESSAGE =
  'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.';

const AI_DISABLED_MESSAGE = 'Keyless agent AI is temporarily unavailable. Sign up for a free Novu account to continue.';

const MANAGED_AGENT_CAP_MESSAGE =
  'This keyless demo environment has reached its agent limit. Sign up for a free Novu account to create more agents.';

@Injectable()
export class KeylessAbuseGuardService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository
  ) {}

  isKeylessOrganization(organizationId: string): boolean {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;

    return Boolean(keylessOrganizationId && organizationId === keylessOrganizationId);
  }

  async resolveEnvCreation(clientIp: string | undefined): Promise<KeylessEnvCreationDecision> {
    if (!clientIp || !this.cacheService.cacheEnabled()) {
      return { action: 'create' };
    }

    const counterKey = this.dailyCounterKey('env_create', clientIp);
    const currentCount = await this.readDailyCounter(counterKey);

    if (currentCount < KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY) {
      return { action: 'create' };
    }

    const lastIdentifier = await this.cacheService.get(this.lastEnvKey(clientIp));
    if (lastIdentifier && !isKeylessEnvironmentExpired(lastIdentifier)) {
      return { action: 'reuse', applicationIdentifier: lastIdentifier };
    }

    throw new HttpException(ENV_CREATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
  }

  async recordEnvCreated(clientIp: string | undefined, applicationIdentifier: string): Promise<void> {
    if (!clientIp || !this.cacheService.cacheEnabled()) {
      return;
    }

    await this.incrementDailyCounter(this.dailyCounterKey('env_create', clientIp));
    await this.cacheService.set(this.lastEnvKey(clientIp), applicationIdentifier, {
      ttl: keylessEnvironmentRetentionTtlSeconds(),
    });
  }

  async assertGenerateAllowed(clientIp: string | undefined): Promise<void> {
    if (!clientIp || !this.cacheService.cacheEnabled()) {
      return;
    }

    const counterKey = this.dailyCounterKey('generate', clientIp);
    const nextCount = await this.incrementDailyCounter(counterKey);

    if (nextCount > KEYLESS_GENERATE_CAP_PER_IP_PER_DAY) {
      throw new HttpException(GENERATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async assertKeylessAiEnabled(organizationId: string): Promise<void> {
    const enabled = await this.isKeylessAgentAiEnabled(organizationId);

    if (!enabled) {
      throw new HttpException(AI_DISABLED_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async isKeylessAgentAiEnabled(organizationId: string): Promise<boolean> {
    if (!this.isKeylessOrganization(organizationId)) {
      return true;
    }

    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_AI_ENABLED,
      defaultValue: true,
      organization: { _id: organizationId },
    });
  }

  async assertManagedAgentCap(environmentId: string, organizationId: string): Promise<void> {
    if (!this.isKeylessOrganization(organizationId)) {
      return;
    }

    const count = await this.agentRepository.count({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });

    if (count >= KEYLESS_MAX_AGENTS_PER_ENV) {
      throw new HttpException(MANAGED_AGENT_CAP_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  isKeylessAuthScheme(scheme: string | undefined): boolean {
    return scheme === ApiAuthSchemeEnum.KEYLESS;
  }

  private dailyCounterKey(kind: 'env_create' | 'generate', clientIp: string): string {
    return `keyless_abuse:${kind}:{${clientIp}}:${this.utcDateKey()}`;
  }

  private lastEnvKey(clientIp: string): string {
    return `keyless_abuse:last_env:{${clientIp}}`;
  }

  private utcDateKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async readDailyCounter(key: string): Promise<number> {
    const raw = await this.cacheService.get(key);

    if (raw == null || raw === '') {
      return 0;
    }

    const parsed = Number(raw);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private async incrementDailyCounter(key: string): Promise<number> {
    const result = await this.cacheService.eval<number>(
      INCR_WITH_EXPIRE_SCRIPT,
      [key],
      [KEYLESS_DAILY_COUNTER_TTL_SECONDS]
    );

    return result ?? 0;
  }
}
