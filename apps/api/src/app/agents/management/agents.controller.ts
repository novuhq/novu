import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, DirectionEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../../shared/framework/response.decorator';
import { KeylessAccessible } from '../../shared/framework/swagger/keyless.security';
import { UserSession } from '../../shared/framework/user.decorator';
import { AgentRuntimeExceptionFilter } from '../shared/agent-runtime-exception.filter';
import {
  AgentResponseDto,
  ConversationUsageResponseDto,
  CreateAgentRequestDto,
  ListAgentsQueryDto,
  ListAgentsResponseDto,
  UpdateAgentBridgeRequestDto,
  UpdateAgentRequestDto,
} from '../shared/dtos';
import { ConversationActivationService } from '../conversation-runtime/conversation/conversation-activation.service';
import { type AgentEmojiEntry, ListAgentEmoji } from '../shared/emoji/list-agent-emoji/list-agent-emoji.usecase';
import { CreateAgentCommand } from './usecases/create-agent/create-agent.command';
import { CreateAgent } from './usecases/create-agent/create-agent.usecase';
import { DeleteAgentCommand } from './usecases/delete-agent/delete-agent.command';
import { DeleteAgent } from './usecases/delete-agent/delete-agent.usecase';
import { GetAgentCommand } from './usecases/get-agent/get-agent.command';
import { GetAgent } from './usecases/get-agent/get-agent.usecase';
import { ListAgentsCommand } from './usecases/list-agents/list-agents.command';
import { ListAgents } from './usecases/list-agents/list-agents.usecase';
import { UpdateAgentCommand } from './usecases/update-agent/update-agent.command';
import { UpdateAgent } from './usecases/update-agent/update-agent.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class AgentsController {
  constructor(
    private readonly createAgentUsecase: CreateAgent,
    private readonly listAgentsUsecase: ListAgents,
    private readonly getAgentUsecase: GetAgent,
    private readonly updateAgentUsecase: UpdateAgent,
    private readonly deleteAgentUsecase: DeleteAgent,
    private readonly listAgentEmojiUsecase: ListAgentEmoji,
    private readonly conversationActivation: ConversationActivationService
  ) {}

  @Get('/usage/conversations')
  @ApiResponse(ConversationUsageResponseDto)
  @ApiOperation({
    summary: 'Get active-conversations usage',
    description:
      'Returns the number of active conversations counted for the organization in the current billing period, ' +
      'the amount included in the plan (`null` when unlimited), and the period bounds.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  async getConversationUsage(@UserSession() user: UserSessionData): Promise<ConversationUsageResponseDto> {
    const usage = await this.conversationActivation.getUsage(user.organizationId);

    return {
      current: usage.current,
      included: usage.included,
      periodStart: usage.periodStart.toISOString(),
      periodEnd: usage.periodEnd.toISOString(),
    };
  }

  @Get('/emoji')
  @ApiOperation({
    summary: 'List available emoji',
    description:
      'Returns the set of well-known cross-platform emoji names supported for agent reactions. ' +
      'Each entry includes the normalized name and a unicode representation for display.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgentEmoji(): Promise<AgentEmojiEntry[]> {
    return this.listAgentEmojiUsecase.execute();
  }

  @Post('/')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @ApiResponse(AgentResponseDto, 201)
  @ApiOperation({
    summary: 'Create agent',
    description: 'Creates an agent scoped to the current environment. The identifier must be unique per environment.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseFilters(AgentRuntimeExceptionFilter)
  createAgent(@UserSession() user: UserSessionData, @Body() body: CreateAgentRequestDto): Promise<AgentResponseDto> {
    return this.createAgentUsecase.execute(
      CreateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        identifier: body.identifier,
        description: body.description,
        active: body.active,
        runtime: body.runtime,
        managedRuntime: body.managedRuntime,
      })
    );
  }

  @Get('/')
  @ExternalApiAccessible()
  @KeylessAccessible()
  @ApiResponse(ListAgentsResponseDto)
  @ApiOperation({
    summary: 'List agents',
    description:
      'Returns a cursor-paginated list of agents for the current environment. Use **after**, **before**, **limit**, **orderBy**, and **orderDirection** query parameters.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgents(@UserSession() user: UserSessionData, @Query() query: ListAgentsQueryDto): Promise<ListAgentsResponseDto> {
    return this.listAgentsUsecase.execute(
      ListAgentsCommand.create({
        user,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
        identifier: query.identifier,
      })
    );
  }

  @Put('/:identifier/bridge')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Update agent bridge configuration',
    description:
      'Updates the bridge URL configuration for an agent. Used by the CLI to register dev tunnel URLs. Refuses to activate dev bridges on production environments.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentBridge(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentBridgeRequestDto
  ): Promise<AgentResponseDto> {
    return this.updateAgentUsecase.execute(
      UpdateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        bridgeUrl: body.bridgeUrl,
        devBridgeUrl: body.devBridgeUrl,
        devBridgeActive: body.devBridgeActive,
      })
    );
  }

  @Get('/:identifier')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Get agent',
    description: 'Retrieves an agent by its external identifier (not the internal MongoDB id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getAgent(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<AgentResponseDto> {
    return this.getAgentUsecase.execute(
      GetAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }

  @Patch('/:identifier')
  @ApiResponse(AgentResponseDto)
  @ApiOperation({
    summary: 'Update agent',
    description: 'Updates an agent by its external identifier.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgent(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateAgentRequestDto
  ): Promise<AgentResponseDto> {
    return this.updateAgentUsecase.execute(
      UpdateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        name: body.name,
        description: body.description,
        active: body.active,
        behavior: body.behavior,
        bridgeUrl: body.bridgeUrl,
        devBridgeUrl: body.devBridgeUrl,
        devBridgeActive: body.devBridgeActive,
      })
    );
  }

  @Delete('/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete agent',
    description:
      'Deletes an agent by identifier and removes all agent-integration links. ' +
      'For managed-runtime agents, pass `deleteFromProvider=true` to also archive the agent on the provider side (e.g. Anthropic). ' +
      'By default only the Novu record is deleted and the provider agent is left intact.',
  })
  @ApiNoContentResponse({
    description: 'The agent was deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  deleteAgent(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query('deleteFromProvider') deleteFromProvider?: string
  ): Promise<void> {
    return this.deleteAgentUsecase.execute(
      DeleteAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        deleteFromProvider: deleteFromProvider === 'true',
      })
    );
  }
}
