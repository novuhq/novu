import { Inject, Injectable } from '@nestjs/common';
import { GetActionEnum, HttpQueryKeysEnum, PostActionEnum } from '@novu/framework/internal';
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
 *
 * Discovery lists the agents next to the workflows, so `novu sync` points their bridge URL here. It runs on a
 * handler that can only describe them, under the same authentication as the workflows.
 */
@Injectable()
export class NovuInternalBridgeClient extends NovuClient {
  private agentsRequestHandler: NovuRequestHandler | undefined;
  private discoveryRequestHandler: NovuRequestHandler | undefined;

  constructor(
    @Inject(NOVU_OPTIONS) private readonly serveOptions: ServeHandlerOptions,
    @Inject(NovuHandler) private readonly bridgeHandler: NovuHandler,
    private agentsBridge: NovuAgentsBridgeService
  ) {
    super(serveOptions, bridgeHandler);
  }

  public async handleRequest(req: Request, res: Response) {
    const action = req.query[HttpQueryKeysEnum.ACTION];

    if (action === PostActionEnum.AGENT_EVENT) {
      await this.getAgentsRequestHandler().createHandler()(req, res);

      return;
    }

    if (req.method === 'GET' && action === GetActionEnum.DISCOVER && this.agentsBridge.getAgents().length > 0) {
      await this.getDiscoveryRequestHandler().createHandler()(req, res);

      return;
    }

    // The agents are only registered on the signed handler, so a request routed here cannot run them.
    await super.handleRequest(req, res);
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

  private getDiscoveryRequestHandler(): NovuRequestHandler {
    if (!this.discoveryRequestHandler) {
      const { secretKey, apiUrl, logger, strictAuthentication } = this.novuRequestHandler.client;
      this.discoveryRequestHandler = new NovuRequestHandler({
        frameworkName: this.novuRequestHandler.frameworkName,
        workflows: this.serveOptions.workflows,
        agents: this.agentsBridge.getAgents(),
        client: new Client({ secretKey, apiUrl, logger, strictAuthentication, verbose: false }),
        handler: this.bridgeHandler.handler,
      });
    }

    return this.discoveryRequestHandler;
  }
}
