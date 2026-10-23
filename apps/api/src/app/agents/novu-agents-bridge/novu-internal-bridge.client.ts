import { Inject, Injectable } from '@nestjs/common';
import { NOVU_OPTIONS, NovuClient, NovuHandler, type ServeHandlerOptions } from '@novu/framework/nest';
import type { Request, Response } from 'express';
import { NovuAgentsBridgeService } from './novu-agents-bridge.service';

/**
 * The `NovuClient` behind `/bridge/novu`: serves the code-first workflows of `@novu/notifications`
 * (registered through `NovuModule.register`) plus Novu's own agents, which depend on DI and so are
 * attached on the first request instead of at registration.
 */
@Injectable()
export class NovuInternalBridgeClient extends NovuClient {
  constructor(
    @Inject(NOVU_OPTIONS) serveOptions: ServeHandlerOptions,
    @Inject(NovuHandler) novuHandler: NovuHandler,
    private agentsBridge: NovuAgentsBridgeService
  ) {
    super(serveOptions, novuHandler);
  }

  public async handleRequest(req: Request, res: Response) {
    this.novuRequestHandler.client.addAgents(this.agentsBridge.getAgents());

    await super.handleRequest(req, res);
  }
}
