import { Controller, Req, Res, Inject, Get, Post, Options } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { NovuClient } from '@novu/framework/nest';
import { NovuBridgeClient } from './novu-bridge-client';

@Controller('/environments/:environmentId/bridge')
@ApiExcludeController()
export class NovuBridgeController {
  constructor(@Inject(NovuClient) private novuService: NovuBridgeClient) {}

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
