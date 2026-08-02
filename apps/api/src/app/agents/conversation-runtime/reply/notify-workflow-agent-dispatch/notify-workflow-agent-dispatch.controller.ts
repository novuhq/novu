import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../../../auth/framework/external-api.decorator';
import { UserSession } from '../../../../shared/framework/user.decorator';
import { NotifyWorkflowAgentDispatchCommand } from './notify-workflow-agent-dispatch.command';
import {
  NotifyWorkflowAgentDispatchBodyDto,
  NotifyWorkflowAgentDispatchResponseBodyDto,
} from './notify-workflow-agent-dispatch.dto';
import { NotifyWorkflowAgentDispatch } from './notify-workflow-agent-dispatch.usecase';

@Controller('/agents')
@ApiTags('Agents')
@ApiExcludeController()
export class NotifyWorkflowAgentDispatchController {
  constructor(private readonly notifyWorkflowAgentDispatch: NotifyWorkflowAgentDispatch) {}

  @Post('/:agentId/workflow-dispatch')
  @HttpCode(HttpStatus.OK)
  @RequireAuthentication()
  @ExternalApiAccessible()
  @ApiOperation({
    summary: 'Dispatch a workflow chat message as an agent (internal)',
    description:
      'Worker-only endpoint. Sends via agent OutboundGateway and reserves a WorkflowAgentDispatch seed. Does not create a Conversation.',
  })
  @ApiParam({ name: 'agentId', description: 'Agent public identifier or Mongo _id' })
  @ApiResponse({ status: HttpStatus.OK, type: NotifyWorkflowAgentDispatchResponseBodyDto })
  async notify(
    @UserSession() user: UserSessionData,
    @Param('agentId') agentId: string,
    @Body() body: NotifyWorkflowAgentDispatchBodyDto
  ): Promise<NotifyWorkflowAgentDispatchResponseBodyDto> {
    return this.notifyWorkflowAgentDispatch.execute(
      NotifyWorkflowAgentDispatchCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentId,
        integrationIdentifier: body.integrationIdentifier,
        destination: body.destination,
        content: body.content,
        idempotencyKey: body.idempotencyKey,
        origin: body.origin,
        workspaceId: body.workspaceId,
      })
    );
  }
}
