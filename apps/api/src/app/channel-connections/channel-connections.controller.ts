import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible, FeatureFlagsService, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, FeatureFlagsKeysEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateChannelConnectionRequestDto } from './dtos/create-channel-connection-request.dto';
import { mapChannelConnectionEntityToDto } from './dtos/dto.mapper';
import { GetChannelConnectionResponseDto } from './dtos/get-channel-connection-response.dto';
import { ListChannelConnectionsQueryDto } from './dtos/list-channel-connections-query.dto';
import { ListChannelConnectionsResponseDto } from './dtos/list-channel-connections-response.dto';
import { UpdateChannelConnectionRequestDto } from './dtos/update-channel-connection-request.dto';
import { CreateChannelConnectionCommand } from './usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from './usecases/create-channel-connection/create-channel-connection.usecase';
import { DeleteChannelConnectionCommand } from './usecases/delete-channel-connection/delete-channel-connection.command';
import { DeleteChannelConnection } from './usecases/delete-channel-connection/delete-channel-connection.usecase';
import { GetChannelConnectionCommand } from './usecases/get-channel-connection/get-channel-connection.command';
import { GetChannelConnection } from './usecases/get-channel-connection/get-channel-connection.usecase';
import { ListChannelConnectionsCommand } from './usecases/list-channel-connections/list-channel-connections.command';
import { ListChannelConnections } from './usecases/list-channel-connections/list-channel-connections.usecase';
import { UpdateChannelConnectionCommand } from './usecases/update-channel-connection/update-channel-connection.command';
import { UpdateChannelConnection } from './usecases/update-channel-connection/update-channel-connection.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/channel-connections', version: '1' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Channel Connections')
@SdkGroupName('ChannelConnections')
@RequireAuthentication()
@ApiCommonResponses()
export class ChannelConnectionsController {
  constructor(
    private readonly getChannelConnectionUsecase: GetChannelConnection,
    private readonly createChannelConnectionUsecase: CreateChannelConnection,
    private readonly updateChannelConnectionUsecase: UpdateChannelConnection,
    private readonly deleteChannelConnectionUsecase: DeleteChannelConnection,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly listChannelConnectionsUsecase: ListChannelConnections
  ) {}

  private async checkFeatureEnabled(user: UserSessionData) {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SLACK_TEAMS_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
    });

    if (!isEnabled) {
      throw new NotFoundException('Feature not enabled');
    }
  }

  @Get()
  @ApiOperation({
    summary: 'List all channel connections',
    description: `List all channel connections for a resource.`,
  })
  @ApiResponse(ListChannelConnectionsResponseDto, 200)
  @SdkMethodName('list')
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  @ExternalApiAccessible()
  async listChannelConnections(
    @UserSession() user: UserSessionData,
    @Query() query: ListChannelConnectionsQueryDto
  ): Promise<ListChannelConnectionsResponseDto> {
    await this.checkFeatureEnabled(user);

    const result = await this.listChannelConnectionsUsecase.execute(
      ListChannelConnectionsCommand.create({
        user,
        limit: query.limit || 10,
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection,
        orderBy: query.orderBy || 'createdAt',
        includeCursor: query.includeCursor,
        subscriberId: query.subscriberId,
        contextKeys: query.contextKeys,
        channel: query.channel,
        providerId: query.providerId,
        integrationIdentifier: query.integrationIdentifier,
      })
    );

    return {
      data: result.data.map(mapChannelConnectionEntityToDto),
      next: result.next,
      previous: result.previous,
      totalCount: result.totalCount!,
      totalCountCapped: result.totalCountCapped!,
    };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a channel connection',
    description: `Create a new channel connection for a resource for given integration. Only one channel connection is allowed per resource and integration.`,
  })
  @ApiResponse(GetChannelConnectionResponseDto, 201)
  @SdkMethodName('create')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  async createChannelConnection(
    @UserSession() user: UserSessionData,
    @Body() body: CreateChannelConnectionRequestDto
  ): Promise<GetChannelConnectionResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelConnection = await this.createChannelConnectionUsecase.execute(
      CreateChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        subscriberId: body.subscriberId,
        context: body.context,
        connectionMode: body.connectionMode,
        workspace: body.workspace,
        auth: body.auth,
      })
    );

    return mapChannelConnectionEntityToDto(channelConnection);
  }

  @Get('/:identifier')
  @ApiOperation({
    summary: 'Retrieve a channel connection',
    description: `Retrieve a specific channel connection by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel connection', type: String })
  @ApiResponse(GetChannelConnectionResponseDto, 200)
  @SdkMethodName('retrieve')
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  @ExternalApiAccessible()
  async getChannelConnectionByIdentifier(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetChannelConnectionResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelConnection = await this.getChannelConnectionUsecase.execute(
      GetChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );

    return mapChannelConnectionEntityToDto(channelConnection);
  }

  @Patch('/:identifier')
  @ApiOperation({
    summary: 'Update a channel connection',
    description: `Update an existing channel connection by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel connection', type: String })
  @ApiResponse(GetChannelConnectionResponseDto, 200)
  @SdkMethodName('update')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  async updateChannelConnection(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateChannelConnectionRequestDto
  ): Promise<GetChannelConnectionResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelConnection = await this.updateChannelConnectionUsecase.execute(
      UpdateChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        workspace: body.workspace,
        auth: body.auth,
      })
    );

    return mapChannelConnectionEntityToDto(channelConnection);
  }

  @Delete('/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a channel connection',
    description: `Delete a specific channel connection by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel connection', type: String })
  @SdkMethodName('delete')
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  @ExternalApiAccessible()
  async deleteChannelConnection(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

    await this.deleteChannelConnectionUsecase.execute(
      DeleteChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
