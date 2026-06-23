import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CacheService, FeatureFlagsService } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import {
  INCR_WITH_EXPIRE_SCRIPT,
  KEYLESS_DAILY_COUNTER_TTL_SECONDS,
  KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
  KEYLESS_GENERATE_CAP_PER_IP_PER_DAY,
  KEYLESS_MAX_AGENTS_PER_ENV,
} from './keyless-abuse.constants';
import { isKeylessOrganization } from './keyless-organization.helpers';

const ENV_CREATE_LIMIT_MESSAGE =
  'Daily keyless demo limit reached. Sign up for a free Novu account or try again tomorrow.';

const GENERATE_LIMIT_MESSAGE =
  'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.';

const AI_DISABLED_MESSAGE = 'Keyless agent AI is temporarily unavailable. Sign up for a free Novu account to continue.';

const MANAGED_AGENT_CAP_MESSAGE =
  'This keyless demo environment has reached its agent limit. Sign up for a free Novu account to create more agents.';

const MISSING_CLIENT_IP_MESSAGE = 'Unable to verify request origin for this demo request.';

@Injectable()
export class KeylessAbuseGuardService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository
  ) {}

  async assertEnvCreationAllowed(clientIp?: string): Promise<void> {
    await this.assertWithinDailyCap(
      'env_create',
      clientIp,
      KEYLESS_ENV_CREATE_CAP_PER_IP_PER_DAY,
      ENV_CREATE_LIMIT_MESSAGE
    );
  }

  async assertGenerateAllowed(clientIp?: string): Promise<void> {
    await this.assertWithinDailyCap('generate', clientIp, KEYLESS_GENERATE_CAP_PER_IP_PER_DAY, GENERATE_LIMIT_MESSAGE);
  }

  async isKeylessAgentAiEnabled(organizationId: string): Promise<boolean> {
    if (!isKeylessOrganization(organizationId)) {
      return true;
    }

    return this.featureFlagsService.getFlag({
      organization: { _id: organizationId },
      key: FeatureFlagsKeysEnum.IS_KEYLESS_AGENT_AI_ENABLED,
      defaultValue: true,
    });
  }

  async assertKeylessAiEnabled(organizationId: string): Promise<void> {
    const enabled = await this.isKeylessAgentAiEnabled(organizationId);

    if (!enabled) {
      throw new HttpException(AI_DISABLED_MESSAGE, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async assertManagedAgentCap(environmentId: string, organizationId: string): Promise<void> {
    if (KEYLESS_MAX_AGENTS_PER_ENV === 0 || !isKeylessOrganization(organizationId)) {
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

  private async assertWithinDailyCap(
    kind: 'env_create' | 'generate',
    clientIp: string | undefined,
    cap: number,
    limitMessage: string
  ): Promise<void> {
    if (!this.cacheService.cacheEnabled() || cap === 0) {
      return;
    }

    if (!clientIp) {
      throw new HttpException(MISSING_CLIENT_IP_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const nextCount = await this.incrementDailyCounter(this.dailyCounterKey(kind, clientIp));

    if (nextCount > cap) {
      throw new HttpException(limitMessage, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private dailyCounterKey(kind: 'env_create' | 'generate', clientIp: string): string {
    const date = new Date().toISOString().slice(0, 10);

    return `keyless:${kind}:${date}:${clientIp}`;
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
