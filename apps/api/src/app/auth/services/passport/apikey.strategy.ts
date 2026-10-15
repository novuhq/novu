import { createHash } from 'node:crypto';
import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  CacheService,
  FeatureFlagsService,
  HttpRequestHeaderKeysEnum,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
} from '@novu/application-generic';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { readKeylessAgentClaimedTombstone } from '../../../keyless/keyless-agent-cache';
import {
  isKeylessAgentEnvironmentsSupported,
  KeylessAgentErrorCodeEnum,
} from '../../../keyless/keyless-agent-environment';
import { KEYLESS_ENVIRONMENT_CLAIMED_MESSAGE } from '../../../keyless/keyless-scope.interceptor';
import { AuthService } from '../auth.service';
import { addNewRelicTraceAttributes } from './newrelic.util';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService,
    private readonly cacheService: CacheService
  ) {
    super({ header: HttpRequestHeaderKeysEnum.AUTHORIZATION, prefix: `${ApiAuthSchemeEnum.API_KEY} ` }, false);
  }

  async validate(apikey: string): Promise<UserSessionData | false> {
    const user = await this.validateApiKey(apikey);

    if (!user) {
      return false;
    }

    addNewRelicTraceAttributes(user);

    return user;
  }

  private async validateApiKey(apiKey: string): Promise<UserSessionData | null> {
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

    let user: UserSessionData | null;

    try {
      user = await this.inMemoryLRUCacheService.get(
        InMemoryLRUCacheStore.API_KEY_USER,
        hashedApiKey,
        () => this.authService.getUserByApiKey(apiKey),
        {
          environmentId: 'system',
        }
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.assertKeyWasNotClaimed(hashedApiKey);
      }

      throw error;
    }

    if (!user) {
      await this.assertKeyWasNotClaimed(hashedApiKey);

      return null;
    }

    await this.checkKillSwitch(user);

    return user;
  }

  /** Keys of claimed keyless environments get a coded 401 instead of the generic "API Key not found". */
  private async assertKeyWasNotClaimed(hashedApiKey: string): Promise<void> {
    if (!isKeylessAgentEnvironmentsSupported()) {
      return;
    }

    const tombstone = await readKeylessAgentClaimedTombstone(this.cacheService, hashedApiKey);

    if (tombstone) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: KeylessAgentErrorCodeEnum.ENVIRONMENT_CLAIMED,
        message: KEYLESS_ENVIRONMENT_CLAIMED_MESSAGE,
      });
    }
  }

  private async checkKillSwitch(user: UserSessionData): Promise<void> {
    const isKillSwitchEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
      environment: { _id: user.environmentId },
      component: 'api',
    });

    if (isKillSwitchEnabled) {
      throw new ServiceUnavailableException('Service temporarily unavailable for this organization');
    }
  }
}
