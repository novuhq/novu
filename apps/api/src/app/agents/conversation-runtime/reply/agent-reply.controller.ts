import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBody, ApiExtraModels, ApiOperation, ApiParam, ApiTags, getSchemaPath } from '@nestjs/swagger';
import type { Signal, ToolResult } from '@novu/framework/internal';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiNotFoundResponse, ApiOkResponse } from '../../../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName, SdkUsageExample } from '../../../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../../../shared/framework/user.decorator';
import { AGENT_REPLY_BODY_EXAMPLES } from '../../shared/dtos/agent-reply-examples';
import {
  AgentReplyPayloadDto,
  CardReplyContentDto,
  DeleteMessagePayloadDto,
  EditPayloadDto,
  FileRefDto,
  HumanSignalDto,
  MarkdownReplyContentDto,
  MetadataClearSignalDto,
  MetadataDeleteSignalDto,
  MetadataSetSignalDto,
  ReplyContentDto,
  ToolApprovalCardReplyContentDto,
  ToolApprovalRequestPayloadDto,
  ToolResultDto,
  TriggerSignalDto,
  TypingStatusDto,
} from '../../shared/dtos/agent-reply-payload.dto';
import { SentMessageInfoDto } from '../../shared/dtos/sent-message-info.dto';
import { HandleAgentReplyCommand } from './handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from './handle-agent-reply/handle-agent-reply.usecase';

@ApiCommonResponses()
@ApiExtraModels(
  AgentReplyPayloadDto,
  ReplyContentDto,
  MarkdownReplyContentDto,
  CardReplyContentDto,
  ToolApprovalCardReplyContentDto,
  FileRefDto,
  EditPayloadDto,
  ToolApprovalRequestPayloadDto,
  ToolResultDto,
  MetadataSetSignalDto,
  MetadataDeleteSignalDto,
  MetadataClearSignalDto,
  TriggerSignalDto,
  HumanSignalDto,
  DeleteMessagePayloadDto,
  TypingStatusDto,
  SentMessageInfoDto
)
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
  @SdkUsageExample('Send an agent reply')
  @ApiParam({
    name: 'agentId',
    description: 'Agent identifier (slug) for the agent that owns the conversation.',
    example: 'support-agent',
  })
  @ApiBody({
    description:
      'Reply payload. Provide at least one action: `reply`, `edit`, `resolve`, `signals`, `toolResults`, ' +
      '`toolApprovalRequest`, `addReactions`, `deleteMessages`, `typing`, or `error`. ' +
      'See named examples for common shapes used by server-side SDKs.',
    type: AgentReplyPayloadDto,
    examples: AGENT_REPLY_BODY_EXAMPLES,
  })
  @ApiOkResponse({
    description:
      'OK. When a reply or edit is delivered, `data` contains the platform message identifiers. ' +
      'Side-effect-only requests (typing, reactions, deletes, signals without an outbound message) return `data: null`.',
    schema: {
      type: 'object',
      properties: {
        data: {
          allOf: [{ $ref: getSchemaPath(SentMessageInfoDto) }],
          nullable: true,
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'The agent or conversation was not found.',
  })
  @ApiOperation({
    summary: 'Send an agent reply',
    description: [
      'Send a message or side-effect into an existing agent conversation from your backend.',
      '',
      'Use this endpoint when you are not using `@novu/framework` (for example Python, Go, PHP, .NET, or Java SDKs),',
      'or when a server process outside the bridge needs to post into a live conversation.',
      '',
      '**Message actions**',
      '- `reply` — markdown, interactive card, or tool-approval card (optional `files`)',
      '- `edit` — update a previously delivered message in place',
      '- `deleteMessages` — remove rendered platform messages (history is kept)',
      '- `addReactions` — add emoji reactions to existing messages',
      '',
      '**Turn control**',
      '- `typing` — `{ status?: string }` to set status, or `"stop"` to clear',
      '- `resolve` — mark the conversation resolved (optionally with a final reply)',
      '- `error: true` — report a customer-runtime failure (cannot combine with other actions)',
      '',
      '**Signals & tools**',
      '- `signals` — metadata set/delete/clear, or trigger a Novu workflow',
      '- `toolResults` — persist tool outputs into conversation history',
      '- `toolApprovalRequest` — ledger a gated tool call (pair with an approval card reply)',
      '',
      'Returns `{ data: { messageId, platformThreadId } }` when a reply or edit is delivered;',
      'otherwise `{ data: null }`.',
    ].join('\n'),
  })
  async handleAgentReplyHandler(
    @UserSession() user: UserSessionData,
    @Param('agentId') agentId: string,
    @Body() body: AgentReplyPayloadDto
  ): Promise<SentMessageInfoDto | null> {
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
