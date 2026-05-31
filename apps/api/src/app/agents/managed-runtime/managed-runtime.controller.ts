import { Controller, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ManagedAgentService } from './managed-agent.service';

@Controller('/agents')
@ApiExcludeController()
export class ManagedRuntimeController {
  constructor(private managedAgentService: ManagedAgentService) {}

  @Post('/events')
  async handleThalamusEvent(@Req() req: Request, @Res() res: Response) {
    await this.managedAgentService.handleWebhook(req, res);
  }
}
