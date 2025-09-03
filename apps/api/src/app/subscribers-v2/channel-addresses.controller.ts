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
import { CreateChannelAddressRequestDto } from '../channel-addresses/dtos/create-channel-address-request.dto';
import { GetChannelAddressResponseDto } from '../channel-addresses/dtos/get-channel-address-response.dto';
import { GetChannelAddressesQueryDto } from '../channel-addresses/dtos/get-channel-addresses-query.dto';
import { UpdateChannelAddressRequestDto } from '../channel-addresses/dtos/update-channel-address-request.dto';
import { CreateChannelAddressCommand } from '../channel-addresses/usecases/create-channel-address/create-channel-address.command';
import { CreateChannelAddress } from '../channel-addresses/usecases/create-channel-address/create-channel-address.usecase';
import { DeleteChannelAddressCommand } from '../channel-addresses/usecases/delete-channel-address/delete-channel-address.command';
import { DeleteChannelAddress } from '../channel-addresses/usecases/delete-channel-address/delete-channel-address.usecase';
import { GetChannelAddressCommand } from '../channel-addresses/usecases/get-channel-address/get-channel-address.command';
import { GetChannelAddress } from '../channel-addresses/usecases/get-channel-address/get-channel-address.usecase';
import { GetChannelAddressesCommand } from '../channel-addresses/usecases/get-channel-addresses/get-channel-addresses.command';
import { GetChannelAddresses } from '../channel-addresses/usecases/get-channel-addresses/get-channel-addresses.usecase';
import { UpdateChannelAddressCommand } from '../channel-addresses/usecases/update-channel-address/update-channel-address.command';
import { UpdateChannelAddress } from '../channel-addresses/usecases/update-channel-address/update-channel-address.usecase';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/subscribers', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@ApiTags('Channel Addresses')
@ApiCommonResponses()
export class ChannelAddressesController {
  constructor(
    private readonly getChannelAddressesUsecase: GetChannelAddresses,
    private readonly getChannelAddressUsecase: GetChannelAddress,
    private readonly createChannelAddressUsecase: CreateChannelAddress,
    private readonly updateChannelAddressUsecase: UpdateChannelAddress,
    private readonly deleteChannelAddressUsecase: DeleteChannelAddress,
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

  @Get('/:subscriberId/channel-addresses')
  @ApiOperation({
    summary: 'Retrieve channel addresses',
    description: `Retrieve all channel addresses based on query filters.`,
  })
  @ApiResponse(GetChannelAddressResponseDto, 200, true)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelAddresses(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query() query: GetChannelAddressesQueryDto
  ): Promise<GetChannelAddressResponseDto[]> {
    await this.checkFeatureEnabled(user);

    return await this.getChannelAddressesUsecase.execute(
      GetChannelAddressesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        channel: query.channel,
        provider: query.provider,
        type: query.type,
      })
    );
  }

  @Get('/channel-addresses/:identifier')
  @ApiOperation({
    summary: 'Retrieve channel address by identifier',
    description: `Retrieve a specific channel address by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel address', type: String })
  @ApiResponse(GetChannelAddressResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_READ)
  @RequireAuthentication()
  async getChannelAddress(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<GetChannelAddressResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.getChannelAddressUsecase.execute(
      GetChannelAddressCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }

  @Post('/:subscriberId/channel-addresses')
  @ApiOperation({
    summary: 'Create channel address',
    description: `Create a new channel address.`,
  })
  @ApiResponse(GetChannelAddressResponseDto, 201)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async createChannelAddress(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Body() body: CreateChannelAddressRequestDto
  ): Promise<GetChannelAddressResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.createChannelAddressUsecase.execute(
      CreateChannelAddressCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier: body.identifier,
        integrationIdentifier: body.integrationIdentifier,
        connectionIdentifier: body.connectionIdentifier,
        resource: makeResourceKey(RESOURCE.SUBSCRIBER, subscriberId),
        type: body.type,
        address: body.address,
      })
    );
  }

  @Patch('/channel-addresses/:identifier')
  @ApiOperation({
    summary: 'Update channel address',
    description: `Update an existing channel address by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel address', type: String })
  @ApiResponse(GetChannelAddressResponseDto, 200)
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async updateChannelAddress(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Body() body: UpdateChannelAddressRequestDto
  ): Promise<GetChannelAddressResponseDto> {
    await this.checkFeatureEnabled(user);

    return await this.updateChannelAddressUsecase.execute(
      UpdateChannelAddressCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
        address: body.address,
      })
    );
  }

  @Delete('/channel-addresses/:identifier')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete channel address',
    description: `Delete a specific channel address by its unique identifier.`,
  })
  @ApiParam({ name: 'identifier', description: 'The unique identifier of the channel address', type: String })
  @RequirePermissions(PermissionsEnum.SUBSCRIBER_WRITE)
  @RequireAuthentication()
  async deleteChannelAddress(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<void> {
    await this.checkFeatureEnabled(user);

    await this.deleteChannelAddressUsecase.execute(
      DeleteChannelAddressCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        identifier,
      })
    );
  }
}
