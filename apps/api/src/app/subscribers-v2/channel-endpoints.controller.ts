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
import { CreateChannelEndpointRequestDto } from '../channel-endpoints/dtos/create-channel-endpoint-request.dto';
import { mapChannelEndpointEntityToDto } from '../channel-endpoints/dtos/dto.mapper';
import { GetChannelEndpointResponseDto } from '../channel-endpoints/dtos/get-channel-endpoint-response.dto';
import { GetChannelEndpointsQueryDto } from '../channel-endpoints/dtos/get-channel-endpoints-query.dto';
import { UpdateChannelEndpointRequestDto } from '../channel-endpoints/dtos/update-channel-endpoint-request.dto';
import { CreateChannelEndpointCommand } from '../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { DeleteChannelEndpointCommand } from '../channel-endpoints/usecases/delete-channel-endpoint/delete-channel-endpoint.command';
import { DeleteChannelEndpoint } from '../channel-endpoints/usecases/delete-channel-endpoint/delete-channel-endpoint.usecase';
import { GetChannelEndpointCommand } from '../channel-endpoints/usecases/get-channel-endpoint/get-channel-endpoint.command';
import { GetChannelEndpoint } from '../channel-endpoints/usecases/get-channel-endpoint/get-channel-endpoint.usecase';
import { GetChannelEndpointsCommand } from '../channel-endpoints/usecases/get-channel-endpoints/get-channel-endpoints.command';
import { GetChannelEndpoints } from '../channel-endpoints/usecases/get-channel-endpoints/get-channel-endpoints.usecase';
import { UpdateChannelEndpointCommand } from '../channel-endpoints/usecases/update-channel-endpoint/update-channel-endpoint.command';
import { UpdateChannelEndpoint } from '../channel-endpoints/usecases/update-channel-endpoint/update-channel-endpoint.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@ApiTags('Channel Endpoints')
@ApiCommonResponses()
export class ChannelEndpointsController {
  constructor(
    private readonly getChannelEndpointsUsecase: GetChannelEndpoints,
    private readonly getChannelEndpointUsecase: GetChannelEndpoint,
    private readonly createChannelEndpointUsecase: CreateChannelEndpoint,
    private readonly updateChannelEndpointUsecase: UpdateChannelEndpoint,
    private readonly deleteChannelEndpointUsecase: DeleteChannelEndpoint,
    private readonly featureFlagsService: FeatureFlagsService
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

  @Get('/:subscriberId/channel-endpoints')
  @ApiOperation({
    summary: 'Retrieve channel endpoints',
    description: `Retrieve all channel endpoints based on query filters.`,
  })
  @ApiResponse(GetChannelEndpointResponseDto, 200, true)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelEndpoints(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetChannelEndpointsQueryDto
  ): Promise<GetChannelEndpointResponseDto[]> {
    await this.checkFeatureEnabled(user);

    const channelEndpoints = await this.getChannelEndpointsUsecase.execute(
      GetChannelEndpointsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        channel: query.channel,
        provider: query.provider,
        type: query.type,
      })
    );

    return channelEndpoints.map((endpoint) => mapChannelEndpointEntityToDto(endpoint));
  }

  @Get('/channel-endpoints/:identifier')
  @ApiOperation({
    summary: 'Retrieve channel endpoint by identifier',
    description: `Retrieve a specific channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.getChannelEndpointUsecase.execute(
      GetChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Post('/:subscriberId/channel-endpoints')
  @ApiOperation({
    summary: 'Create channel endpoint',
    description: `Create a new channel endpoint.`,
  })
  @ApiResponse(GetChannelEndpointResponseDto, 201)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async createChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: CreateChannelEndpointRequestDto
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.createChannelEndpointUsecase.execute(
      CreateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        type: body.type,
        endpoint: body.endpoint,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Patch('/channel-endpoints/:identifier')
  @ApiOperation({
    summary: 'Update channel endpoint',
    description: `Update an existing channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @ApiResponse(GetChannelEndpointResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async updateChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateChannelEndpointRequestDto
  ): Promise<GetChannelEndpointResponseDto> {
    await this.checkFeatureEnabled(user);

    const channelEndpoint = await this.updateChannelEndpointUsecase.execute(
      UpdateChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        endpoint: body.endpoint,
      })
    );

    return mapChannelEndpointEntityToDto(channelEndpoint);
  }

  @Delete('/channel-endpoints/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete channel endpoint',
    description: `Delete a specific channel endpoint by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel endpoint', type: String })
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async deleteChannelEndpoint(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

    await this.deleteChannelEndpointUsecase.execute(
      DeleteChannelEndpointCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
