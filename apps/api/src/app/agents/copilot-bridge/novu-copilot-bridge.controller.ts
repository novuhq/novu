import { Controller, Get, Inject, Options, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NovuClient } from '@novu/framework/nest';
import type { Request, Response } from 'express';
import { NovuCopilotBridgeClient } from './novu-copilot-bridge.client';

/**
 * In-API `@novu/framework` bridge for the Novu-hosted NovuCopilot agent.
 *
 * Reachable at `<global prefix>/novu/bridge` (e.g. `/v1/novu/bridge`); the
 * copilot's `AgentEntity.bridgeUrl` must point here so `BridgeExecutorService` can dispatch inbound
 * chat turns to it. Follows the workflow-bridge pattern ({@link NovuBridgeController}) — a thin
 * controller delegating to a client that resolves the environment secret and runs the framework
 * handler.
 */
@Controller('/novu/bridge')
@ApiExcludeController()
export class NovuCopilotBridgeController {
  constructor(@Inject(NovuClient) private novuService: NovuCopilotBridgeClient) {}

  @Get()
  async handleGet(@Req() req: Request, @Res() res: Response) {
    await this.novuService.handleRequest(req, res);
  }

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response) {
    await this.novuService.handleRequest(req, res);
  }

  @Options()
  async handleOptions(@Req() req: Request, @Res() res: Response) {
    await this.novuService.handleRequest(req, res);
  }
}
