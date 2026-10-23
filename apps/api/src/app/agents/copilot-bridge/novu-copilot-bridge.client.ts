import { Inject } from '@nestjs/common';
import { Client, NovuHandler, NovuRequestHandler } from '@novu/framework/nest';
import type { Request, Response } from 'express';
import { NovuAgentsBridgeService } from '../novu-agents-bridge/novu-agents-bridge.service';

/*
 * A custom framework name distinguishes the in-API agent bridge from
 * self-managed Bridge endpoints in telemetry and headers.
 */
const frameworkName = 'novu-nest';

/**
 * Deprecated alias of the `/bridge/novu` bridge: serves the same Novu-hosted agents but keeps
 * authenticating with `NOVU_SECRET_API_KEY`, so inbound turns signed by `BridgeExecutorService` for
 * agent rows that still point here are HMAC-verified against that key.
 */
// Deprecated: remove after every region's novu-copilot bridgeUrl points at /v1/bridge/novu.
export class NovuCopilotBridgeClient {
  constructor(
    @Inject(NovuHandler) private novuHandler: NovuHandler,
    private agentsBridge: NovuAgentsBridgeService
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

    const agents = this.agentsBridge.getAgents();
    if (agents.length === 0) {
      res.status(404).json({
        error: 'NovuCopilot bridge is unavailable',
        details: 'The enterprise agents module is not available in this deployment.',
      });

      return;
    }

    const novuRequestHandler = new NovuRequestHandler({
      frameworkName,
      agents,
      client: new Client({ secretKey: novuSecretApiKey, strictAuthentication: true, verbose: false }),
      handler: this.novuHandler.handler,
    });

    const bridgeHandler = novuRequestHandler.createHandler() as (
      request: Request,
      response: Response
    ) => void | Promise<void>;

    await bridgeHandler(req, res);
  }
}
