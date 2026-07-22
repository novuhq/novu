import { Controller, Post, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ManagedAgentService } from './managed-agent.service';
import { SdkAgentEventsHandler } from './sdk-agent-events.handler';

@Controller('/agents')
@ApiExcludeController()
export class ManagedRuntimeController {
  constructor(
    private managedAgentService: ManagedAgentService,
    private sdkAgentEventsHandler: SdkAgentEventsHandler
  ) {}

  @Post('/events')
  async handleAgentEvents(@Req() req: Request, @Res() res: Response) {
    if (req.headers['x-thalamus-signature']) {
      await this.managedAgentService.handleWebhook(req, res);

      return;
    }

    await this.sdkAgentEventsHandler.handle(req, res);
  }
}
