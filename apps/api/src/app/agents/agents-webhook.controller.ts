import {
  Body,
  Controller,
  Get,
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
import { UserSessionData } from '@novu/shared';
import { Request, Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { AgentReplyPayloadDto } from './dtos/agent-reply-payload.dto';
import { AgentInactiveException } from './exceptions/agent-inactive.exception';
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
  @RequireAuthentication()
  @ExternalApiAccessible()
  async handleAgentReply(
    @UserSession() user: UserSessionData,
    @Param('agentId') agentId: string,
    @Body() body: AgentReplyPayloadDto
  ) {
    return this.handleAgentReplyUsecase.execute(
      HandleAgentReplyCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        conversationId: body.conversationId,
        agentIdentifier: agentId,
        integrationIdentifier: body.integrationIdentifier,
        reply: body.reply,
        edit: body.edit,
        resolve: body.resolve,
        signals: body.signals as Signal[],
        addReactions: body.addReactions,
      })
    );
  }

  @Get('/:agentId/webhook/:integrationIdentifier')
  async handleWebhookVerification(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.routeWebhook(agentId, integrationIdentifier, req, res);
  }

  @Post('/:agentId/webhook/:integrationIdentifier')
  @HttpCode(HttpStatus.OK)
  async handleInboundWebhook(
    @Param('agentId') agentId: string,
    @Param('integrationIdentifier') integrationIdentifier: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.routeWebhook(agentId, integrationIdentifier, req, res);
  }

  private async routeWebhook(agentId: string, integrationIdentifier: string, req: Request, res: Response) {
    try {
      await this.chatSdkService.handleWebhook(agentId, integrationIdentifier, req, res);
    } catch (err) {
      if (err instanceof AgentInactiveException) {
        // Return 200 to avoid retries by the delivery provider
        res.status(HttpStatus.OK).json({});

        return;
      }

      if (err instanceof HttpException) {
        res.status(err.getStatus()).json(err.getResponse());
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
      }
    }
  }
}
