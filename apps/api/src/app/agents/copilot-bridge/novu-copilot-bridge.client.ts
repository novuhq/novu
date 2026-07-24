import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
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
 * Serves the Novu-hosted Novu Copilot agent over the `@novu/framework` Nest bridge, mirroring
 * {@link NovuBridgeClient} (the workflow bridge): it resolves the Novu Copilot bridge secret
 * and runs the framework handler with `strictAuthentication`, so inbound turns
 * signed by `BridgeExecutorService` are HMAC-verified against the Novu Copilot bridge secret.
 */
export class NovuCopilotBridgeClient {
  private copilotAgent: Agent | null = null;

  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {}

  public async handleRequest(req: Request, res: Response) {
    const novuSecretApiKey = process.env.NOVU_SECRET_API_KEY;
    if (!novuSecretApiKey?.trim()) {
      res.status(404).json({
        error: 'Novu Copilot bridge is not configured',
        details: 'NOVU_SECRET_API_KEY must be configured for the Novu Copilot bridge.',
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

    const novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      agents: [agent],
      client: new Client({ secretKey: novuSecretApiKey, strictAuthentication: true, verbose: false }),
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
}
