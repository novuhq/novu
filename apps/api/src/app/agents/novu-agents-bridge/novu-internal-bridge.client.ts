import { Inject, Injectable } from '@nestjs/common';
import { HttpQueryKeysEnum, PostActionEnum } from '@novu/framework/internal';
import {
  Client,
  NOVU_OPTIONS,
  NovuClient,
  NovuHandler,
  NovuRequestHandler,
  type ServeHandlerOptions,
} from '@novu/framework/nest';
import type { Request, Response } from 'express';
import { NovuAgentsBridgeService } from './novu-agents-bridge.service';

/**
 * The `NovuClient` behind `/bridge/novu`: serves the code-first workflows of `@novu/notifications`
 * (registered through `NovuModule.register`) plus Novu's own agents, which depend on DI and so are
 * attached on the first agent request instead of at registration.
 *
 * The agents run on a handler of their own that always verifies the request signature, whatever
 * `strictAuthentication` the workflows get: a turn's body names the tenant the agent acts for and the
 * `eventsUrl` its replies are posted to with this bridge's secret key.
 */
@Injectable()
export class NovuInternalBridgeClient extends NovuClient {
  private agentsRequestHandler: NovuRequestHandler | undefined;

  constructor(
    @Inject(NOVU_OPTIONS) serveOptions: ServeHandlerOptions,
    @Inject(NovuHandler) private readonly bridgeHandler: NovuHandler,
    private agentsBridge: NovuAgentsBridgeService
  ) {
    super(serveOptions, bridgeHandler);
  }

  public async handleRequest(req: Request, res: Response) {
    // The agents are only registered on the signed handler, so a request routed to the other one cannot reach them.
    if (req.query[HttpQueryKeysEnum.ACTION] !== PostActionEnum.AGENT_EVENT) {
      await super.handleRequest(req, res);

      return;
    }

    await this.getAgentsRequestHandler().createHandler()(req, res);
  }

  private getAgentsRequestHandler(): NovuRequestHandler {
    if (!this.agentsRequestHandler) {
      const { secretKey, apiUrl, logger } = this.novuRequestHandler.client;
      this.agentsRequestHandler = new NovuRequestHandler({
        frameworkName: this.novuRequestHandler.frameworkName,
        agents: this.agentsBridge.getAgents(),
        client: new Client({ secretKey, apiUrl, logger, strictAuthentication: true, verbose: false }),
        handler: this.bridgeHandler.handler,
      });
    }

    return this.agentsRequestHandler;
  }
}
