import { init, LDClient, LDMultiKindContext } from '@launchdarkly/node-server-sdk';
import { Injectable } from '@nestjs/common';
import type { FeatureFlagContext, FeatureFlagContextBase, IFeatureFlagsService } from './types';

@Injectable()
export class LaunchDarklyFeatureFlagsService implements IFeatureFlagsService {
  private client: LDClient;
  public isEnabled: boolean;

  public async initialize(): Promise<void> {
    const launchDarklySdkKey = process.env.LAUNCH_DARKLY_SDK_KEY;
    if (!launchDarklySdkKey) {
      throw new Error('Missing Launch Darkly SDK key');
    }
    this.client = init(launchDarklySdkKey);
    await this.client.waitForInitialization({ timeout: 10000 });
    this.isEnabled = true;
  }

  public async gracefullyShutdown(): Promise<void> {
    if (this.client) {
      await this.client.flush();
      this.client.close();
    }
  }

  async getFlag<T_Result>({
    key,
    defaultValue,
    environment,
    organization,
    user,
  }: FeatureFlagContext<T_Result>): Promise<T_Result> {
    const context = this.buildLDContext({ user, organization, environment });
    const newVar = await this.client.variation(key, context, defaultValue);

    return newVar;
  }

  private buildLDContext({ user, organization, environment }: FeatureFlagContextBase): LDMultiKindContext {
    const mappedContext: LDMultiKindContext = {
      kind: 'multi',
    };

    if (environment?._id) {
      mappedContext.environment = {
        key: environment._id,
        createdAt: environment.createdAt,
        updatedAt: environment.updatedAt,
      };
    }

    if (organization?._id) {
      mappedContext.organization = {
        key: organization._id,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        externalId: organization.externalId,
        apiServiceLevel: organization.apiServiceLevel,
      };
    }

    if (user?._id) {
      mappedContext.user = {
        key: user._id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        externalId: user.externalId,
      };
    }

    /*
     * LaunchDarkly requires at least one context kind in multi-kind contexts
     * Add a fallback global context to prevent "A multi-kind context must contain at least one kind" error
     */
    const hasAnyContext = mappedContext.environment || mappedContext.organization || mappedContext.user;
    if (!hasAnyContext) {
      mappedContext.global = {
        key: 'global-context',
        anonymous: true,
      };
    }

    return mappedContext;
  }
}
