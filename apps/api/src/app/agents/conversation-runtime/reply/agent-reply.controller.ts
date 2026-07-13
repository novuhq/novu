import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Signal, ToolResult } from '@novu/framework/internal';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { ApiCommonResponses } from '../../../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../../../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../../../shared/framework/user.decorator';
import { AgentReplyPayloadDto } from '../../shared/dtos/agent-reply-payload.dto';
import { HandleAgentReplyCommand } from './handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';

@ApiCommonResponses()
@Controller('/agents')
@ApiTags('Agents')
@SdkGroupName('Agents')
export class AgentReplyController {
  constructor(private handleAgentReply: HandleAgentReply) {}

  @Post('/:agentId/reply')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @ExternalApiAccessible()
  @SdkGroupName('Agents')
  @SdkMethodName('sendReply')
  @ApiOperation({
    summary: 'Send an agent reply',
    description:
      'Send a reply into an existing agent conversation from server-side code. Supports plain text, markdown, ' +
      'cards, edits, reactions, typing indicators, tool results, and conversation resolution signals.',
  })
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
        toolApprovalRequest: body.toolApprovalRequest,
        edit: body.edit,
        resolve: body.resolve,
        signals: body.signals as Signal[],
        toolResults: body.toolResults as ToolResult[],
        addReactions: body.addReactions,
        deleteMessages: body.deleteMessages,
        typing: body.typing,
      })
    );
  }
}
