import { Controller, All, Req, Res, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { NovuService } from './nest.service';

@Controller()
export class NovuController {
  constructor(@Inject(NovuService) private novuService: NovuService) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response) {
    await this.novuService.handleRequest(req, res, req.method as 'GET' | 'POST' | 'OPTIONS');
  }
}
