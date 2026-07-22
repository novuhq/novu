import { Inject, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  InMemoryLRUCacheService,
  InMemoryLRUCacheStore,
  PinoLogger,
} from '@novu/application-generic';
import type { Agent } from '@novu/framework';
import { Client, NovuHandler, NovuRequestHandler } from '@novu/framework/nest';
import type { Request, Response } from 'express';

/*
 * A custom framework name distinguishes the in-API NovuCopilot agent bridge from
 * self-managed Bridge endpoints in telemetry and headers.
 */
const frameworkName = 'novu-nest';

/**
 * Minimal structural view of `@novu/ee-ai`'s `NovuCopilotAgentFactory`. The concrete class is loaded
 * lazily (see {@link NovuCopilotBridgeClient.getAgent}) so the API package stays buildable when the EE
 * module is absent (OSS).
 */
type NovuCopilotAgentFactoryLike = { build(): Agent };
type EeAiCopilotModule = {
  NovuCopilotAgentFactory: abstract new (...args: never[]) => NovuCopilotAgentFactoryLike;
};

/**
 * Serves the Novu-hosted NovuCopilot agent over the `@novu/framework` Nest bridge, mirroring
 * {@link NovuBridgeClient} (the workflow bridge): it resolves the hosting environment's decrypted
 * secret per-request and runs the framework handler with `strictAuthentication`, so inbound turns
 * signed by `BridgeExecutorService` are HMAC-verified against the same environment key.
 *
 * The agent implementation lives in `@novu/ee-ai` (`NovuCopilotAgentFactory`); it is resolved from the
 * DI container lazily and built once, then reused. The agent is stateless (it resumes from
 * `ctx.history` and `ctx.metadata`), so a single instance safely handles every turn.
 *
 * Enabled only when `NOVU_HOSTED_AGENT_ENVIRONMENT_ID` (the Novu-prod environment that owns the
 * copilot `AgentEntity`) is configured and the EE module ships; otherwise the route responds 404 and
 * the agent stays inert.
 */
export class NovuCopilotBridgeClient {
  private copilotAgent: Agent | null = null;

  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private moduleRef: ModuleRef,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private inMemoryLRUCacheService: InMemoryLRUCacheService,
    private logger: PinoLogger
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const environmentId = process.env.NOVU_HOSTED_AGENT_ENVIRONMENT_ID;
    if (!environmentId || !environmentId.trim()) {
      res.status(404).json({
        error: 'NovuCopilot bridge is not configured',
        details: 'Set NOVU_HOSTED_AGENT_ENVIRONMENT_ID to enable the hosted NovuCopilot agent bridge.',
      });

      return;
    }

    let agent: Agent;
    try {
      agent = this.getAgent();
    } catch (error) {
      this.logger.error({ err: error }, 'NovuCopilot bridge could not resolve the agent factory from @novu/ee-ai');
      res.status(404).json({
        error: 'NovuCopilot bridge is unavailable',
        details: 'The enterprise AI module is not available in this deployment.',
      });

      return;
    }

    let secretKey: string;
    try {
      secretKey = await this.resolveSecretKey(environmentId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.warn(`NovuCopilot bridge environment not found (environmentId=${environmentId}): ${error.message}`);
        res.status(404).json({
          error: 'Environment not found',
          details: `No environment for NOVU_HOSTED_AGENT_ENVIRONMENT_ID=${environmentId}.`,
        });

        return;
      }

      this.logger.error({ err: error }, `Failed to resolve NovuCopilot bridge secret (environmentId=${environmentId})`);
      res.status(500).json({
        error: 'Failed to resolve environment secret key',
        details: 'Unexpected error while loading the NovuCopilot hosting environment secret.',
      });

      return;
    }

    const novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      agents: [agent],
      client: new Client({ secretKey, strictAuthentication: true, verbose: false }),
      handler: this.novuHandler.handler,
    });

    const bridgeHandler = novuRequestHandler.createHandler() as (
      request: Request,
      response: Response
    ) => void | Promise<void>;

    await bridgeHandler(req, res);
  }

  private getAgent(): Agent {
    if (this.copilotAgent) {
      return this.copilotAgent;
    }

    // biome-ignore lint/style/noCommonJs: dynamic require keeps @novu/ee-ai optional for OSS builds
    const eeAi = require('@novu/ee-ai') as EeAiCopilotModule | undefined;
    if (!eeAi?.NovuCopilotAgentFactory) {
      throw new Error('Required @novu/ee-ai export NovuCopilotAgentFactory is not available in the current build');
    }

    const factory = this.moduleRef.get<NovuCopilotAgentFactoryLike>(eeAi.NovuCopilotAgentFactory, { strict: false });
    this.copilotAgent = factory.build();

    return this.copilotAgent;
  }

  private async resolveSecretKey(environmentId: string): Promise<string> {
    const cacheKey = `bridge-secret-key:${environmentId}`;
    const storeName = InMemoryLRUCacheStore.VALIDATOR;

    const resolved = await this.inMemoryLRUCacheService.get(
      storeName,
      cacheKey,
      () => this.getDecryptedSecretKey.execute(GetDecryptedSecretKeyCommand.create({ environmentId })),
      { environmentId, cacheVariant: 'bridge-secret-key' }
    );

    if (typeof resolved !== 'string' || !resolved.trim()) {
      throw new Error(`Empty or invalid secret for NovuCopilot bridge environment ${environmentId}.`);
    }

    return resolved;
  }
}
