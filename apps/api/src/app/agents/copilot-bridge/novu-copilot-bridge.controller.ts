import { Controller, Get, Inject, Options, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { NovuClient } from '@novu/framework/nest';
import type { Request, Response } from 'express';
import { NovuCopilotBridgeClient } from './novu-copilot-bridge.client';

/**
 * Deprecated alias of the `/v1/bridge/novu` bridge that serves Novu's own agents.
 *
 * Reachable at `<global prefix>/novu/bridge` (e.g. `/v1/novu/bridge`) for agent rows whose
 * `AgentEntity.bridgeUrl` still points here. Follows the workflow-bridge pattern
 * ({@link NovuBridgeController}) — a thin controller delegating to a client that runs the framework
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
