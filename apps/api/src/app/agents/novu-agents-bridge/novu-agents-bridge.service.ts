import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import type { Agent } from '@novu/framework';

/**
 * Minimal structural view of `@novu/ee-agents`' `NovuAgentsRegistry`. The concrete class is loaded
 * lazily (see {@link NovuAgentsBridgeService.getAgents}) so the API package stays buildable when the EE
 * package is absent (OSS).
 */
type NovuAgentsRegistryLike = { buildAll(): Agent[] };
type EeAgentsModule = {
  NovuAgentsRegistry?: abstract new (...args: never[]) => NovuAgentsRegistryLike;
};

/**
 * Resolves Novu's own agents (`@novu/ee-agents`) for the in-API bridges. Enterprise-only and fail-soft:
 * in community builds, or when the registry cannot be resolved, it returns no agents so the bridges
 * keep serving only what they served before.
 */
@Injectable()
export class NovuAgentsBridgeService {
  private agents: Agent[] | null = null;

  constructor(
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {}

  public getAgents(): Agent[] {
    if (this.agents) {
      return this.agents;
    }

    if (process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') {
      return [];
    }

    try {
      // biome-ignore lint/style/noCommonJs: dynamic require keeps @novu/ee-agents optional for OSS builds
      const eeAgents = require('@novu/ee-agents') as EeAgentsModule | undefined;
      if (!eeAgents?.NovuAgentsRegistry) {
        throw new Error('Required @novu/ee-agents export NovuAgentsRegistry is not available in the current build');
      }

      const registry = this.moduleRef.get<NovuAgentsRegistryLike>(eeAgents.NovuAgentsRegistry, { strict: false });
      this.agents = registry.buildAll();

      return this.agents;
    } catch (error) {
      this.logger.error(
        { err: error },
        'Novu agents bridge could not resolve the agents registry from @novu/ee-agents'
      );

      return [];
    }
  }
}
