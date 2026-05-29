import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  FeatureFlagsService,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  isV2ApiKey,
} from '@novu/application-generic';
import {
  ApiAuthSchemeEnum,
  ApiKeyVerifyStatusEnum,
  FeatureFlagsKeysEnum,
  UserSessionData,
} from '@novu/shared';
import { createHash } from 'crypto';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { ApiKeyV2AuthService } from '../api-key-v2-auth.service';
import { AuthService } from '../auth.service';
import { addNewRelicTraceAttributes } from './newrelic.util';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly apiKeyV2AuthService: ApiKeyV2AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    super({ header: 'Authorization', prefix: `${ApiAuthSchemeEnum.API_KEY} ` }, true);
  }

  async validate(apikey: string): Promise<UserSessionData | false> {
    const isV2Enabled = await this.isApiKeysV2Enabled();

    if (isV2Enabled && isV2ApiKey(apikey)) {
      const user = await this.validateV2ApiKey(apikey);

      if (!user) {
        return false;
      }

      addNewRelicTraceAttributes(user);

      return user;
    }

    const user = await this.validateLegacyApiKey(apikey);

    if (!user) {
      return false;
    }

    addNewRelicTraceAttributes(user);

    return user;
  }

  private async validateV2ApiKey(apiKey: string): Promise<UserSessionData | null> {
    const hash = createHash('sha256').update(apiKey).digest('hex');

    const cachedIdentity = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.API_KEY_V2_IDENTITY,
      hash,
      async () => {
        const result = await this.apiKeyV2AuthService.resolveIdentity(apiKey);

        if (result.status !== ApiKeyVerifyStatusEnum.VALID) {
          return null;
        }

        return result.identity;
      },
      {
        environmentId: 'system',
      }
    );

    if (!cachedIdentity) {
      return null;
    }

    const session = await this.apiKeyV2AuthService.buildSession(cachedIdentity);

    await this.checkKillSwitch(session);

    return session;
  }

  private async validateLegacyApiKey(apiKey: string): Promise<UserSessionData | null> {
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

  private async isApiKeysV2Enabled(): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_API_KEYS_V2_ENABLED,
      defaultValue: process.env.IS_API_KEYS_V2_ENABLED === 'true',
      organization: { _id: 'system' },
      environment: { _id: 'system' },
      component: 'api',
    });
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
