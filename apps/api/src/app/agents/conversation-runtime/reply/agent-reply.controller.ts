import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import type { SentMessageInfo, Signal, ToolResult } from '@novu/framework/internal';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiResponse } from '../../../shared/framework/response.decorator';
import { SdkApiParam, SdkGroupName, SdkMethodName, SdkUsageExample } from '../../../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../../../shared/framework/user.decorator';
import { AGENT_REPLY_BODY_EXAMPLES } from '../../shared/dtos/agent-reply-body.examples';
import { AgentReplyPayloadDto } from '../../shared/dtos/agent-reply-payload.dto';
import { SentMessageInfoDto } from '../../shared/dtos/sent-message-info.dto';
import { HandleAgentReplyCommand } from './handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';

@ApiCommonResponses()
@ApiExtraModels(SentMessageInfoDto, AgentReplyPayloadDto)
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
  @SdkUsageExample('Send Agent Reply')
  @SdkApiParam({
    name: 'agentId',
    description: 'Unique identifier of the agent that owns the conversation.',
    example: 'support-bot',
  })
  @ApiBody({
    type: AgentReplyPayloadDto,
    description:
      'Agent reply payload. Provide at least one action field (`reply`, `edit`, `resolve`, `signals`, ' +
      '`toolResults`, `toolApprovalRequest`, `addReactions`, `deleteMessages`, `typing`, or `error`). ' +
      'Only `reply` or `edit` may carry message content; `error` must be sent alone.',
    examples: AGENT_REPLY_BODY_EXAMPLES,
  })
  @ApiResponse(SentMessageInfoDto, 200, false, true, {
    description:
      'When a message is posted or edited, returns platform message identifiers. `data` is `null` when the ' +
      'request only performed side effects (signals, typing, reactions, deletes, tool results) without posting ' +
      'a new message.',
    schema: {
      properties: {
        data: {
          nullable: true,
          oneOf: [{ $ref: getSchemaPath(SentMessageInfoDto) }, { type: 'null' }],
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Send an agent reply',
    description:
      'Send a reply into an existing agent conversation from server-side code. Supports plain text, markdown, ' +
      'cards, file attachments, edits, reactions, typing indicators, tool results, tool-approval cards, workflow ' +
      'triggers, metadata updates, conversation resolution, and bridge error reporting.',
  })
  async handleAgentReplyHandler(
    @UserSession() user: UserSessionData,
    @Param('agentId') agentId: string,
    @Body() body: AgentReplyPayloadDto
  ): Promise<SentMessageInfo | null> {
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
        error: body.error,
      })
    );
  }
}
