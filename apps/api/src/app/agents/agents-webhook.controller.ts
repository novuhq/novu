import {
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AgentConversationEnabledGuard } from './guards/agent-conversation-enabled.guard';
import { ChatSdkService } from './services/chat-sdk.service';

@Controller('/agents')
@UseGuards(AgentConversationEnabledGuard)
@ApiExcludeController()
export class AgentsWebhookController {
  constructor(private chatSdkService: ChatSdkService) {}

  @Post('/:agentId/webhook/:integrationIdentifier')
  @HttpCode(HttpStatus.OK)
  async handleInboundWebhook(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await this.chatSdkService.handleWebhook(agentId, integrationIdentifier, req, res);
    } catch (err) {
      if (err instanceof HttpException) {
        res.status(err.getStatus()).json(err.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
      }
    }
  }
}
