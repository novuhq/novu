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
  resolveKeylessAgentEnvCreateCapPerIpPerDay,
  resolveKeylessAgentEnvCreateGlobalCapPerDay,
} from './keyless-abuse.constants';
import { KeylessAgentErrorCodeEnum } from './keyless-agent-environment';
import { isKeylessOrganization } from './keyless-organization.helpers';

const ENV_CREATE_LIMIT_MESSAGE =
  'Daily keyless demo limit reached. Sign up for a free Novu account or try again tomorrow.';

const GENERATE_LIMIT_MESSAGE =
  'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.';

const AI_DISABLED_MESSAGE = 'Keyless agent AI is temporarily unavailable. Sign up for a free Novu account to continue.';

const MANAGED_AGENT_CAP_MESSAGE =
  'This keyless demo environment has reached its agent limit. Sign up for a free Novu account to create more agents.';

const MISSING_CLIENT_IP_MESSAGE = 'Unable to verify request origin for this demo request.';

const AGENT_ENV_RATE_LIMITED_MESSAGE =
  'Daily keyless environment limit reached for this network. Sign up for a free Novu account or try again tomorrow.';

const AGENT_ENV_CAPACITY_MESSAGE =
  'Keyless environment creation is at capacity for today. Sign up for a free Novu account or try again tomorrow.';

const AGENT_ENV_UNAVAILABLE_MESSAGE =
  'Keyless environment creation is temporarily unavailable. Sign up for a free Novu account or try again later.';

type DailyCounterKind = 'env_create' | 'generate' | 'agent_env_create';

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

  /**
   * Fails closed (unlike the inbox demo caps): this path hands out a secret key, so it never runs uncapped.
   */
  async assertAgentEnvCreationAllowed(clientIp?: string): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      throw agentEnvCreationError(KeylessAgentErrorCodeEnum.UNAVAILABLE);
    }

    if (!clientIp) {
      throw agentEnvCreationError(KeylessAgentErrorCodeEnum.RATE_LIMITED);
    }

    let perIpCount: number;
    let globalCount = 0;

    try {
      perIpCount = await this.incrementDailyCounter(this.dailyCounterKey('agent_env_create', clientIp));

      if (perIpCount <= resolveKeylessAgentEnvCreateCapPerIpPerDay()) {
        globalCount = await this.incrementDailyCounter(this.dailyCounterKey('agent_env_create', 'global'));
      }
    } catch {
      throw agentEnvCreationError(KeylessAgentErrorCodeEnum.UNAVAILABLE);
    }

    if (perIpCount > resolveKeylessAgentEnvCreateCapPerIpPerDay()) {
      throw agentEnvCreationError(KeylessAgentErrorCodeEnum.RATE_LIMITED);
    }

    if (globalCount > resolveKeylessAgentEnvCreateGlobalCapPerDay()) {
      throw agentEnvCreationError(KeylessAgentErrorCodeEnum.CAPACITY_REACHED);
    }
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
    kind: DailyCounterKind,
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

  private dailyCounterKey(kind: DailyCounterKind, scope: string): string {
    const date = new Date().toISOString().slice(0, 10);

    return `keyless:${kind}:${date}:${scope}`;
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

type AgentEnvCreationErrorCode =
  | KeylessAgentErrorCodeEnum.RATE_LIMITED
  | KeylessAgentErrorCodeEnum.CAPACITY_REACHED
  | KeylessAgentErrorCodeEnum.UNAVAILABLE;

const AGENT_ENV_CREATION_ERRORS: Record<AgentEnvCreationErrorCode, { status: HttpStatus; message: string }> = {
  [KeylessAgentErrorCodeEnum.RATE_LIMITED]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    message: AGENT_ENV_RATE_LIMITED_MESSAGE,
  },
  [KeylessAgentErrorCodeEnum.CAPACITY_REACHED]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: AGENT_ENV_CAPACITY_MESSAGE,
  },
  [KeylessAgentErrorCodeEnum.UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: AGENT_ENV_UNAVAILABLE_MESSAGE,
  },
};

function agentEnvCreationError(code: AgentEnvCreationErrorCode): HttpException {
  const { status, message } = AGENT_ENV_CREATION_ERRORS[code];

  return new HttpException({ statusCode: status, message, code }, status);
}
