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
import { ApiExcludeController, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeatureFlagsService, RequirePermissions } from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  FeatureFlagsKeysEnum,
  makeResourceKey,
  PermissionsEnum,
  RESOURCE,
  UserSessionData,
} from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { CreateChannelConnectionRequestDto } from '../channel-connections/dtos/create-channel-connection-request.dto';
import { mapChannelConnectionEntityToDto } from '../channel-connections/dtos/dto.mapper';
import { GetChannelConnectionResponseDto } from '../channel-connections/dtos/get-channel-connection-response.dto';
import { GetChannelConnectionsQueryDto } from '../channel-connections/dtos/get-channel-connections-query.dto';
import { UpdateChannelConnectionRequestDto } from '../channel-connections/dtos/update-channel-connection-request.dto';
import { CreateChannelConnectionCommand } from '../channel-connections/usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from '../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { DeleteChannelConnectionCommand } from '../channel-connections/usecases/delete-channel-connection/delete-channel-connection.command';
import { DeleteChannelConnection } from '../channel-connections/usecases/delete-channel-connection/delete-channel-connection.usecase';
import { GetChannelConnectionCommand } from '../channel-connections/usecases/get-channel-connection/get-channel-connection.command';
import { GetChannelConnection } from '../channel-connections/usecases/get-channel-connection/get-channel-connection.usecase';
import { GetChannelConnectionsCommand } from '../channel-connections/usecases/get-channel-connections/get-channel-connections.command';
import { GetChannelConnections } from '../channel-connections/usecases/get-channel-connections/get-channel-connections.usecase';
import { UpdateChannelConnectionCommand } from '../channel-connections/usecases/update-channel-connection/update-channel-connection.command';
import { UpdateChannelConnection } from '../channel-connections/usecases/update-channel-connection/update-channel-connection.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@ApiTags('Channel Connections')
@ApiCommonResponses()
export class ChannelConnectionsController {
  constructor(
    private readonly getChannelConnectionUsecase: GetChannelConnection,
    private readonly createChannelConnectionUsecase: CreateChannelConnection,
    private readonly updateChannelConnectionUsecase: UpdateChannelConnection,
    private readonly deleteChannelConnectionUsecase: DeleteChannelConnection,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly getChannelConnectionsUsecase: GetChannelConnections
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

  @Get('/:subscriberId/channel-connections/:integrationIdentifier')
  @ApiOperation({
    summary: 'Retrieve channel connection for a subscriber for given integration',
    description: `Retrieve a channel connection belonging to a subscriber for given integration.`,
  })
  @ApiResponse(GetChannelConnectionResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelConnection(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ): Promise<GetChannelConnectionResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelConnection = await this.getChannelConnectionUsecase.execute(
      GetChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        integrationIdentifier,
      })
    );

    return mapChannelConnectionEntityToDto(channelConnection);
  }

  @Get('/:subscriberId/channel-connections')
  @ApiOperation({
    summary: 'Retrieve channel connections for a subscriber',
    description: `Retrieve all channel connections for a subscriber.`,
  })
  @ApiResponse(GetChannelConnectionResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelConnections(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetChannelConnectionsQueryDto
  ): Promise<GetChannelConnectionResponseDto[]> {
    await this.checkFeatureEnabled(user);

    const channelConnections = await this.getChannelConnectionsUsecase.execute(
      GetChannelConnectionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        channel: query.channel,
        provider: query.provider,
      })
    );

    return channelConnections.map((connection) => mapChannelConnectionEntityToDto(connection));
  }

  @Post('/:subscriberId/channel-connections')
  @ApiOperation({
    summary: 'Create channel connection for a subscriber for given integration',
    description: `Create a new channel connection for a subscriber for given integration.`,
  })
  @ApiResponse(GetChannelConnectionResponseDto, 201)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async createChannelConnection(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: CreateChannelConnectionRequestDto
  ): Promise<GetChannelConnectionResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelConnection = await this.createChannelConnectionUsecase.execute(
      CreateChannelConnectionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        workspace: body.workspace,
        auth: body.auth,
      })
    );

    return mapChannelConnectionEntityToDto(channelConnection);
  }

  @Patch('channel-connections/:identifier')
  @ApiOperation({
    summary: 'Update channel connection',
    description: `Update an existing channel connection by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel connection', type: String })
  @ApiResponse(GetChannelConnectionResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
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

  @Delete('channel-connections/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete channel connection',
    description: `Delete a specific channel connection by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel connection', type: String })
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
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
