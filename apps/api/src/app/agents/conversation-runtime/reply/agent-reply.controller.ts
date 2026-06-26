import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Signal } from '@novu/framework';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { UserSession } from '../../../shared/framework/user.decorator';
import { AgentReplyPayloadDto } from '../../shared/dtos/agent-reply-payload.dto';
import { HandleAgentReplyCommand } from './handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';

@Controller('/agents')
@ApiExcludeController()
export class AgentReplyController {
  constructor(private handleAgentReply: HandleAgentReply) {}

  @Post('/:agentId/reply')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @ExternalApiAccessible()
  async handleAgentReplyHandler(
    @UserSession() user: UserSessionData,
    @Param('agentId') agentId: string,
    @Body() body: AgentReplyPayloadDto
  ) {
    return this.handleAgentReply.execute(
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
}
