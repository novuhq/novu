import { Controller, Req, Res, Inject, Get, Post, Options } from '@nestjs/common';
import type { Request, Response } from 'express';
import { NovuClient } from './nest.client';

@Controller()
export class NovuController {
  constructor(@Inject(NovuClient) private novuService: NovuClient) {}

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
