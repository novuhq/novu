import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AgentReplyPayloadDto } from './dtos/agent-reply-payload.dto';
import { AgentConversationEnabledGuard } from './guards/agent-conversation-enabled.guard';
import { ChatSdkService } from './services/chat-sdk.service';
import { HandleAgentReplyCommand, Signal } from './usecases/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from './usecases/handle-agent-reply/handle-agent-reply.usecase';

@Controller('/agents')
@UseGuards(AgentConversationEnabledGuard)
@ApiExcludeController()
export class AgentsWebhookController {
  constructor(
    private chatSdkService: ChatSdkService,
    private handleAgentReplyUsecase: HandleAgentReply
  ) {}

  @Post('/:agentId/reply')
  @HttpCode(HttpStatus.OK)
  async handleAgentReply(@Body() body: AgentReplyPayloadDto) {
    return this.handleAgentReplyUsecase.execute(
      HandleAgentReplyCommand.create({
        replyToken: body.replyToken,
        reply: body.reply,
        update: body.update,
        resolve: body.resolve,
        signals: body.signals as Signal[],
      })
    );
  }

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
