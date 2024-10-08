import { Controller, Req, Res, Inject, Get, Post, Options } from '@nestjs/common';
import { Request, Response } from 'express';
import { NovuService } from './nest.service';

@Controller()
export class NovuController {
  constructor(@Inject(NovuService) private novuService: NovuService) {}

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
