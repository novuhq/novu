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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, DirectionEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  AddAgentIntegrationRequestDto,
  AgentIntegrationResponseDto,
  AgentResponseDto,
  CreateAgentRequestDto,
  ListAgentIntegrationsQueryDto,
  ListAgentIntegrationsResponseDto,
  ListAgentsQueryDto,
  ListAgentsResponseDto,
  UpdateAgentIntegrationRequestDto,
  UpdateAgentRequestDto,
} from './dtos';
import { AddAgentIntegrationCommand } from './usecases/add-agent-integration/add-agent-integration.command';
import { AddAgentIntegration } from './usecases/add-agent-integration/add-agent-integration.usecase';
import { CreateAgentCommand } from './usecases/create-agent/create-agent.command';
import { CreateAgent } from './usecases/create-agent/create-agent.usecase';
import { DeleteAgentCommand } from './usecases/delete-agent/delete-agent.command';
import { DeleteAgent } from './usecases/delete-agent/delete-agent.usecase';
import { GetAgentCommand } from './usecases/get-agent/get-agent.command';
import { GetAgent } from './usecases/get-agent/get-agent.usecase';
import { ListAgentIntegrationsCommand } from './usecases/list-agent-integrations/list-agent-integrations.command';
import { ListAgentIntegrations } from './usecases/list-agent-integrations/list-agent-integrations.usecase';
import { ListAgentsCommand } from './usecases/list-agents/list-agents.command';
import { ListAgents } from './usecases/list-agents/list-agents.usecase';
import { RemoveAgentIntegrationCommand } from './usecases/remove-agent-integration/remove-agent-integration.command';
import { RemoveAgentIntegration } from './usecases/remove-agent-integration/remove-agent-integration.usecase';
import { UpdateAgentIntegrationCommand } from './usecases/update-agent-integration/update-agent-integration.command';
import { UpdateAgentIntegration } from './usecases/update-agent-integration/update-agent-integration.usecase';
import { UpdateAgentCommand } from './usecases/update-agent/update-agent.command';
import { UpdateAgent } from './usecases/update-agent/update-agent.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents')
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Agents')
@RequireAuthentication()
export class AgentsController {
  constructor(
    private readonly createAgentUsecase: CreateAgent,
    private readonly listAgentsUsecase: ListAgents,
    private readonly getAgentUsecase: GetAgent,
    private readonly updateAgentUsecase: UpdateAgent,
    private readonly deleteAgentUsecase: DeleteAgent,
    private readonly addAgentIntegrationUsecase: AddAgentIntegration,
    private readonly listAgentIntegrationsUsecase: ListAgentIntegrations,
    private readonly updateAgentIntegrationUsecase: UpdateAgentIntegration,
    private readonly removeAgentIntegrationUsecase: RemoveAgentIntegration
  ) {}

  @Post('/')
  @ApiResponse(AgentResponseDto, 201)
  @ApiOperation({
    summary: 'Create agent',
    description: 'Creates an agent scoped to the current environment. The identifier must be unique per environment.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createAgent(
    @UserSession() user: UserSessionData,
    @Body() body: CreateAgentRequestDto
  ): Promise<AgentResponseDto> {
    return this.createAgentUsecase.execute(
      CreateAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        name: body.name,
        identifier: body.identifier,
        description: body.description,
      })
    );
  }

  @Get('/')
  @ApiResponse(ListAgentsResponseDto)
  @ApiOperation({
    summary: 'List agents',
    description:
      'Returns a cursor-paginated list of agents for the current environment. Use **after**, **before**, **limit**, **orderBy**, and **orderDirection** query parameters.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgents(
    @UserSession() user: UserSessionData,
    @Query() query: ListAgentsQueryDto
  ): Promise<ListAgentsResponseDto> {
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

  @Post('/:identifier/integrations')
  @ApiResponse(AgentIntegrationResponseDto, 201)
  @ApiOperation({
    summary: 'Link integration to agent',
    description: 'Creates a link between an agent (by identifier) and an integration (by integration **identifier**, not the internal _id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent or integration was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  addAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: AddAgentIntegrationRequestDto
  ): Promise<AgentIntegrationResponseDto> {
    return this.addAgentIntegrationUsecase.execute(
      AddAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        integrationIdentifier: body.integrationIdentifier,
      })
    );
  }

  @Get('/:identifier/integrations')
  @ApiResponse(ListAgentIntegrationsResponseDto)
  @ApiOperation({
    summary: 'List agent integrations',
    description:
      'Lists integration links for an agent identified by its external identifier. Supports cursor pagination via **after**, **before**, **limit**, **orderBy**, and **orderDirection**.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listAgentIntegrations(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: ListAgentIntegrationsQueryDto
  ): Promise<ListAgentIntegrationsResponseDto> {
    return this.listAgentIntegrationsUsecase.execute(
      ListAgentIntegrationsCommand.create({
        user,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
        integrationIdentifier: query.integrationIdentifier,
      })
    );
  }

  @Patch('/:identifier/integrations/:agentIntegrationId')
  @ApiResponse(AgentIntegrationResponseDto)
  @ApiOperation({
    summary: 'Update agent-integration link',
    description: 'Updates which integration a link points to (by integration **identifier**, not the internal _id).',
  })
  @ApiNotFoundResponse({
    description: 'The agent, integration, or link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('agentIntegrationId') agentIntegrationId: string,
    @Body() body: UpdateAgentIntegrationRequestDto
  ): Promise<AgentIntegrationResponseDto> {
    return this.updateAgentIntegrationUsecase.execute(
      UpdateAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        agentIntegrationId,
        integrationIdentifier: body.integrationIdentifier,
      })
    );
  }

  @Delete('/:identifier/integrations/:agentIntegrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove agent-integration link',
    description: 'Deletes a specific agent-integration link by its document id.',
  })
  @ApiNoContentResponse({
    description: 'The link was removed.',
  })
  @ApiNotFoundResponse({
    description: 'The agent or agent-integration link was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  removeAgentIntegration(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Param('agentIntegrationId') agentIntegrationId: string
  ): Promise<void> {
    return this.removeAgentIntegrationUsecase.execute(
      RemoveAgentIntegrationCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        agentIdentifier: identifier,
        agentIntegrationId,
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
      })
    );
  }

  @Delete('/:identifier')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete agent',
    description: 'Deletes an agent by identifier and removes all agent-integration links.',
  })
  @ApiNoContentResponse({
    description: 'The agent was deleted.',
  })
  @ApiNotFoundResponse({
    description: 'The agent was not found.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  deleteAgent(@UserSession() user: UserSessionData, @Param('identifier') identifier: string): Promise<void> {
    return this.deleteAgentUsecase.execute(
      DeleteAgentCommand.create({
        userId: user._id,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
