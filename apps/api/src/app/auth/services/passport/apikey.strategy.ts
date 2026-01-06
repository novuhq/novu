import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { FeatureFlagsService, HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiAuthSchemeEnum, FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';
import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';

const apiKeyUserCache = new LRUCache<string, UserSessionData>({
  max: 1000,
  ttl: 1000 * 60,
});

const apiKeyInflightRequests = new Map<string, Promise<UserSessionData | null>>();

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {
    super(
      { header: HttpRequestHeaderKeysEnum.AUTHORIZATION, prefix: `${ApiAuthSchemeEnum.API_KEY} ` },
      true,
      async (apikey: string, verified: (err: Error | null, user?: UserSessionData | false) => void) => {
        try {
          const user = await this.validateApiKey(apikey);

          if (!user) {
            return verified(null, false);
          }

          return verified(null, user);
        } catch (err) {
          return verified(err as Error, false);
        }
      }
    );
  }

  private async validateApiKey(apiKey: string): Promise<UserSessionData | null> {
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

    const isLruCacheEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_LRU_CACHE_ENABLED,
      defaultValue: false,
      environment: { _id: 'system' },
      component: 'api-key-auth',
    });

    if (isLruCacheEnabled) {
      const cached = apiKeyUserCache.get(hashedApiKey);
      if (cached) {
        return cached;
      }

      const inflightRequest = apiKeyInflightRequests.get(hashedApiKey);
      if (inflightRequest) {
        return inflightRequest;
      }
    }

    const fetchPromise = this.authService
      .getUserByApiKey(apiKey)
      .then((user) => {
        if (user && isLruCacheEnabled) {
          apiKeyUserCache.set(hashedApiKey, user);
        }

        return user;
      })
      .finally(() => {
        if (isLruCacheEnabled) {
          apiKeyInflightRequests.delete(hashedApiKey);
        }
      });

    if (isLruCacheEnabled) {
      apiKeyInflightRequests.set(hashedApiKey, fetchPromise);
    }

    return fetchPromise;
  }
}
