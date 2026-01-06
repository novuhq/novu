import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { ApiAuthSchemeEnum, UserSessionData } from '@novu/shared';
import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { AuthService } from '../auth.service';

const apiKeyUserCache = new LRUCache<string, UserSessionData>({
  max: 1000,
  ttl: 1000 * 60,
});

const apiKeyInflightRequests = new Map<string, Promise<UserSessionData>>();

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(private readonly authService: AuthService) {
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
    const useCache = process.env.IS_LRU_CACHE_ENABLED === 'true';

    if (useCache) {
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
        if (user && useCache) {
          apiKeyUserCache.set(hashedApiKey, user);
        }

        return user;
      })
      .finally(() => {
        if (useCache) {
          apiKeyInflightRequests.delete(hashedApiKey);
        }
      });

    if (useCache) {
      apiKeyInflightRequests.set(hashedApiKey, fetchPromise);
    }

    return fetchPromise;
  }
}
