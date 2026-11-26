import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, getCachedEnvironment, InMemoryLRUCacheService } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { isSubscriberTokensRequired, SubscriberSessionAuthMethodEnum } from '@novu/shared';
import type { SubscriberSession } from '../framework/user.decorator';
import { isSubscriberTokensEnabled } from '../utils/assert-subscriber-tokens-enabled';
import { SubscriberTokenScopeEnum } from './novu-tokens.service';

/**
 * Whether an environment refuses subscriber sessions without a signed subscriber token.
 * IS_SUBSCRIBER_TOKENS_ENABLED stays the kill switch: with the flag off this is false whatever is stored.
 */
@Injectable()
export class SubscriberTokensRequirement {
  constructor(
    private featureFlagsService: FeatureFlagsService,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private environmentRepository: EnvironmentRepository
  ) {}

  async isRequired({ organizationId, environmentId }: { organizationId: string; environmentId: string }) {
    const enabled = await isSubscriberTokensEnabled({
      featureFlagsService: this.featureFlagsService,
      environmentId,
      organizationId,
    });

    if (!enabled) {
      return false;
    }

    const environment = await getCachedEnvironment(this.inMemoryLRUCacheService, this.environmentRepository, {
      environmentId,
      organizationId,
    });

    return isSubscriberTokensRequired(environment);
  }

  /**
   * Whether a browser session may create, replace or delete a shared (subscriber-less) connection:
   * its login token carried `channels:shared`, or the environment does not require tokens.
   */
  async canManageSharedConnections(session: SubscriberSession): Promise<boolean> {
    if (
      session.authMethod === SubscriberSessionAuthMethodEnum.TOKEN &&
      session.scope?.includes(SubscriberTokenScopeEnum.CHANNELS_SHARED)
    ) {
      return true;
    }

    return !(await this.isRequired({
      organizationId: session._organizationId,
      environmentId: session._environmentId,
    }));
  }
}
