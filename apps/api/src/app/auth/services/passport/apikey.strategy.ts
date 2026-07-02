import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  FeatureFlagsService,
  HttpRequestHeaderKeysEnum,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
} from '@novu/application-generic';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';
import { createHash } from 'crypto';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';
import { addNewRelicTraceAttributes } from './newrelic.util';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService
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

    const user = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.API_KEY_USER,
      hashedApiKey,
      () => this.authService.getUserByApiKey(apiKey),
      {
        environmentId: 'system',
      }
    );

    if (user) {
      await this.checkKillSwitch(user);
    }

    return user;
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
